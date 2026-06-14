# Deploy Pollux

How to run Pollux in production.

## Prerequisites

Make sure you have a data directory for the SQLite database:

```bash
mkdir -p data
```

## As a background process

Use `bun run` with a process manager:

```bash
bun src/index.ts &
```

Or use `screen` / `tmux` to keep it running in the background.

## With a process manager

Using [pm2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start bun -- src/index.ts
pm2 save
```

## Using Docker

Build a Docker image:

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
EXPOSE 3000
CMD ["bun", "src/index.ts"]
```

Build and run:

```bash
docker build -t pollux .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data pollux
```

## Reverse proxy (nginx)

```nginx
server {
    listen 80;
    server_name pollux.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

The `Upgrade` and `Connection` headers are required for WebSocket support.
