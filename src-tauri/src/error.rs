use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("erro de banco de dados: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("registro não encontrado")]
    NotFound,
    #[error("erro de I/O: {0}")]
    Io(#[from] std::io::Error),
    #[error("erro de arquivo zip: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("{0}")]
    Validation(String),
}

// Tauri commands return their error type serialized to the frontend as a string.
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
