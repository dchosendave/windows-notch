#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForegroundContext {
    title: String,
    process_name: String,
    process_id: u32,
    category: &'static str,
}

#[cfg(windows)]
#[tauri::command]
pub fn get_foreground_context() -> Result<ForegroundContext, String> {
    use windows::Win32::{
        Foundation::CloseHandle,
        System::Threading::{
            GetCurrentProcessId, OpenProcess, QueryFullProcessImageNameW,
            PROCESS_QUERY_LIMITED_INFORMATION,
        },
        UI::WindowsAndMessaging::{
            GetForegroundWindow, GetWindow, GetWindowTextLengthW, GetWindowTextW,
            GetWindowThreadProcessId, IsWindowVisible, GW_HWNDNEXT,
        },
    };

    let mut window = unsafe { GetForegroundWindow() };
    if window.0.is_null() {
        return Err("Windows did not report a foreground application".into());
    }
    let own_process = unsafe { GetCurrentProcessId() };
    for _ in 0..32 {
        let mut candidate_process = 0u32;
        unsafe { GetWindowThreadProcessId(window, Some(&mut candidate_process)) };
        if candidate_process != own_process
            && unsafe { IsWindowVisible(window) }.as_bool()
            && unsafe { GetWindowTextLengthW(window) } > 0
        {
            break;
        }
        window = unsafe { GetWindow(window, GW_HWNDNEXT) }
            .map_err(|_| "Windows could not inspect the application behind Hamin")?;
        if window.0.is_null() {
            return Err("No application is visible behind Hamin".into());
        }
    }
    let length = unsafe { GetWindowTextLengthW(window) };
    let mut title_buffer = vec![0u16; (length.max(0) + 1) as usize];
    let copied = unsafe { GetWindowTextW(window, &mut title_buffer) };
    let title = String::from_utf16_lossy(&title_buffer[..copied.max(0) as usize]);

    let mut process_id = 0u32;
    unsafe { GetWindowThreadProcessId(window, Some(&mut process_id)) };
    let process = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) }
        .map_err(|_| "Windows denied access to foreground application details")?;
    let mut path_buffer = vec![0u16; 1024];
    let mut path_length = path_buffer.len() as u32;
    let path_result = unsafe {
        QueryFullProcessImageNameW(
            process,
            Default::default(),
            windows::core::PWSTR(path_buffer.as_mut_ptr()),
            &mut path_length,
        )
    };
    unsafe {
        let _ = CloseHandle(process);
    }
    path_result.map_err(|_| "Windows could not read the foreground application name")?;
    let path = String::from_utf16_lossy(&path_buffer[..path_length as usize]);
    let process_name = path
        .rsplit(['\\', '/'])
        .next()
        .unwrap_or(&path)
        .trim_end_matches(".exe")
        .to_string();
    let normalized = process_name.to_ascii_lowercase();
    let category = if ["code", "devenv", "idea64", "webstorm64"].contains(&normalized.as_str()) {
        "development"
    } else if ["chrome", "msedge", "firefox", "brave"].contains(&normalized.as_str()) {
        "browser"
    } else if ["teams", "zoom", "discord", "slack"].contains(&normalized.as_str()) {
        "meeting"
    } else if ["spotify", "vlc", "wmplayer"].contains(&normalized.as_str()) {
        "media"
    } else if ["explorer"].contains(&normalized.as_str()) {
        "files"
    } else {
        "application"
    };
    Ok(ForegroundContext {
        title,
        process_name,
        process_id,
        category,
    })
}
