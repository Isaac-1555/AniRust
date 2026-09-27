use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use log::{info, warn};
use serde::Deserialize;
use tokio::net::TcpListener;

pub const DEFAULT_REFERER: &str = "https://allmanga.to";

const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0";

#[derive(Clone)]
pub struct Proxy {
    pub port: u16,
    client: reqwest::Client,
}

#[derive(Deserialize)]
struct ProxyParams {
    u: String,
    r: Option<String>,
}

impl Proxy {
    pub async fn start() -> Result<Proxy, String> {
        let client = reqwest::Client::builder()
            .user_agent(USER_AGENT)
            .build()
            .map_err(|e| format!("failed to build http client: {e}"))?;

        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("failed to bind proxy listener: {e}"))?;
        let port = listener
            .local_addr()
            .map_err(|e| format!("failed to read proxy address: {e}"))?
            .port();

        let proxy = Proxy { port, client };

        let router = Router::new()
            .route("/stream", get(handler))
            .route("/sub", get(handler))
            .route("/health", get(|| async { "ok" }))
            .with_state(proxy.clone());

        tauri::async_runtime::spawn(async move {
            if let Err(e) = axum::serve(listener, router).await {
                log::error!("proxy server stopped: {e}");
            }
        });

        info!("stream proxy listening on 127.0.0.1:{}", port);
        Ok(proxy)
    }

    pub fn proxify(&self, url: &str, referer: Option<&str>) -> String {
        let referer = referer.filter(|r| !r.is_empty()).unwrap_or(DEFAULT_REFERER);
        format!(
            "http://127.0.0.1:{}/stream?u={}&r={}",
            self.port,
            urlencoding::encode(url),
            urlencoding::encode(referer)
        )
    }
}

async fn handler(
    State(proxy): State<Proxy>,
    Query(params): Query<ProxyParams>,
    headers: HeaderMap,
) -> Response {
    match proxy_request(&proxy, &params, &headers).await {
        Ok(response) => response,
        Err(e) => {
            warn!("proxy request failed for {}: {e}", params.u);
            (StatusCode::BAD_GATEWAY, format!("proxy error: {e}")).into_response()
        }
    }
}

async fn proxy_request(
    proxy: &Proxy,
    params: &ProxyParams,
    headers: &HeaderMap,
) -> Result<Response, String> {
    let url = reqwest::Url::parse(&params.u).map_err(|e| format!("invalid url: {e}"))?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return Err(format!("unsupported scheme: {}", url.scheme()));
    }

    let referer = params
        .r
        .clone()
        .filter(|r| !r.is_empty())
        .unwrap_or_else(|| DEFAULT_REFERER.to_string());

    let mut request = proxy
        .client
        .get(url.clone())
        .header(reqwest::header::REFERER, &referer);

    if let Some(range) = headers.get(header::RANGE) {
        request = request.header(reqwest::header::RANGE, range.clone());
    }

    let upstream = request.send().await.map_err(|e| e.to_string())?;
    let status = upstream.status();
    let content_type = upstream
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    let final_url = upstream.url().clone();
    let final_url_string = final_url.as_str().to_string();

    let is_m3u8 = content_type.contains("mpegurl")
        || final_url_string.contains(".m3u8")
        || url.as_str().contains(".m3u8");

    let mut builder = Response::builder()
        .status(status)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "*")
        .header(header::ACCESS_CONTROL_EXPOSE_HEADERS, "*");

    if is_m3u8 {
        let body = upstream.text().await.map_err(|e| e.to_string())?;
        let rewritten = rewrite_m3u8(&body, &final_url, &referer, proxy.port);
        builder = builder.header(header::CONTENT_TYPE, "application/vnd.apple.mpegurl");
        return builder
            .body(Body::from(rewritten))
            .map_err(|e| e.to_string());
    }

    if !content_type.is_empty() {
        builder = builder.header(header::CONTENT_TYPE, content_type);
    }
    for passthrough in [
        header::ACCEPT_RANGES,
        header::CONTENT_RANGE,
        header::CONTENT_LENGTH,
    ] {
        if let Some(value) = upstream.headers().get(&passthrough) {
            builder = builder.header(passthrough, value.clone());
        }
    }

    let stream = upstream.bytes_stream();
    builder
        .body(Body::from_stream(stream))
        .map_err(|e| e.to_string())
}

fn rewrite_m3u8(body: &str, base: &reqwest::Url, referer: &str, port: u16) -> String {
    let mut out = String::with_capacity(body.len() + 64);

    for line in body.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            out.push('\n');
            continue;
        }

        if trimmed.starts_with('#') {
            out.push_str(&rewrite_attributes(line, base, referer, port));
        } else {
            out.push_str(&proxify_uri(trimmed, base, referer, port));
        }
        out.push('\n');
    }

    out
}

fn rewrite_attributes(line: &str, base: &reqwest::Url, referer: &str, port: u16) -> String {
    let mut result = String::with_capacity(line.len() + 64);
    let mut rest = line;

    while let Some(pos) = rest.find("URI=\"") {
        result.push_str(&rest[..pos + 5]);
        let after = &rest[pos + 5..];

        if let Some(end) = after.find('"') {
            let uri = &after[..end];
            result.push_str(&proxify_uri(uri, base, referer, port));
            result.push('"');
            rest = &after[end + 1..];
        } else {
            result.push_str(after);
            rest = "";
        }
    }

    result.push_str(rest);
    result
}

fn proxify_uri(uri: &str, base: &reqwest::Url, referer: &str, port: u16) -> String {
    if uri.starts_with("data:") {
        return uri.to_string();
    }

    let absolute = match base.join(uri) {
        Ok(url) => url,
        Err(_) => return uri.to_string(),
    };

    format!(
        "http://127.0.0.1:{}/stream?u={}&r={}",
        port,
        urlencoding::encode(absolute.as_str()),
        urlencoding::encode(referer)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rewrites_relative_and_absolute_uris() {
        let base = reqwest::Url::parse("https://hls.example/v/abc/1080/index.m3u8").unwrap();
        let body = "#EXTM3U\n#EXTINF:10,\nseg_00000.ts\nhttps://cdn.example/abs.ts\n";
        let out = rewrite_m3u8(body, &base, "https://ref.example", 4444);

        assert!(out.contains("#EXTM3U"));
        assert!(out.contains(
            "http://127.0.0.1:4444/stream?u=https%3A%2F%2Fhls.example%2Fv%2Fabc%2F1080%2Fseg_00000.ts&r=https%3A%2F%2Fref.example"
        ));
        assert!(out.contains(
            "http://127.0.0.1:4444/stream?u=https%3A%2F%2Fcdn.example%2Fabs.ts&r=https%3A%2F%2Fref.example"
        ));
    }

    #[test]
    fn rewrites_uri_attributes_and_skips_data_uris() {
        let base = reqwest::Url::parse("https://hls.example/v/abc/index.m3u8").unwrap();
        let key = "#EXT-X-KEY:METHOD=AES-128,URI=\"key.bin\"";
        let rewritten = rewrite_attributes(key, &base, "https://ref.example", 5555);
        assert!(rewritten.contains(
            "URI=\"http://127.0.0.1:5555/stream?u=https%3A%2F%2Fhls.example%2Fv%2Fabc%2Fkey.bin"
        ));

        let data_key = "#EXT-X-KEY:METHOD=AES-128,URI=\"data:text/plain;base64,AAAA\"";
        assert_eq!(
            rewrite_attributes(data_key, &base, "https://ref.example", 5555),
            data_key
        );
    }
}
