use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::SystemTime;
use tauri::Manager;
use walkdir::WalkDir;
#[cfg(target_os = "windows")]
use window_vibrancy::apply_mica;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageEntry {
    name: String,
    path: String,
    ext: String,
    size: u64,
    modified_ms: u128,
}

fn is_image_ext(ext: &str) -> bool {
    matches!(
        ext,
        "jpg"
            | "jpeg"
            | "png"
            | "gif"
            | "bmp"
            | "webp"
            | "tiff"
            | "tif"
            | "heic"
            | "heif"
            | "raw"
            | "cr2"
            | "nef"
            | "arw"
            | "dng"
    )
}

fn system_time_to_ms(time: SystemTime) -> u128 {
    time.duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

#[tauri::command]
fn scan_images(dir: String, limit: Option<usize>) -> Result<Vec<ImageEntry>, String> {
    let path = Path::new(&dir);
    if !path.exists() {
        return Err("目录不存在".to_string());
    }
    if !path.is_dir() {
        return Err("目标路径不是文件夹".to_string());
    }

    let mut items = Vec::new();

    for entry in WalkDir::new(path).follow_links(false) {
        let entry = match entry {
            Ok(v) => v,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let p = entry.path();
        let ext = p
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_lowercase();

        if !is_image_ext(&ext) {
            continue;
        }

        let md = match fs::metadata(p) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let modified_ms = md
            .modified()
            .map(system_time_to_ms)
            .unwrap_or_default();

        items.push(ImageEntry {
            name: p
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or_default()
                .to_string(),
            path: p.to_string_lossy().to_string(),
            ext: ext.to_uppercase(),
            size: md.len(),
            modified_ms,
        });

        if let Some(max) = limit {
            if items.len() >= max {
                break;
            }
        }
    }

    items.sort_by(|a, b| b.modified_ms.cmp(&a.modified_ms));
    Ok(items)
}

#[tauri::command]
fn apply_mica_to_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let window = app
            .get_webview_window(&label)
            .ok_or_else(|| format!("窗口不存在: {label}"))?;
        apply_mica(&window, Some(false)).map_err(|err| err.to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, label);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = apply_mica(&window, Some(false));
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![scan_images, apply_mica_to_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
