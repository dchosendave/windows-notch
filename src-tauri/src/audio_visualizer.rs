use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex, OnceLock,
};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioLevels {
    levels: [f32; 5],
}

struct AudioWorker {
    running: Arc<AtomicBool>,
    handle: std::thread::JoinHandle<()>,
}

fn worker() -> &'static Mutex<Option<AudioWorker>> {
    static WORKER: OnceLock<Mutex<Option<AudioWorker>>> = OnceLock::new();
    WORKER.get_or_init(|| Mutex::new(None))
}

#[cfg(windows)]
fn meter() -> Result<windows::Win32::Media::Audio::Endpoints::IAudioMeterInformation, String> {
    use windows::Win32::{
        Media::Audio::{eMultimedia, eRender, IMMDeviceEnumerator, MMDeviceEnumerator},
        System::Com::{CoCreateInstance, CLSCTX_ALL},
    };

    unsafe {
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .map_err(|e| e.to_string())?;
        device.Activate(CLSCTX_ALL, None).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn start_audio_visualizer(app: AppHandle) -> Result<(), String> {
    let mut active = worker()
        .lock()
        .map_err(|_| "Audio visualizer is unavailable")?;
    if active
        .as_ref()
        .is_some_and(|worker| !worker.handle.is_finished())
    {
        return Ok(());
    }
    if let Some(previous) = active.take() {
        let _ = previous.handle.join();
    }

    let running = Arc::new(AtomicBool::new(true));
    let worker_running = running.clone();
    let thread = std::thread::Builder::new()
        .name("hamin-audio-meter".into())
        .spawn(move || run_meter(app, worker_running))
        .map_err(|error| error.to_string());
    let handle = thread?;
    *active = Some(AudioWorker { running, handle });
    Ok(())
}

#[cfg(windows)]
fn run_meter(app: AppHandle, running: Arc<AtomicBool>) {
    let Ok(_apartment) = crate::com::ComApartment::mta() else {
        log::error!("Unable to initialize COM for the audio visualizer");
        return;
    };
    let mut smoothed = 0.0_f32;
    let mut history = [0.0_f32; 9];
    let mut current_meter = meter().ok();
    let mut samples = 0_u16;

    while running.load(Ordering::Relaxed) {
        samples = samples.wrapping_add(1);
        if samples.is_multiple_of(150) {
            // Refresh periodically so changing the Windows default output device does
            // not leave the visualizer attached to a stale endpoint.
            current_meter = meter().ok();
        }
        let sample = current_meter
            .as_ref()
            .and_then(|value| unsafe { value.GetPeakValue().ok() });

        if let Some(value) = sample {
            // A quick attack keeps beats feeling immediate; the slower release prevents jitter.
            let coefficient = if value > smoothed { 0.68 } else { 0.22 };
            smoothed += (value - smoothed) * coefficient;
            history.rotate_right(1);
            history[0] = if smoothed < 0.008 {
                0.0
            } else {
                // Human hearing is logarithmic. Expanding quieter readings makes the
                // visualization useful without requiring a large notch.
                smoothed.clamp(0.0, 1.0).powf(0.55)
            };
            // Space samples apart so the compact bars show a readable recent waveform
            // instead of five near-identical adjacent meter readings.
            let levels = [history[8], history[6], history[4], history[2], history[0]];
            let _ = app.emit("audio-levels", AudioLevels { levels });
        } else {
            current_meter = meter().ok();
        }

        std::thread::sleep(std::time::Duration::from_millis(33));
    }
}

#[cfg(not(windows))]
fn run_meter(_app: AppHandle, _running: Arc<AtomicBool>) {}

#[tauri::command]
pub fn stop_audio_visualizer() -> Result<(), String> {
    let active = worker()
        .lock()
        .map_err(|_| "Audio visualizer is unavailable")?
        .take();
    if let Some(worker) = active {
        worker.running.store(false, Ordering::Relaxed);
        worker
            .handle
            .join()
            .map_err(|_| "Audio visualizer worker panicked")?;
    }
    Ok(())
}

pub fn stop() {
    let active = worker().lock().ok().and_then(|mut value| value.take());
    if let Some(worker) = active {
        worker.running.store(false, Ordering::Relaxed);
        let _ = worker.handle.join();
    }
}
