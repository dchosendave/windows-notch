#[cfg(windows)]
pub fn claim_single_instance() -> bool {
    use std::sync::OnceLock;
    use windows::{
        core::w,
        Win32::{
            Foundation::{GetLastError, ERROR_ALREADY_EXISTS, HANDLE},
            System::Threading::CreateMutexW,
        },
    };

    static INSTANCE_MUTEX: OnceLock<usize> = OnceLock::new();
    let handle: HANDLE = match unsafe {
        CreateMutexW(None, true, w!("Local\\HaminWindows11Notch.SingleInstance"))
    } {
        Ok(handle) => handle,
        Err(error) => {
            eprintln!("Unable to create Hamin instance mutex: {error}");
            return true;
        }
    };
    if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS {
        activate_existing_instance();
        return false;
    }
    let _ = INSTANCE_MUTEX.set(handle.0 as usize);
    true
}

#[cfg(windows)]
fn activate_existing_instance() {
    use windows::Win32::UI::WindowsAndMessaging::{
        FindWindowW, SetForegroundWindow, ShowWindow, SW_SHOW,
    };
    if let Ok(window) = unsafe { FindWindowW(None, windows::core::w!("Hamin")) } {
        if !window.is_invalid() {
            unsafe {
                let _ = ShowWindow(window, SW_SHOW);
                let _ = SetForegroundWindow(window);
            }
        }
    }
}

#[cfg(not(windows))]
pub fn claim_single_instance() -> bool {
    true
}
