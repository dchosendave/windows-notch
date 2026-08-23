mod audio;
mod audio_visualizer;
mod com;
mod diagnostics;
mod error;
mod media;
mod notch_window;
mod power;
mod reliability;
mod taskbar;
mod tasks;

use tauri::Manager;

use notch_window::{configure_notch_window, set_notch_size};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if !reliability::claim_single_instance() {
        return;
    }
    // Only the primary process may repair stale state. A secondary launch must
    // never restore the taskbar while the running instance is using replacement mode.
    taskbar::recover_stale_state();

    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            app.manage(media::MediaService::default());

            let window = app
                .get_webview_window("main")
                .ok_or(error::HaminError::WindowUnavailable)?;

            configure_notch_window(&window)?;
            window.show()?;
            #[cfg(windows)]
            notch_window::apply_windows_tool_window_style(&window)?;
            power::initialize_power_service(app.handle())?;
            taskbar::start_watchdog();

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = media::initialize_media_service(app_handle).await {
                    log::error!("Unable to initialize Windows media controls: {error}");
                }
            });

            log::info!("Hamin notch window initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_notch_size,
            notch_window::animate_notch_size,
            notch_window::list_monitors,
            notch_window::set_notch_placement,
            media::get_media_state,
            media::control_media,
            media::seek_media,
            media::list_media_sessions,
            media::select_media_session,
            power::get_power_state,
            tasks::launch_quick_action,
            audio::get_audio_state,
            audio::set_master_volume,
            audio::toggle_master_mute,
            audio_visualizer::start_audio_visualizer,
            audio_visualizer::stop_audio_visualizer,
            diagnostics::get_process_metrics,
            taskbar::set_taskbar_replacement
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    let previous_panic_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        taskbar::restore();
        previous_panic_hook(info);
    }));

    app.run(|_, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) {
            audio_visualizer::stop();
            taskbar::restore();
        }
    });
}
