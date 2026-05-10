## URL Shortener

This project uses Docker for the local services:

- Postgres: `docker run ... -p 5433:5432 postgres:16-alpine`
- Redis: `docker run ... -p 6380:6379 redis:7-alpine`

The app defaults to:

- `DB_URL=postgresql://user:pass@localhost:5433/url_db`
- `REDIS_URL=redis://localhost:6380/0`

Important:

- Stop any Homebrew Redis service before testing the Docker Redis container, otherwise `localhost:6379` may point to the wrong instance.
- Use `GET /health/redis` to verify the app can reach Redis.
- Use your browser or `curl -L` to test redirect routes; Swagger UI may show `Failed to fetch` for redirects.
