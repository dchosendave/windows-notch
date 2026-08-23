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
fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}
