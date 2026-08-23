use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioState {
    volume: u8,
    muted: bool,
    device_name: String,
    device_count: u32,
}

#[cfg(windows)]
fn endpoint_volume() -> Result<windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume, String>
{
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

#[cfg(windows)]
fn device_summary() -> Result<(String, u32), String> {
    use windows::Win32::{
        Devices::FunctionDiscovery::PKEY_Device_FriendlyName,
        Media::Audio::{
            eMultimedia, eRender, IMMDeviceEnumerator, MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
        },
        System::Com::{
            CoCreateInstance, StructuredStorage::PropVariantClear, CLSCTX_ALL, STGM_READ,
        },
    };
    unsafe {
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|error| error.to_string())?;
        let collection = enumerator
            .EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)
            .map_err(|error| error.to_string())?;
        let count = collection.GetCount().map_err(|error| error.to_string())?;
        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .map_err(|error| error.to_string())?;
        let store = device
            .OpenPropertyStore(STGM_READ)
            .map_err(|error| error.to_string())?;
        let mut value = store
            .GetValue(&PKEY_Device_FriendlyName)
            .map_err(|error| error.to_string())?;
        let inner = &*value.Anonymous.Anonymous;
        let name = inner
            .Anonymous
            .pwszVal
            .to_string()
            .unwrap_or_else(|_| "Default audio device".into());
        let _ = PropVariantClear(&mut value);
        Ok((name, count))
    }
}

#[cfg(windows)]
#[tauri::command]
pub fn get_audio_state() -> Result<AudioState, String> {
    let _apartment = crate::com::ComApartment::mta()?;
    read_audio_state()
}

#[cfg(windows)]
fn read_audio_state() -> Result<AudioState, String> {
    let endpoint = endpoint_volume()?;
    let (device_name, device_count) =
        device_summary().unwrap_or_else(|_| ("Default audio device".into(), 1));
    unsafe {
        let volume = endpoint
            .GetMasterVolumeLevelScalar()
            .map_err(|e| e.to_string())?;
        let muted = endpoint.GetMute().map_err(|e| e.to_string())?.as_bool();
        Ok(AudioState {
            volume: (volume.clamp(0.0, 1.0) * 100.0).round() as u8,
            muted,
            device_name,
            device_count,
        })
    }
}

#[cfg(windows)]
#[tauri::command]
pub fn set_master_volume(volume: u8) -> Result<AudioState, String> {
    let _apartment = crate::com::ComApartment::mta()?;
    let endpoint = endpoint_volume()?;
    unsafe {
        endpoint
            .SetMasterVolumeLevelScalar(f32::from(volume.min(100)) / 100.0, std::ptr::null())
            .map_err(|e| e.to_string())?;
    }
    read_audio_state()
}

#[cfg(windows)]
#[tauri::command]
pub fn toggle_master_mute() -> Result<AudioState, String> {
    let _apartment = crate::com::ComApartment::mta()?;
    let endpoint = endpoint_volume()?;
    unsafe {
        let muted = endpoint.GetMute().map_err(|e| e.to_string())?.as_bool();
        endpoint
            .SetMute(!muted, std::ptr::null())
            .map_err(|e| e.to_string())?;
    }
    read_audio_state()
}
