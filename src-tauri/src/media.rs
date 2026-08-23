use std::{
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use base64::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager as _, State};
use windows::{
    Foundation::TypedEventHandler,
    Media::Control::{
        CurrentSessionChangedEventArgs, GlobalSystemMediaTransportControlsSession as Session,
        GlobalSystemMediaTransportControlsSessionManager as SessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
        MediaPropertiesChangedEventArgs, PlaybackInfoChangedEventArgs, SessionsChangedEventArgs,
        TimelinePropertiesChangedEventArgs,
    },
    Storage::Streams::DataReader,
};

use crate::error::HaminError;

const MEDIA_STATE_EVENT: &str = "media-state";
const MAX_ARTWORK_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Default)]
pub struct MediaService {
    manager: Mutex<Option<SessionManager>>,
    current_session: Mutex<Option<Session>>,
    artwork_cache: Mutex<Option<ArtworkCache>>,
    last_snapshot: Mutex<Option<MediaSnapshot>>,
    active_subscription: Mutex<Option<SessionSubscription>>,
}

struct SessionSubscription {
    session: Session,
    media: i64,
    playback: i64,
    timeline: i64,
}

impl Drop for SessionSubscription {
    fn drop(&mut self) {
        let _ = self.session.RemoveMediaPropertiesChanged(self.media);
        let _ = self.session.RemovePlaybackInfoChanged(self.playback);
        let _ = self.session.RemoveTimelinePropertiesChanged(self.timeline);
    }
}

#[derive(Clone)]
struct ArtworkCache {
    key: String,
    data_url: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSnapshot {
    source_app_id: String,
    title: String,
    artist: String,
    album_title: String,
    artwork_data_url: Option<String>,
    is_playing: bool,
    position_ms: u64,
    duration_ms: u64,
    updated_at_ms: u64,
    can_play: bool,
    can_pause: bool,
    can_go_previous: bool,
    can_go_next: bool,
    can_seek: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSessionSummary {
    source_app_id: String,
    title: String,
    artist: String,
    is_playing: bool,
}

impl MediaSnapshot {
    fn same_content(&self, other: &Self) -> bool {
        self.source_app_id == other.source_app_id
            && self.title == other.title
            && self.artist == other.artist
            && self.album_title == other.album_title
            && self.artwork_data_url == other.artwork_data_url
            && self.is_playing == other.is_playing
            && self.position_ms == other.position_ms
            && self.duration_ms == other.duration_ms
            && self.can_play == other.can_play
            && self.can_pause == other.can_pause
            && self.can_go_previous == other.can_go_previous
            && self.can_go_next == other.can_go_next
            && self.can_seek == other.can_seek
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MediaAction {
    TogglePlayPause,
    Previous,
    Next,
}

pub async fn initialize_media_service(app: AppHandle) -> Result<(), HaminError> {
    let manager = SessionManager::RequestAsync()?.await?;

    // WinRT retains registered delegates. Keep their non-Send local wrappers
    // inside this scope so they cannot cross the await below.
    {
        let app_for_current = app.clone();
        let current_handler =
            TypedEventHandler::<SessionManager, CurrentSessionChangedEventArgs>::new(
                move |sender, _| {
                    if let Some(manager) = sender.as_ref() {
                        schedule_session_activation(app_for_current.clone(), manager.clone());
                    }
                    Ok(())
                },
            );
        manager.CurrentSessionChanged(&current_handler)?;

        let app_for_sessions = app.clone();
        let sessions_handler =
            TypedEventHandler::<SessionManager, SessionsChangedEventArgs>::new(move |sender, _| {
                if let Some(manager) = sender.as_ref() {
                    schedule_session_activation(app_for_sessions.clone(), manager.clone());
                }
                Ok(())
            });
        manager.SessionsChanged(&sessions_handler)?;
    }

    let service = app.state::<MediaService>();
    *service
        .manager
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner()) = Some(manager.clone());

    activate_current_session(&app, &manager).await?;
    log::info!("Windows media session service initialized");
    Ok(())
}

#[tauri::command]
pub async fn get_media_state(
    service: State<'_, MediaService>,
) -> Result<Option<MediaSnapshot>, String> {
    let session = service.current_session();
    match session {
        Some(session) => build_snapshot(&service, &session)
            .await
            .map(Some)
            .map_err(|error| error.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn control_media(app: AppHandle, action: MediaAction) -> Result<bool, String> {
    let service = app.state::<MediaService>();
    let session = service
        .current_session()
        .ok_or_else(|| HaminError::MediaUnavailable.to_string())?;

    let succeeded = match action {
        MediaAction::TogglePlayPause => session.TryTogglePlayPauseAsync(),
        MediaAction::Previous => session.TrySkipPreviousAsync(),
        MediaAction::Next => session.TrySkipNextAsync(),
    }
    .map_err(|error| error.to_string())?
    .await
    .map_err(|error| error.to_string())?;

    schedule_current_snapshot(app);
    Ok(succeeded)
}

#[tauri::command]
pub async fn seek_media(app: AppHandle, position_ms: u64) -> Result<bool, String> {
    let service = app.state::<MediaService>();
    let session = service
        .current_session()
        .ok_or_else(|| HaminError::MediaUnavailable.to_string())?;
    let timeline = session
        .GetTimelineProperties()
        .map_err(|error| error.to_string())?;
    let start_ms = ticks_to_milliseconds(
        timeline
            .StartTime()
            .map_err(|error| error.to_string())?
            .Duration,
    );
    let end_ms = ticks_to_milliseconds(
        timeline
            .EndTime()
            .map_err(|error| error.to_string())?
            .Duration,
    );
    let requested_ms = start_ms.saturating_add(position_ms).min(end_ms);
    let requested_ticks = requested_ms.saturating_mul(10_000).min(i64::MAX as u64) as i64;

    let succeeded = session
        .TryChangePlaybackPositionAsync(requested_ticks)
        .map_err(|error| error.to_string())?
        .await
        .map_err(|error| error.to_string())?;

    schedule_current_snapshot(app);
    Ok(succeeded)
}

#[tauri::command]
pub fn list_media_sessions(
    service: State<'_, MediaService>,
) -> Result<Vec<MediaSessionSummary>, String> {
    let manager = service
        .manager
        .lock()
        .unwrap_or_else(|value| value.into_inner())
        .clone();
    let Some(manager) = manager else {
        return Ok(Vec::new());
    };
    let sessions = manager.GetSessions().map_err(|error| error.to_string())?;
    let mut summaries = Vec::new();
    for index in 0..sessions.Size().map_err(|error| error.to_string())? {
        let session = sessions.GetAt(index).map_err(|error| error.to_string())?;
        let properties = session
            .TryGetMediaPropertiesAsync()
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        let playback = session
            .GetPlaybackInfo()
            .map_err(|error| error.to_string())?;
        summaries.push(MediaSessionSummary {
            source_app_id: session
                .SourceAppUserModelId()
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
            title: properties
                .Title()
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
            artist: properties
                .Artist()
                .map_err(|error| error.to_string())?
                .to_string_lossy(),
            is_playing: playback
                .PlaybackStatus()
                .map_err(|error| error.to_string())?
                == PlaybackStatus::Playing,
        });
    }
    Ok(summaries)
}

#[tauri::command]
pub fn select_media_session(app: AppHandle, source_app_id: String) -> Result<(), String> {
    let service = app.state::<MediaService>();
    let manager = service
        .manager
        .lock()
        .unwrap_or_else(|value| value.into_inner())
        .clone()
        .ok_or_else(|| "Media service is unavailable".to_string())?;
    let sessions = manager.GetSessions().map_err(|error| error.to_string())?;
    for index in 0..sessions.Size().map_err(|error| error.to_string())? {
        let session = sessions.GetAt(index).map_err(|error| error.to_string())?;
        if session
            .SourceAppUserModelId()
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            == source_app_id
        {
            *service
                .current_session
                .lock()
                .unwrap_or_else(|value| value.into_inner()) = Some(session.clone());
            *service
                .artwork_cache
                .lock()
                .unwrap_or_else(|value| value.into_inner()) = None;
            let subscription =
                subscribe_to_session(&app, &session).map_err(|error| error.to_string())?;
            replace_subscription(&service, subscription);
            schedule_current_snapshot(app);
            return Ok(());
        }
    }
    Err("That media session is no longer available".into())
}

impl MediaService {
    fn current_session(&self) -> Option<Session> {
        self.current_session
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clone()
    }
}

fn schedule_session_activation(app: AppHandle, manager: SessionManager) {
    tauri::async_runtime::spawn(async move {
        if let Err(error) = activate_current_session(&app, &manager).await {
            log::warn!("Failed to activate the current media session: {error}");
        }
    });
}

fn schedule_current_snapshot(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        if let Err(error) = emit_current_snapshot(&app).await {
            log::warn!("Failed to publish media state: {error}");
        }
    });
}

async fn activate_current_session(
    app: &AppHandle,
    manager: &SessionManager,
) -> Result<(), HaminError> {
    let session = manager.GetCurrentSession().ok();
    let service = app.state::<MediaService>();

    let is_same_session = {
        let current = service
            .current_session
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        match (current.as_ref(), session.as_ref()) {
            (Some(current), Some(next)) => current == next,
            (None, None) => true,
            _ => false,
        }
    };

    *service
        .current_session
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner()) = session.clone();
    if !is_same_session {
        *service
            .artwork_cache
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner()) = None;
    }

    if let Some(session) = session.filter(|_| !is_same_session) {
        replace_subscription(&service, subscribe_to_session(app, &session)?);
    } else if !is_same_session {
        *service
            .active_subscription
            .lock()
            .unwrap_or_else(|value| value.into_inner()) = None;
    }

    emit_current_snapshot(app).await
}

fn subscribe_to_session(
    app: &AppHandle,
    session: &Session,
) -> Result<SessionSubscription, HaminError> {
    let metadata_app = app.clone();
    let media = session.MediaPropertiesChanged(&TypedEventHandler::<
        Session,
        MediaPropertiesChangedEventArgs,
    >::new(move |_, _| {
        schedule_current_snapshot(metadata_app.clone());
        Ok(())
    }))?;

    let playback_app = app.clone();
    let playback = session.PlaybackInfoChanged(&TypedEventHandler::<
        Session,
        PlaybackInfoChangedEventArgs,
    >::new(move |_, _| {
        schedule_current_snapshot(playback_app.clone());
        Ok(())
    }))?;

    let timeline_app = app.clone();
    let timeline = session.TimelinePropertiesChanged(&TypedEventHandler::<
        Session,
        TimelinePropertiesChangedEventArgs,
    >::new(move |_, _| {
        schedule_current_snapshot(timeline_app.clone());
        Ok(())
    }))?;

    Ok(SessionSubscription {
        session: session.clone(),
        media,
        playback,
        timeline,
    })
}

fn replace_subscription(service: &MediaService, subscription: SessionSubscription) {
    *service
        .active_subscription
        .lock()
        .unwrap_or_else(|value| value.into_inner()) = Some(subscription);
}

async fn emit_current_snapshot(app: &AppHandle) -> Result<(), HaminError> {
    let service = app.state::<MediaService>();
    let snapshot = match service.current_session() {
        Some(session) => Some(build_snapshot(&service, &session).await?),
        None => None,
    };

    let should_emit = {
        let mut previous = service
            .last_snapshot
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if previous
            .as_ref()
            .zip(snapshot.as_ref())
            .is_some_and(|(previous, next)| previous.same_content(next))
            || (previous.is_none() && snapshot.is_none())
        {
            false
        } else {
            *previous = snapshot.clone();
            true
        }
    };

    if should_emit {
        app.emit(MEDIA_STATE_EVENT, snapshot)?;
    }
    Ok(())
}

async fn build_snapshot(
    service: &MediaService,
    session: &Session,
) -> Result<MediaSnapshot, HaminError> {
    let properties = session.TryGetMediaPropertiesAsync()?.await?;
    let playback = session.GetPlaybackInfo()?;
    let controls = playback.Controls()?;
    let timeline = session.GetTimelineProperties()?;

    let source_app_id = session.SourceAppUserModelId()?.to_string_lossy();
    let title = properties.Title()?.to_string_lossy();
    let artist = properties.Artist()?.to_string_lossy();
    let album_title = properties.AlbumTitle()?.to_string_lossy();
    let artwork_key = format!("{source_app_id}\u{1f}{title}\u{1f}{artist}\u{1f}{album_title}");
    let artwork_data_url = read_artwork(service, &properties, artwork_key);

    let position_ms = ticks_to_milliseconds(timeline.Position()?.Duration);
    let start_ms = ticks_to_milliseconds(timeline.StartTime()?.Duration);
    let end_ms = ticks_to_milliseconds(timeline.EndTime()?.Duration);
    let duration_ms = end_ms.saturating_sub(start_ms);

    Ok(MediaSnapshot {
        source_app_id,
        title,
        artist,
        album_title,
        artwork_data_url,
        is_playing: playback.PlaybackStatus()? == PlaybackStatus::Playing,
        position_ms: position_ms.saturating_sub(start_ms),
        duration_ms,
        updated_at_ms: unix_time_milliseconds(),
        can_play: controls.IsPlayEnabled()?,
        can_pause: controls.IsPauseEnabled()?,
        can_go_previous: controls.IsPreviousEnabled()?,
        can_go_next: controls.IsNextEnabled()?,
        can_seek: controls.IsPlaybackPositionEnabled()?,
    })
}

fn read_artwork(
    service: &MediaService,
    properties: &windows::Media::Control::GlobalSystemMediaTransportControlsSessionMediaProperties,
    key: String,
) -> Option<String> {
    if let Some(cached) = service
        .artwork_cache
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .as_ref()
        .filter(|cached| cached.key == key)
    {
        return cached.data_url.clone();
    }

    let data_url = (|| {
        let reference = properties.Thumbnail().ok()?;
        let stream = reference.OpenReadAsync().ok()?.join().ok()?;
        let size = stream.Size().ok()?;
        if size == 0 || size > MAX_ARTWORK_BYTES || size > u64::from(u32::MAX) {
            return None;
        }

        let input = stream.GetInputStreamAt(0).ok()?;
        let reader = DataReader::CreateDataReader(&input).ok()?;
        let loaded = reader.LoadAsync(size as u32).ok()?.join().ok()?;
        let mut bytes = vec![0; loaded as usize];
        reader.ReadBytes(&mut bytes).ok()?;
        let content_type = stream.ContentType().ok()?.to_string_lossy();

        Some(format!(
            "data:{content_type};base64,{}",
            BASE64_STANDARD.encode(bytes)
        ))
    })();

    *service
        .artwork_cache
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner()) = Some(ArtworkCache {
        key,
        data_url: data_url.clone(),
    });

    data_url
}

fn ticks_to_milliseconds(ticks: i64) -> u64 {
    ticks.max(0) as u64 / 10_000
}

fn unix_time_milliseconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(u128::from(u64::MAX)) as u64
}
