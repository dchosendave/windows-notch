use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

static REPLACEMENT_ENABLED: AtomicBool = AtomicBool::new(false);
static ORIGINAL_STATE: AtomicUsize = AtomicUsize::new(0);
static WATCHDOG_STARTED: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
fn recovery_path() -> Option<std::path::PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|root| {
        std::path::PathBuf::from(root)
            .join("Hamin")
            .join("taskbar-recovery")
    })
}

#[cfg(windows)]
fn write_recovery_state(state: usize) -> Result<(), String> {
    let path = recovery_path().ok_or("LOCALAPPDATA is unavailable")?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    std::fs::write(path, state.to_string()).map_err(|error| error.to_string())
}

#[cfg(windows)]
fn clear_recovery_state() {
    if let Some(path) = recovery_path() {
        let _ = std::fs::remove_file(path);
    }
}

/// Repairs taskbar state left behind by a forced termination or interrupted update.
#[cfg(windows)]
pub fn recover_stale_state() {
    let Some(path) = recovery_path() else { return };
    let Ok(value) = std::fs::read_to_string(&path) else {
        return;
    };
    match value.trim().parse::<usize>() {
        Ok(state) => {
            set_state(state);
            clear_recovery_state();
            log::warn!("Recovered Windows taskbar state from an interrupted Hamin session");
        }
        Err(error) => log::error!("Invalid taskbar recovery state: {error}"),
    }
}

#[cfg(not(windows))]
pub fn recover_stale_state() {}

pub fn start_watchdog() {
    if WATCHDOG_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    std::thread::Builder::new()
        .name("hamin-taskbar-watchdog".into())
        .spawn(|| loop {
            std::thread::sleep(std::time::Duration::from_secs(3));
            if REPLACEMENT_ENABLED.load(Ordering::SeqCst) {
                #[cfg(windows)]
                set_state(
                    ORIGINAL_STATE.load(Ordering::SeqCst)
                        | windows::Win32::UI::Shell::ABS_AUTOHIDE as usize,
                );
            }
        })
        .ok();
}

#[cfg(windows)]
fn set_state(state: usize) {
    use windows::Win32::{
        Foundation::LPARAM,
        UI::Shell::{SHAppBarMessage, ABM_SETSTATE, APPBARDATA},
    };
    let mut data = APPBARDATA {
        cbSize: std::mem::size_of::<APPBARDATA>() as u32,
        lParam: LPARAM(state as isize),
        ..Default::default()
    };
    unsafe { SHAppBarMessage(ABM_SETSTATE, &mut data) };
}

#[cfg(windows)]
#[tauri::command]
pub fn set_taskbar_replacement(enabled: bool) -> Result<(), String> {
    use windows::Win32::UI::Shell::{SHAppBarMessage, ABM_GETSTATE, ABS_AUTOHIDE, APPBARDATA};

    if enabled && !REPLACEMENT_ENABLED.load(Ordering::SeqCst) {
        let mut data = APPBARDATA {
            cbSize: std::mem::size_of::<APPBARDATA>() as u32,
            ..Default::default()
        };
        let original = unsafe { SHAppBarMessage(ABM_GETSTATE, &mut data) };
        write_recovery_state(original)?;
        ORIGINAL_STATE.store(original, Ordering::SeqCst);
        set_state(original | ABS_AUTOHIDE as usize);
        // Publish the enabled state only after recovery data is durable and the
        // Windows state has been changed. Otherwise a failed recovery write can
        // make shutdown restore the uninitialized state value.
        REPLACEMENT_ENABLED.store(true, Ordering::SeqCst);
    } else if !enabled && REPLACEMENT_ENABLED.swap(false, Ordering::SeqCst) {
        set_state(ORIGINAL_STATE.load(Ordering::SeqCst));
        clear_recovery_state();
    }
    Ok(())
}

#[cfg(windows)]
pub fn restore() {
    if REPLACEMENT_ENABLED.swap(false, Ordering::SeqCst) {
        set_state(ORIGINAL_STATE.load(Ordering::SeqCst));
        clear_recovery_state();
    }
}

#[cfg(not(windows))]
pub fn restore() {}
