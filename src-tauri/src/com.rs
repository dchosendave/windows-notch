#[cfg(windows)]
pub struct ComApartment {
    initialized: bool,
}

#[cfg(windows)]
impl ComApartment {
    pub fn mta() -> Result<Self, String> {
        use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
        let result = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        if result.is_ok() {
            return Ok(Self { initialized: true });
        }
        // The caller thread may already be initialized as an STA by Tauri.
        // COM is still usable there, but we do not own that initialization.
        if result.0 == 0x80010106_u32 as i32 {
            return Ok(Self { initialized: false });
        }
        Err(windows::core::Error::from_hresult(result).to_string())
    }
}

#[cfg(windows)]
impl Drop for ComApartment {
    fn drop(&mut self) {
        if self.initialized {
            unsafe { windows::Win32::System::Com::CoUninitialize() };
        }
    }
}
