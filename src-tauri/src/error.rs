use thiserror::Error;

#[derive(Debug, Error)]
pub enum HaminError {
    #[error("the main notch window is unavailable")]
    WindowUnavailable,

    #[error("no primary monitor is available")]
    PrimaryMonitorUnavailable,

    #[error("invalid notch dimensions: {width}x{height}")]
    InvalidDimensions { width: f64, height: f64 },

    #[error("no controllable media session is active")]
    MediaUnavailable,

    #[error(transparent)]
    Tauri(#[from] tauri::Error),

    #[cfg(windows)]
    #[error(transparent)]
    Windows(#[from] windows::core::Error),
}
