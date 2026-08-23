#[cfg(windows)]
#[tauri::command]
pub fn launch_quick_action(action: &str) -> Result<(), String> {
    use windows::{
        core::PCWSTR,
        Win32::{
            Foundation::HWND,
            UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL},
        },
    };

    let (target, arguments) = match action {
        "explorer" => ("explorer.exe", None),
        "search" => ("explorer.exe", Some("search-ms:")),
        "settings" => ("ms-settings:", None),
        "taskManager" => ("taskmgr.exe", None),
        "calculator" => ("calc.exe", None),
        "wifi" => ("ms-settings:network-wifi", None),
        "bluetooth" => ("ms-settings:bluetooth", None),
        "display" => ("ms-settings:display", None),
        "sound" => ("ms-settings:sound", None),
        "microphonePrivacy" => ("ms-settings:privacy-microphone", None),
        "cameraPrivacy" => ("ms-settings:privacy-webcam", None),
        "calendar" => ("outlookcal:", None),
        _ => return Err("Unknown quick action".into()),
    };

    let operation = wide("open");
    let target = wide(target);
    let arguments = arguments.map(wide);
    let arguments_ptr = arguments
        .as_ref()
        .map_or(PCWSTR::null(), |value| PCWSTR(value.as_ptr()));

    let result = unsafe {
        ShellExecuteW(
            Some(HWND::default()),
            PCWSTR(operation.as_ptr()),
            PCWSTR(target.as_ptr()),
            arguments_ptr,
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };

    if result.0 as isize <= 32 {
        return Err(format!(
            "Windows could not launch that action ({})",
            result.0 as isize
        ));
    }
    Ok(())
}

#[cfg(windows)]
#[tauri::command]
pub fn launch_custom_target(target: &str) -> Result<(), String> {
    use std::path::Path;
    use windows::{
        core::PCWSTR,
        Win32::{
            Foundation::HWND,
            UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL},
        },
    };
    let allowed_uri = target.starts_with("https://")
        || target.starts_with("http://")
        || target.starts_with("ms-settings:");
    let allowed_path = Path::new(target).is_absolute() && Path::new(target).exists();
    if !allowed_uri && !allowed_path {
        return Err("Custom actions must be an http(s) URL, Windows Settings URI, or existing absolute path".into());
    }
    let operation = wide("open");
    let target = wide(target);
    let result = unsafe {
        ShellExecuteW(
            Some(HWND::default()),
            PCWSTR(operation.as_ptr()),
            PCWSTR(target.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };
    if result.0 as isize <= 32 {
        return Err("Windows could not open that custom action".into());
    }
    Ok(())
}

#[cfg(windows)]
#[tauri::command]
pub fn reveal_file(path: &str) -> Result<(), String> {
    use std::path::Path;
    use windows::{
        core::PCWSTR,
        Win32::{
            Foundation::HWND,
            UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL},
        },
    };
    if !Path::new(path).is_absolute() {
        return Err("File shelf path is invalid".into());
    }
    let operation = wide("open");
    let explorer = wide("explorer.exe");
    let arguments = wide(&format!("/select,\"{path}\""));
    let result = unsafe {
        ShellExecuteW(
            Some(HWND::default()),
            PCWSTR(operation.as_ptr()),
            PCWSTR(explorer.as_ptr()),
            PCWSTR(arguments.as_ptr()),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };
    if result.0 as isize <= 32 {
        return Err("Windows could not reveal that file".into());
    }
    Ok(())
}

#[cfg(windows)]
fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}
