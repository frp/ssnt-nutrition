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
    env,
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
use rusqlite::{Connection, fallible_iterator::FallibleIterator, params};
use thiserror::Error;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{Level, info};

#[derive(Debug, Error)]
enum AppError {
    #[cfg_attr(debug_assertions, error("database error: {0}"))]
    #[cfg_attr(not(debug_assertions), error("database error"))]
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

async fn get_portions_for_date(
    conn: State<Arc<Mutex<Connection>>>,
    date: Path<String>,
) -> Result<Json<HashMap<String, i32>>, AppError> {
    let conn = conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT name, SUM(CASE type WHEN 'consume' THEN 1 ELSE -1 END) FROM nutrient_events WHERE date = ? GROUP BY name",
    )?;
    let rows = stmt.query([date.0])?;
    Ok(Json(rows.map(|r| Ok((r.get(0)?, r.get(1)?))).collect()?))
}

async fn get_goals(
    conn: State<Arc<Mutex<Connection>>>,
) -> Result<Json<HashMap<String, i32>>, AppError> {
    let conn = conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT nutrient, SUM(CASE type WHEN 'inc' THEN 1 ELSE -1 END) FROM goal_events GROUP BY nutrient",
    )?;
    let rows = stmt.query([])?;
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

async fn consume_portion(
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
        "INSERT INTO nutrient_events(name, date, type) VALUES (?, ?, 'consume')",
        [&nutrient, &date],
    )?;

    Ok(Json("success"))
}

async fn unconsume_portion(
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
    let count: Option<i32> = conn.query_row(
        "SELECT SUM(CASE type WHEN 'consume' THEN 1 ELSE -1 END) FROM nutrient_events WHERE date = ? AND name = ?",
        [&date, &nutrient],
        |r| r.get(0))?;
    if count.is_none_or(|x| x == 0) {
        return Err(AppError::InvalidRequest(
            "can't unconsume because the count is already 0",
        ));
    }

    conn.execute(
        "INSERT INTO nutrient_events(name, date, type) VALUES (?, ?, 'unconsume')",
        [&nutrient, &date],
    )?;

    Ok(Json("success"))
}

async fn inc_goal(
    nutrient: Path<String>,
    conn: State<Arc<Mutex<Connection>>>,
) -> Result<Json<&'static str>, AppError> {
    if !is_valid_nutrient(&nutrient) {
        return Err(AppError::InvalidRequest("invalid nutrient"));
    }

    let conn = conn.lock().unwrap();

    conn.execute(
        "INSERT INTO goal_events (nutrient, type) VALUES (?, ?)",
        params![&*nutrient, "inc"],
    )?;
    Ok(Json("success"))
}

async fn dec_goal(
    nutrient: Path<String>,
    conn: State<Arc<Mutex<Connection>>>,
) -> Result<Json<&'static str>, AppError> {
    if !is_valid_nutrient(&nutrient) {
        return Err(AppError::InvalidRequest("invalid nutrient"));
    }

    let conn = conn.lock().unwrap();

    // It's safe to do the check and update without transaction because mutex enforces no parallelism
    let count: Option<i32> = conn.query_row(
        "SELECT SUM(CASE type WHEN 'inc' THEN 1 ELSE -1 END) FROM goal_events WHERE nutrient = ?",
        [&*nutrient],
        |r| r.get(0),
    )?;
    if count.is_none_or(|x| x == 0) {
        return Err(AppError::InvalidRequest(
            "can't decrease because the goal is already 0",
        ));
    }

    conn.execute(
        "INSERT INTO goal_events (nutrient, type) VALUES (?, ?)",
        params![&*nutrient, "dec"],
    )?;
    Ok(Json("success"))
}

fn router(conn: rusqlite::Connection) -> Router {
    Router::new()
        // queries
        .route("/days/{date}/portions", get(get_portions_for_date))
        .route("/goals", get(get_goals))
        // commands
        .route(
            "/days/{date}/portions/{nutrient}/consume",
            post(consume_portion),
        )
        .route(
            "/days/{date}/portions/{nutrient}/unconsume",
            post(unconsume_portion),
        )
        .route("/goals/portions/{nutrient}/inc", post(inc_goal))
        .route("/goals/portions/{nutrient}/dec", post(dec_goal))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(Arc::new(Mutex::new(conn)))
}

fn setup_db(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Design notes:
    // - pure event sourcing for sync and simple design
    // - PRIMARY KEY is id, not timestamp, to save me from battling disambiguation if
    //   multiple things happen at the same time
    // Possible future optimisations:
    // - indices to support the queries better
    // - materialized views to avoid processing all events
    conn.execute(
        "CREATE TABLE IF NOT EXISTS nutrient_events (
            id INTEGER PRIMARY KEY,
            timestamp INT DEFAULT(unixepoch('subsec') * 1000),
            name TEXT NOT NULL CHECK (name in ('protein', 'carbs', 'vegetables', 'fats')),
            date TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type in ('consume', 'unconsume'))) STRICT",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS goal_events (
            id INTEGER PRIMARY KEY,
            timestamp INT DEFAULT(unixepoch('subsec') * 1000),
            nutrient TEXT NOT NULL CHECK (nutrient in ('protein', 'carbs', 'vegetables', 'fats')),
            type TEXT NOT NULL CHECK (type in ('inc', 'dec'))) STRICT",
        [],
    )?;
    Ok(())
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(Level::TRACE)
        .init();

    let bind_address = env::var("PORTIONS_BIND_ADDRESS").unwrap_or("0.0.0.0:3000".into());

    let conn = Connection::open("nutrients.db").expect("Failed to open nutrients.db");
    setup_db(&conn).unwrap();

    info!("Starting server at {}...", bind_address);
    let listener = tokio::net::TcpListener::bind(bind_address).await.unwrap();
    axum::serve(listener, router(conn)).await.unwrap();
}

#[cfg(test)]
mod tests {
    use axum_test::TestServer;
    use rusqlite::Connection;
    use serde_json::json;

    use crate::{router, setup_db};

    fn test_server() -> TestServer {
        let conn = Connection::open_in_memory().unwrap();
        setup_db(&conn).unwrap();
        TestServer::new(router(conn)).unwrap()
    }

    mod goals {
        use super::*;

        #[tokio::test]
        async fn test_get_goals_empty() {
            let server = test_server();
            let resp = server.get("/goals").await;
            resp.assert_status_success();
            resp.assert_json(&json!({}));
        }

        #[tokio::test]
        async fn test_inc_goal_validation() {
            let server = test_server();
            server
                .post("/goals/portions/protein/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/carbs/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/fats/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/vegetables/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/bad/inc")
                .await
                .assert_status_bad_request();
        }

        #[tokio::test]
        async fn test_inc_goal() {
            let server = test_server();
            server
                .post("/goals/portions/protein/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/protein/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/carbs/inc")
                .await
                .assert_status_success();
            let resp = server.get("/goals").await;
            resp.assert_status_success();
            resp.assert_json(&json!({"carbs": 1, "protein": 2}));
        }

        #[tokio::test]
        async fn test_dec_goal() {
            let server = test_server();
            server
                .post("/goals/portions/protein/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/protein/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/protein/dec")
                .await
                .assert_status_success();
            let resp = server.get("/goals").await;
            resp.assert_status_success();
            resp.assert_json(&json!({"protein": 1}));
        }

        #[tokio::test]
        async fn test_dec_goal_validation_empty() {
            let server = test_server();
            server
                .post("/goals/portions/protein/dec")
                .await
                .assert_status_bad_request();
        }

        #[tokio::test]
        async fn test_dec_goal_validation_0() {
            let server = test_server();
            server
                .post("/goals/portions/protein/inc")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/protein/dec")
                .await
                .assert_status_success();
            server
                .post("/goals/portions/protein/dec")
                .await
                .assert_status_bad_request();
        }
    }

    mod days {
        use super::*;

        #[tokio::test]
        async fn test_get_portions_empty() {
            let server = test_server();
            let resp = server.get("/days/2026-01-01/portions").await;
            resp.assert_status_success();
            resp.assert_json(&json!({}));
        }

        #[tokio::test]
        async fn test_consume() {
            let server = test_server();
            server
                .post("/days/2026-01-01/portions/protein/consume")
                .await
                .assert_status_success();
            let resp = server.get("/days/2026-01-01/portions").await;
            resp.assert_status_success();
            resp.assert_json(&json!({"protein": 1}));
            let resp = server.get("/days/2026-01-02/portions").await;
            resp.assert_status_success();
            resp.assert_json(&json!({}));
        }

        #[tokio::test]
        async fn test_consume_validation() {
            let server = test_server();
            server
                .post("/days/2026-01-01/portions/bad/consume")
                .await
                .assert_status_bad_request();
            let resp = server.get("/days/2026-01-01/portions").await;
            resp.assert_status_success();
            resp.assert_json(&json!({}));
        }

        #[tokio::test]
        async fn test_unconsume() {
            let server = test_server();
            server
                .post("/days/2026-01-01/portions/protein/consume")
                .await
                .assert_status_success();
            server
                .post("/days/2026-01-01/portions/protein/consume")
                .await
                .assert_status_success();
            server
                .post("/days/2026-01-01/portions/protein/unconsume")
                .await
                .assert_status_success();
            let resp = server.get("/days/2026-01-01/portions").await;
            resp.assert_status_success();
            resp.assert_json(&json!({"protein": 1}));
        }

        #[tokio::test]
        async fn test_unconsume_validation_empty() {
            let server = test_server();
            server
                .post("/days/2026-01-01/portions/protein/unconsume")
                .await
                .assert_status_bad_request();
        }

        #[tokio::test]
        async fn test_unconsume_validation_zero() {
            let server = test_server();
            server
                .post("/days/2026-01-01/portions/protein/consume")
                .await
                .assert_status_success();
            server
                .post("/days/2026-01-01/portions/protein/unconsume")
                .await
                .assert_status_success();
            server
                .post("/days/2026-01-01/portions/protein/unconsume")
                .await
                .assert_status_bad_request();
            let resp = server.get("/days/2026-01-01/portions").await;
            resp.assert_status_success();
            resp.assert_json(&json!({"protein": 0}));
        }
    }
}
