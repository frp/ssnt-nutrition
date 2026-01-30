# Simple Self-hosted Nutrient Tracker - Frontend

To run:

```bash
cargo run
```

To test:

```bash
cargo test
```

The bind address is controlled with environment variable `SSNT_BIND_ADDRESS`, for example:

```bash
SSNT_BIND_ADDRESS=localhost:8594 cargo run
```

The database used is SQLite3 living in `nutrients.db` in the current directory.

## Design choices

The app implements an event sourcing pattern: the "source of truth" is a sequential log of all events. It makes it trivial to implement a synchronization functionality in the future in case I decide to add a mobile app.

API design is CQRS style.