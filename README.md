# Simple Self-hosted Nutrient Tracker

<p align="center">
    <img src="demo.avif">
</p>

I didn't find any free, simple, and easily accessible apps for the hand portion method recommended by my nutrition coach, so I made my own.

## Features

I made this app primarily to meet my own nutritional needs, so the feature set is minimal and restricted to what I actually needed. The following is included:

* Tracking portions of macronutrients.
* Adjusting the goals.
* Mobile-friendly UI.

The following commonly expected features are missing:

* Support for multi-tenancy. If there are multiple users, each needs their own instance.
* Support for authentication. I use it with a VPN popular in the self-hosting community. A reverse proxy that enforces authentication is also a valid option.
* Support for Postgres or another non-local RDBMS. The capability itself is trivial, but would complicate the testing setup.
* Support for any customisation, including the nutrients being tracked.
* Mobile app or any offline capability, although it might be added in the future.

## Toolchain

The frontend is implemented in TypeScript, the backend - in Rust. The backend uses SQLite3 for storage.

Required tools:

- [Bun](https://bun.com)
- [Rust](https://rust-lang.org/tools/install/)

## Development

To run frontend:

```bash
cd frontend
bun dev
```

To run backend:

```bash
cd backend
cargo run
```

More details about each in their respective READMEs.

To enable pre-commit git hook running lints and tests:

```bash
git config core.hooksPath githooks
```

## Depoyment

Deploying it on a typical Linux machine looks as follows:

1. Build and deploy frontend:

   ```shell
   cd frontend
   bun build
   cp -R dist/ <DIRECTORY FOR STATIC FILES ON YOUR WEB SERVER>
   ```

2. Build and install backend:

   ```shell
   cd backend
   cargo install --path .
   ```

3. Configure systemd to start it up automatically. Unit file example:

   ```
   [Unit]
   Description=Simple Self-hosted Nutrition Tracker
   After=network.target

   [Service]
   Type=simple
   ExecStart=/home/user/.cargo/bin/ssnt_backend
   Restart=on-abort
   WorkingDirectory=/home/user/.local/share/ssnt_backend
   Environment="SSNT_BIND_ADDRESS=localhost:8594"

   [Install]
   WantedBy=default.target
   ```

4. Configure your web server such that it routes `/api` requests to the backend, and serves frontend static files to the rest.

   Example config for Caddy:

   ```
   http://ssnt.lan {
           handle_path /api/* {
                   reverse_proxy localhost:8594
           }
           root * /srv/ssnt
           file_server
   }
   ```

This can be trivially adjusted to Docker and environments where frontend, backend, and reverse proxy run on different machines.
