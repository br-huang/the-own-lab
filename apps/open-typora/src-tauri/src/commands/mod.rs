mod file;
mod folder;
mod markdown;

pub use file::*;
pub use folder::*;
pub use markdown::*;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Open Typora.", name)
}
