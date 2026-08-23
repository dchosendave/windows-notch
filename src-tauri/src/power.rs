use serde::Serialize;
use tauri::{AppHandle, Emitter};
use windows::{
    core::IInspectable,
    Foundation::EventHandler,
    System::Power::{BatteryStatus, PowerManager, PowerSupplyStatus},
};

use crate::error::HaminError;

const POWER_STATE_EVENT: &str = "power-state";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerSnapshot {
    percent: u8,
    charging: bool,
    plugged_in: bool,
    low: bool,
}

pub fn initialize_power_service(app: &AppHandle) -> Result<(), HaminError> {
    let battery_handler = power_handler(app);
    PowerManager::BatteryStatusChanged(&battery_handler)?;

    let supply_handler = power_handler(app);
    PowerManager::PowerSupplyStatusChanged(&supply_handler)?;

    let percent_handler = power_handler(app);
    PowerManager::RemainingChargePercentChanged(&percent_handler)?;

    emit_power_state(app)?;
    log::info!("Windows power service initialized");
    Ok(())
}

#[tauri::command]
pub fn get_power_state() -> Result<Option<PowerSnapshot>, String> {
    read_power_state().map_err(|error| error.to_string())
}

fn power_handler(app: &AppHandle) -> EventHandler<IInspectable> {
    let event_app = app.clone();
    EventHandler::<IInspectable>::new(move |_, _| {
        if let Err(error) = emit_power_state(&event_app) {
            log::warn!("Failed to publish power state: {error}");
        }
        Ok(())
    })
}

fn emit_power_state(app: &AppHandle) -> Result<(), HaminError> {
    app.emit(POWER_STATE_EVENT, read_power_state()?)?;
    Ok(())
}

fn read_power_state() -> Result<Option<PowerSnapshot>, HaminError> {
    let battery_status = PowerManager::BatteryStatus()?;
    if battery_status == BatteryStatus::NotPresent {
        return Ok(None);
    }

    let percent = PowerManager::RemainingChargePercent()?.clamp(0, 100) as u8;
    let charging = battery_status == BatteryStatus::Charging;
    let plugged_in = PowerManager::PowerSupplyStatus()? == PowerSupplyStatus::Adequate;

    Ok(Some(PowerSnapshot {
        percent,
        charging,
        plugged_in,
        low: percent <= 20 && !charging,
    }))
}
