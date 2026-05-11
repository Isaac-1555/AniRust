use log::{error, info};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::{path::BaseDirectory, AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub index: i32,
    pub title: String,
    pub source_title: String,
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResponse {
    pub status: String,
    pub query: String,
    pub results: Vec<SearchResult>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayResult {
    pub status: String,
    pub url: Option<String>,
    pub error: Option<String>,
}

fn get_ani_cli_path(app: &AppHandle) -> (PathBuf, bool) {
    let mut candidates = Vec::new();

    if let Ok(path) = app.path().resolve("resources/ani-cli", BaseDirectory::Resource) {
        candidates.push(path);
    }

    if let Ok(path) = app.path().resolve("ani-cli", BaseDirectory::Resource) {
        candidates.push(path);
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(app_dir) = exe.parent() {
            candidates.push(app_dir.join("resources").join("ani-cli"));
            candidates.push(app_dir.join("Resources").join("ani-cli"));

            if let Some(contents_dir) = app_dir.parent() {
                candidates.push(contents_dir.join("Resources").join("resources").join("ani-cli"));
                candidates.push(contents_dir.join("Resources").join("ani-cli"));
            }
        }
    }

    for path in candidates {
        if path.exists() {
            return (path, true);
        }
    }

    (PathBuf::from("ani-cli"), false)
}

fn sanitize_input(input: &str) -> String {
    input
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || "-_:".contains(*c))
        .take(200)
        .collect()
}

fn sanitize_title(input: &str) -> String {
    input
        .chars()
        .filter(|c| !c.is_control())
        .take(300)
        .collect()
}

fn run_ani_cli(
    app: &AppHandle,
    args: &[String],
    envs: &[(&str, &str)],
) -> std::io::Result<std::process::Output> {
    let (cli_path, is_bundled) = get_ani_cli_path(app);

    let mut command = if is_bundled {
        let mut command = Command::new("sh");
        command.arg(&cli_path);
        command
    } else {
        Command::new(&cli_path)
    };

    command.args(args);
    for (key, value) in envs {
        command.env(key, value);
    }

    command.output()
}

#[tauri::command]
async fn search_anime(app: AppHandle, query: String) -> Result<SearchResponse, String> {
    let query = sanitize_input(&query);
    if query.is_empty() {
        return Ok(SearchResponse {
            status: "error".to_string(),
            query: String::new(),
            results: vec![],
            error: Some("Empty query".to_string()),
        });
    }

    info!("Searching for: {}", query);

    let output = run_ani_cli(
        &app,
        &["--search-only".to_string(), query.clone()],
        &[("ANI_CLI_LOG", "0")],
    );

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            info!("CLI output: {} chars", stdout.len());
            if !stderr.is_empty() {
                info!("CLI stderr: {}", stderr);
            }

            let results = parse_search_output(&stdout);
            if results.is_empty() && !out.status.success() {
                let error = sanitize_output(&stderr).trim().to_string();
                return Ok(SearchResponse {
                    status: "error".to_string(),
                    query,
                    results,
                    error: Some(if error.is_empty() {
                        "Search failed".to_string()
                    } else {
                        error
                    }),
                });
            }

            Ok(SearchResponse {
                status: if results.is_empty() {
                    "empty".to_string()
                } else {
                    "success".to_string()
                },
                query,
                results,
                error: None,
            })
        }
        Err(e) => {
            error!("Failed to execute ani-cli: {}", e);
            Ok(SearchResponse {
                status: "error".to_string(),
                query,
                results: vec![],
                error: Some(format!("Failed to run bundled ani-cli: {}", e)),
            })
        }
    }
}

fn sanitize_output(output: &str) -> String {
    let mut result = String::new();
    let mut chars = output.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '\x1b' {
            if chars.peek() == Some(&'[') {
                chars.next();
                for next in chars.by_ref() {
                    if ('@'..='~').contains(&next) {
                        break;
                    }
                }
            }
            continue;
        }

        if c.is_control() && c != '\n' && c != '\r' && c != '\t' {
            continue;
        }

        result.push(c);
    }

    result
}

fn split_title_metadata(raw: &str) -> (String, String) {
    let source_title = raw.trim().to_string();
    if source_title.ends_with(" episodes)") {
        if let Some(index) = source_title.rfind(" (") {
            return (source_title[..index].trim().to_string(), source_title);
        }
    }

    (source_title.clone(), source_title)
}

fn is_valid_result_line(line: &str) -> bool {
    let trimmed = line.trim();
    if trimmed.is_empty() || trimmed.len() > 300 {
        return false;
    }
    !trimmed
        .chars()
        .any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t')
}

fn parse_search_output(output: &str) -> Vec<SearchResult> {
    let mut results = Vec::new();
    let sanitized = sanitize_output(output);

    for line in sanitized.lines() {
        let line = line.trim();
        if !is_valid_result_line(line) {
            continue;
        }

        if line.starts_with("Select anime:")
            || line.starts_with("Playing")
            || line.starts_with("Checking")
            || line.starts_with("Program ")
            || line.starts_with("ani")
        {
            continue;
        }

        let mut parts = line.splitn(2, '\t');
        let (Some(anime_id), Some(raw_title)) = (parts.next(), parts.next()) else {
            continue;
        };

        let anime_id = anime_id.trim();
        if anime_id.is_empty() {
            continue;
        }

        let (title, source_title) = split_title_metadata(raw_title);
        if title.is_empty() {
            continue;
        }

        results.push(SearchResult {
            index: results.len() as i32 + 1,
            title,
            source_title,
            id: anime_id.to_string(),
        });

        if results.len() >= 40 {
            break;
        }
    }

    results
}

#[tauri::command]
async fn play_anime(
    app: AppHandle,
    anime_id: String,
    anime_title: String,
    episode: Option<i32>,
    quality: String,
    mode: String,
) -> Result<PlayResult, String> {
    let valid_qualities = ["best", "worst", "360", "480", "720", "1080"];
    let quality = if valid_qualities.contains(&quality.as_str()) {
        quality
    } else {
        "best".to_string()
    };

    let mode = if mode == "dub" { "dub" } else { "sub" };
    let anime_id = sanitize_input(&anime_id);
    let anime_title = sanitize_title(&anime_title);
    let episode = episode.unwrap_or(1).max(1);

    if anime_id.is_empty() {
        return Ok(PlayResult {
            status: "error".to_string(),
            url: None,
            error: Some("Missing anime id".to_string()),
        });
    }

    info!(
        "Playing: id={}, ep={}, quality={}, mode={}",
        anime_id, episode, quality, mode
    );

    let mut args = vec![
        "--url-only".to_string(),
        "--anime-id".to_string(),
        anime_id,
        "--anime-title".to_string(),
        anime_title,
        "-e".to_string(),
        episode.to_string(),
        "-q".to_string(),
        quality,
    ];

    if mode == "dub" {
        args.push("--dub".to_string());
    }

    let output = run_ani_cli(
        &app,
        &args,
        &[
            ("ANI_CLI_PLAYER", "debug"),
            ("ANI_CLI_NO_DETACH", "1"),
            ("ANI_CLI_LOG", "0"),
        ],
    );

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            info!("Play output: {}", stdout);

            let url = extract_stream_url(&stdout, &stderr);
            let has_url = url.is_some();
            let error = sanitize_output(&stderr).trim().to_string();

            Ok(PlayResult {
                status: if has_url {
                    "success".to_string()
                } else {
                    "error".to_string()
                },
                url,
                error: if has_url {
                    None
                } else {
                    Some(if error.is_empty() {
                        "No stream URL found".to_string()
                    } else {
                        error
                    })
                },
            })
        }
        Err(e) => {
            error!("Failed to play: {}", e);
            Ok(PlayResult {
                status: "error".to_string(),
                url: None,
                error: Some(format!("Failed to execute bundled ani-cli: {}", e)),
            })
        }
    }
}

fn extract_stream_url(stdout: &str, stderr: &str) -> Option<String> {
    let combined = sanitize_output(&format!("{}\n{}", stdout, stderr));

    for line in combined.lines() {
        let line = line.trim().trim_matches(|c| c == '"' || c == '\'');

        if line.starts_with("https://") || line.starts_with("http://") {
            return Some(line.to_string());
        }

        if let Some(http_pos) = line.find("https://").or_else(|| line.find("http://")) {
            let url = line[http_pos..]
                .split_whitespace()
                .next()
                .unwrap_or("")
                .trim_matches(|c| c == '"' || c == '\'')
                .to_string();
            if !url.is_empty() {
                return Some(url);
            }
        }
    }

    None
}

#[tauri::command]
async fn check_ani_cli(app: AppHandle) -> Result<bool, String> {
    let output = run_ani_cli(&app, &["--version".to_string()], &[]);

    match output {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
async fn get_cli_version(app: AppHandle) -> Result<String, String> {
    let output = run_ani_cli(&app, &["--version".to_string()], &[]);

    match output {
        Ok(out) => {
            let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
            Ok(version)
        }
        Err(e) => Err(format!("Failed to get version: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    info!("Starting ani-cli-web");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            search_anime,
            play_anime,
            check_ani_cli,
            get_cli_version
        ])
        .setup(|_app| {
            info!("App setup complete");

            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
