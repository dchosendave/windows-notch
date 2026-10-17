use base64::Engine;
use std::{fs::File, io::Read, path::Path};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePreview {
    size: u64,
    kind: &'static str,
    content: Option<String>,
}

fn preview(path: &Path) -> Result<FilePreview, String> {
    if !path.is_absolute() {
        return Err("Choose an absolute file path".into());
    }
    let metadata = path
        .metadata()
        .map_err(|_| "This file is no longer available")?;
    let mut result = FilePreview {
        size: metadata.len(),
        kind: if metadata.is_dir() { "folder" } else { "file" },
        content: None,
    };
    if !metadata.is_file() {
        return Ok(result);
    }
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let mime = match extension.as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        _ => None,
    };
    let text = matches!(
        extension.as_str(),
        "txt"
            | "md"
            | "json"
            | "csv"
            | "log"
            | "rs"
            | "ts"
            | "tsx"
            | "js"
            | "jsx"
            | "css"
            | "html"
            | "xml"
            | "yaml"
            | "yml"
            | "toml"
            | "py"
    );
    // ponytail: bounded whole-file previews; add streaming if large-file previews are needed.
    let limit = if mime.is_some() {
        5 * 1024 * 1024
    } else {
        64 * 1024
    };
    if (mime.is_none() && !text) || metadata.len() > limit {
        return Ok(result);
    }
    let mut bytes = Vec::new();
    File::open(path)
        .map_err(|_| "Could not open this file")?
        .take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "Could not read this file")?;
    if bytes.len() as u64 > limit {
        return Ok(result);
    }
    if let Some(mime) = mime {
        result.kind = "image";
        result.content = Some(format!(
            "data:{mime};base64,{}",
            base64::engine::general_purpose::STANDARD.encode(bytes)
        ));
    } else if let Ok(content) = String::from_utf8(bytes) {
        result.kind = "text";
        result.content = Some(content);
    }
    Ok(result)
}

#[tauri::command]
pub async fn preview_shelf_file(path: String) -> Result<FilePreview, String> {
    tauri::async_runtime::spawn_blocking(move || preview(Path::new(&path)))
        .await
        .map_err(|_| "File preview could not finish".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn previews_only_supported_bounded_files() {
        let directory =
            std::env::temp_dir().join(format!("hamin-preview-test-{}", std::process::id()));
        std::fs::create_dir_all(&directory).unwrap();
        let path = directory.join("sample.txt");
        std::fs::write(&path, "<script>plain text</script>").unwrap();
        let result = preview(&path).unwrap();
        assert_eq!(result.kind, "text");
        assert_eq!(
            result.content.as_deref(),
            Some("<script>plain text</script>")
        );
        std::fs::write(&path, vec![b'a'; 65_536]).unwrap();
        assert_eq!(preview(&path).unwrap().content.unwrap().len(), 65_536);
        std::fs::write(&path, vec![b'a'; 65_537]).unwrap();
        assert!(preview(&path).unwrap().content.is_none());
        std::fs::write(&path, [0xff]).unwrap();
        assert!(preview(&path).unwrap().content.is_none());
        assert_eq!(preview(&directory).unwrap().kind, "folder");
        assert!(preview(Path::new("relative.txt")).is_err());
        assert!(preview(&directory.join("missing.txt")).is_err());
        let image = directory.join("sample.png");
        std::fs::write(&image, [137, 80, 78, 71]).unwrap();
        assert_eq!(
            preview(&image).unwrap().content.as_deref(),
            Some("data:image/png;base64,iVBORw==")
        );
        File::options()
            .write(true)
            .open(&image)
            .unwrap()
            .set_len(5 * 1024 * 1024)
            .unwrap();
        assert_eq!(preview(&image).unwrap().kind, "image");
        File::options()
            .write(true)
            .open(&image)
            .unwrap()
            .set_len(5 * 1024 * 1024 + 1)
            .unwrap();
        assert!(preview(&image).unwrap().content.is_none());
        let unsupported = directory.join("sample.bin");
        std::fs::write(&unsupported, "plain text").unwrap();
        assert!(preview(&unsupported).unwrap().content.is_none());
        std::fs::remove_file(unsupported).unwrap();
        std::fs::remove_file(path).unwrap();
        std::fs::remove_file(image).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }
}
