// Copyright 2026 Roman F
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use std::{
    collections::HashMap,
    sync::{Arc, LazyLock, Mutex},
};

use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use regex::Regex;
use rusqlite::{Connection, fallible_iterator::FallibleIterator};
use thiserror::Error;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::Level;

#[derive(Debug, Error)]
enum AppError {
    #[error("database error")]
    DatabaseError(#[from] rusqlite::Error),
    #[error("invalid request: {0}")]
    InvalidRequest(&'static str),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (
            match self {
                Self::InvalidRequest(_) => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            },
            format!("Something went wrong: {}", self),
        )
            .into_response()
    }
}

async fn nutrients(
    conn: State<Arc<Mutex<Connection>>>,
    date: Path<String>,
) -> Result<Json<HashMap<String, i32>>, AppError> {
    let conn = conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT name, SUM(CASE type WHEN 'inc' THEN 1 ELSE -1 END) FROM nutrient_events WHERE date = ? GROUP BY name",
    )?;
    let rows = stmt.query([date.0])?;
    Ok(Json(rows.map(|r| Ok((r.get(0)?, r.get(1)?))).collect()?))
}

fn is_valid_date(date: &str) -> bool {
    static RE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"[[:digit:]]{4}-[[:digit:]]{2}-[[:digit:]]{2}").unwrap());
    RE.is_match(date)
}

fn is_valid_nutrient(nutrient: &str) -> bool {
    static NUTRIENTS: [&str; 4] = ["protein", "carbs", "vegetables", "fats"];
    NUTRIENTS.contains(&nutrient)
}

async fn inc_nutrient(
    conn: State<Arc<Mutex<Connection>>>,
    Path((date, nutrient)): Path<(String, String)>,
) -> Result<Json<&'static str>, AppError> {
    if !is_valid_date(&date) {
        return Err(AppError::InvalidRequest("invalid date"));
    }
    if !is_valid_nutrient(&nutrient) {
        return Err(AppError::InvalidRequest("invalid nutrient"));
    }

    let conn = conn.lock().unwrap();

    conn.execute(
        "INSERT INTO nutrient_events(name, date, type) VALUES (?, ?, 'inc')",
        [&nutrient, &date],
    )?;

    Ok(Json("success"))
}

async fn dec_nutrient(
    conn: State<Arc<Mutex<Connection>>>,
    Path((date, nutrient)): Path<(String, String)>,
) -> Result<Json<&'static str>, AppError> {
    if !is_valid_date(&date) {
        return Err(AppError::InvalidRequest("invalid date"));
    }
    if !is_valid_nutrient(&nutrient) {
        return Err(AppError::InvalidRequest("invalid nutrient"));
    }

    let conn = conn.lock().unwrap();

    // It's safe to do the check and update without transaction because mutex enforces no parallelism
    let count: i32 = conn.query_row("SELECT SUM(CASE type WHEN 'inc' THEN 1 ELSE -1 END) FROM nutrient_events WHERE date = ? AND name = ?", [&date, &nutrient], |r| r.get(0))?;
    if count == 0 {
        return Err(AppError::InvalidRequest(
            "can't decrease because the count is already 0",
        ));
    }

    conn.execute(
        "INSERT INTO nutrient_events(name, date, type) VALUES (?, ?, 'dec')",
        [&nutrient, &date],
    )?;

    Ok(Json("success"))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(Level::TRACE)
        .init();

    let conn = Connection::open("nutrients.db").expect("Failed to open nutrients.db");
    conn.execute(
        "CREATE TABLE IF NOT EXISTS nutrient_events (
        timestamp INT PRIMARY KEY DEFAULT(unixepoch('subsec') * 1000),
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type in ('inc', 'dec'))) STRICT",
        [],
    )
    .unwrap();
    // build our application with a single route
    let app = Router::new()
        .route("/nutrients/{date}", get(nutrients))
        .route("/nutrients/{date}/{nutrient}/inc", post(inc_nutrient))
        .route("/nutrients/{date}/{nutrient}/dec", post(dec_nutrient))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(Arc::new(Mutex::new(conn)));

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
