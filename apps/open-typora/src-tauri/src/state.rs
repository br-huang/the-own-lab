use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub current_folder: Mutex<Option<String>>,
}
