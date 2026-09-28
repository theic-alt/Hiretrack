# HireTrack

Initial project foundation for HireTrack.

## Structure

- `server/` — Express backend with the `/api/health` endpoint
- `client/` — React frontend powered by Vite

## Run locally

Install dependencies for each project:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

The development command also checks the PostgreSQL schema and creates the
development user if needed.

Start the backend and frontend together:

```bash
npm run dev
```

Or start them separately:

```bash
npm run server
npm run client
```

The frontend runs on port `5000`. During development, Vite forwards `/api/*`
requests to the Express backend on port `3001`.

The backend exposes:

- `GET /api/health`
- `GET /api/applications`
- `GET /api/applications/:id`
- `POST /api/applications`
- `PATCH /api/applications/:id`
- `DELETE /api/applications/:id`
- `GET /api/applications/:applicationId/interviews`
- `GET /api/interviews/:id`
- `POST /api/applications/:applicationId/interviews`
- `PATCH /api/interviews/:id`
- `DELETE /api/interviews/:id`
