use std::sync::OnceLock;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessMetrics {
    memory_mb: f64,
    uptime_seconds: u64,
}

fn started() -> &'static std::time::Instant {
    static STARTED: OnceLock<std::time::Instant> = OnceLock::new();
    STARTED.get_or_init(std::time::Instant::now)
}

#[cfg(windows)]
#[tauri::command]
pub fn get_process_metrics() -> Result<ProcessMetrics, String> {
    use windows::Win32::System::{
        ProcessStatus::{K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS},
        Threading::GetCurrentProcess,
    };
    let mut counters = PROCESS_MEMORY_COUNTERS::default();
    let success = unsafe {
        K32GetProcessMemoryInfo(
            GetCurrentProcess(),
            &mut counters,
            std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
        )
    };
    if !success.as_bool() {
        return Err("Windows could not read Hamin's memory usage".into());
    }
    Ok(ProcessMetrics {
        memory_mb: counters.WorkingSetSize as f64 / 1_048_576.0,
        uptime_seconds: started().elapsed().as_secs(),
    })
}
