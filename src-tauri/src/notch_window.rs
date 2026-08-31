use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex, OnceLock,
};
use tauri::{LogicalSize, PhysicalPosition, WebviewWindow, WindowEvent};

use crate::error::HaminError;

const COLLAPSED_WIDTH: f64 = 164.0;
const COLLAPSED_HEIGHT: f64 = 36.0;
const MIN_WIDTH: f64 = 138.0;
const MAX_WIDTH: f64 = 520.0;
const MIN_HEIGHT: f64 = 32.0;
const MAX_HEIGHT: f64 = 360.0;

fn valid_dimensions(width: f64, height: f64) -> bool {
    width.is_finite()
        && height.is_finite()
        && (MIN_WIDTH..=MAX_WIDTH).contains(&width)
        && (MIN_HEIGHT..=MAX_HEIGHT).contains(&height)
}
static RESIZE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Copy)]
struct Placement {
    monitor: usize,
    horizontal_offset: i32,
    top_offset: i32,
    visual_offset: f64,
}

impl Default for Placement {
    fn default() -> Self {
        Self {
            monitor: 0,
            horizontal_offset: 0,
            top_offset: 0,
            visual_offset: 10.0,
        }
    }
}

fn placement() -> &'static Mutex<Placement> {
    static PLACEMENT: OnceLock<Mutex<Placement>> = OnceLock::new();
    PLACEMENT.get_or_init(|| Mutex::new(Placement::default()))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorSummary {
    index: usize,
    name: String,
    width: u32,
    height: u32,
    primary: bool,
}

pub fn configure_notch_window(window: &WebviewWindow) -> Result<(), HaminError> {
    window.set_skip_taskbar(true)?;
    window.set_size(LogicalSize::new(COLLAPSED_WIDTH, COLLAPSED_HEIGHT))?;
    center_at_top(window)?;

    #[cfg(windows)]
    apply_windows_tool_window_style(window)?;

    let window_for_dpi = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::ScaleFactorChanged { .. }) {
            if let Err(error) = center_at_top(&window_for_dpi) {
                log::warn!("Failed to recenter the notch after a DPI change: {error}");
            }
        }
        #[cfg(windows)]
        if matches!(
            event,
            WindowEvent::Focused(true) | WindowEvent::ScaleFactorChanged { .. }
        ) {
            if let Err(error) = apply_windows_tool_window_style(&window_for_dpi) {
                log::warn!("Failed to restore Alt+Tab exclusion: {error}");
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn set_notch_size(window: WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    resize_and_center(&window, width, height).map_err(|error| {
        log::warn!("Failed to resize the notch: {error}");
        error.to_string()
    })
}

#[tauri::command]
pub async fn animate_notch_size(
    window: WebviewWindow,
    width: f64,
    height: f64,
    duration_ms: u64,
    floating_offset: f64,
    motion_style: String,
) -> Result<(), String> {
    if !valid_dimensions(width, height) {
        return Err(HaminError::InvalidDimensions { width, height }.to_string());
    }
    let sequence = RESIZE_SEQUENCE.fetch_add(1, Ordering::SeqCst) + 1;
    tauri::async_runtime::spawn_blocking(move || {
        let scale = window.scale_factor().map_err(|error| error.to_string())?;
        let start = window
            .outer_size()
            .map_err(|error| error.to_string())?
            .to_logical::<f64>(scale);
        let start_offset = placement()
            .lock()
            .map(|value| value.visual_offset)
            .unwrap_or(10.0);
        let started = std::time::Instant::now();
        let duration = std::time::Duration::from_millis(duration_ms.max(1));
        loop {
            if RESIZE_SEQUENCE.load(Ordering::SeqCst) != sequence {
                return Ok(());
            }
            let progress = (started.elapsed().as_secs_f64() / duration.as_secs_f64()).min(1.0);
            // Keep this curve in sync with the frontend motion configuration. The
            // responsive curve has a spring-like fast attack without overshooting
            // the desktop window bounds; smooth is deliberately more relaxed.
            let eased = match motion_style.as_str() {
                "smooth" => 1.0 - (1.0 - progress).powi(4),
                "instant" => 1.0,
                _ => 1.0 - (1.0 - progress).powi(3),
            };
            let next_width = start.width + (width - start.width) * eased;
            let next_height = start.height + (height - start.height) * eased;
            if let Ok(mut preference) = placement().lock() {
                preference.visual_offset = start_offset + (floating_offset - start_offset) * eased;
            }
            resize_and_center(&window, next_width, next_height)
                .map_err(|error| error.to_string())?;
            if progress >= 1.0 {
                break;
            }
            // A 5 ms cadence can feed displays up to 180 Hz without an unrestricted
            // busy loop. Windows may coalesce frames when the compositor is busy.
            let cadence_ms = if motion_style == "responsive" { 5 } else { 8 };
            std::thread::sleep(std::time::Duration::from_millis(cadence_ms));
        }
        if let Ok(mut preference) = placement().lock() {
            preference.visual_offset = floating_offset;
        }
        resize_and_center(&window, width, height).map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn list_monitors(window: WebviewWindow) -> Result<Vec<MonitorSummary>, String> {
    let primary = window
        .primary_monitor()
        .map_err(|error| error.to_string())?;
    let monitors = window
        .available_monitors()
        .map_err(|error| error.to_string())?;
    Ok(monitors
        .into_iter()
        .enumerate()
        .map(|(index, monitor)| {
            let size = monitor.size();
            let is_primary = primary
                .as_ref()
                .is_some_and(|value| value.position() == monitor.position());
            MonitorSummary {
                index,
                name: monitor
                    .name()
                    .cloned()
                    .unwrap_or_else(|| format!("Display {}", index + 1)),
                width: size.width,
                height: size.height,
                primary: is_primary,
            }
        })
        .collect())
}

#[tauri::command]
pub fn set_notch_placement(
    window: WebviewWindow,
    monitor: usize,
    horizontal_offset: i32,
    top_offset: i32,
) -> Result<(), String> {
    if !(-1_000..=1_000).contains(&horizontal_offset) || !(0..=200).contains(&top_offset) {
        return Err("Notch placement is outside the supported range".into());
    }
    let mut preference = placement()
        .lock()
        .map_err(|_| "Placement state is unavailable")?;
    preference.monitor = monitor;
    preference.horizontal_offset = horizontal_offset;
    preference.top_offset = top_offset;
    drop(preference);
    center_at_top(&window).map_err(|error| error.to_string())
}

#[cfg(windows)]
#[tauri::command]
pub fn follow_foreground_monitor(window: WebviewWindow) -> Result<(), String> {
    use windows::Win32::{
        Graphics::Gdi::{MonitorFromWindow, MONITOR_DEFAULTTONEAREST},
        UI::WindowsAndMessaging::GetForegroundWindow,
    };

    let foreground = unsafe { GetForegroundWindow() };
    if foreground.0.is_null() {
        return Ok(());
    }
    let target = unsafe { MonitorFromWindow(foreground, MONITOR_DEFAULTTONEAREST) };
    let monitors = window
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let Some(index) = monitors.iter().position(|monitor| {
        let position = monitor.position();
        let size = monitor.size();
        let center_x = position.x + (size.width / 2) as i32;
        let center_y = position.y + (size.height / 2) as i32;
        let probe = windows::Win32::Foundation::POINT {
            x: center_x,
            y: center_y,
        };
        (unsafe {
            windows::Win32::Graphics::Gdi::MonitorFromPoint(probe, MONITOR_DEFAULTTONEAREST)
        }) == target
    }) else {
        return Ok(());
    };

    let changed = {
        let mut preference = placement()
            .lock()
            .map_err(|_| "Placement state is unavailable")?;
        if preference.monitor == index {
            false
        } else {
            preference.monitor = index;
            true
        }
    };
    if changed {
        center_at_top(&window).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn resize_and_center(window: &WebviewWindow, width: f64, height: f64) -> Result<(), HaminError> {
    if !valid_dimensions(width, height) {
        return Err(HaminError::InvalidDimensions { width, height });
    }

    window.set_size(LogicalSize::new(width, height))?;
    center_at_top(window)
}

fn center_at_top(window: &WebviewWindow) -> Result<(), HaminError> {
    let preference = placement().lock().map(|value| *value).unwrap_or_default();
    let monitors = window.available_monitors()?;
    let monitor = monitors
        .get(preference.monitor)
        .cloned()
        .or(window.primary_monitor()?)
        .ok_or(HaminError::PrimaryMonitorUnavailable)?;
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let window_size = window.outer_size()?;

    let scale = monitor.scale_factor();
    let x = monitor_position.x
        + ((i64::from(monitor_size.width) - i64::from(window_size.width)) / 2) as i32
        + (f64::from(preference.horizontal_offset) * scale).round() as i32;
    let y = monitor_position.y
        + ((f64::from(preference.top_offset) + preference.visual_offset) * scale).round() as i32;

    window.set_position(PhysicalPosition::new(x, y))?;
    Ok(())
}

#[cfg(windows)]
pub(crate) fn apply_windows_tool_window_style(window: &WebviewWindow) -> Result<(), HaminError> {
    use windows::Win32::{
        Foundation::HWND,
        UI::WindowsAndMessaging::{
            GetShellWindow, GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWLP_HWNDPARENT,
            GWL_EXSTYLE, SWP_FRAMECHANGED, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_EX_APPWINDOW,
            WS_EX_TOOLWINDOW,
        },
    };

    let tauri_hwnd = window.hwnd()?;
    let hwnd = HWND(tauri_hwnd.0);

    // SAFETY: `hwnd` belongs to the live Tauri window and all calls only update
    // that window's documented extended style flags.
    unsafe {
        let current_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        let tool_window_style = (current_style | WS_EX_TOOLWINDOW.0) & !WS_EX_APPWINDOW.0;

        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, tool_window_style as isize);

        // An owned top-level tool window is omitted from the Windows Alt+Tab list.
        // The shell window is stable for Explorer's lifetime and does not interfere
        // with Hamin receiving focus when its controls are used.
        let shell = GetShellWindow();
        if !shell.is_invalid() {
            SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, shell.0 as isize);
        }
        SetWindowPos(
            hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER,
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_supported_notch_dimensions() {
        assert!(valid_dimensions(MIN_WIDTH, MIN_HEIGHT));
        assert!(valid_dimensions(MAX_WIDTH, MAX_HEIGHT));
    }

    #[test]
    fn rejects_invalid_or_non_finite_dimensions() {
        assert!(!valid_dimensions(MIN_WIDTH - 1.0, MIN_HEIGHT));
        assert!(!valid_dimensions(MAX_WIDTH + 1.0, MAX_HEIGHT));
        assert!(!valid_dimensions(f64::NAN, MIN_HEIGHT));
        assert!(!valid_dimensions(MIN_WIDTH, f64::INFINITY));
    }
}
