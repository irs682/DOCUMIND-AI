# DOCUMIND-AI frontend

## Run locally

Start the API first and leave its terminal running, then start the frontend in
a second terminal:

```powershell
cd ..\backend
npm run dev
# Verify that this returns {"status":"ok"} before opening the frontend:
Invoke-WebRequest http://127.0.0.1:5000/api/health
```

```powershell
npm run dev
```

The Vite dev server proxies `/api` and `/uploads` to `http://127.0.0.1:5000`.
If Vite reports `ECONNREFUSED 127.0.0.1:5000`, the backend process is not
running (or has stopped); restart `npm run dev` in the backend terminal.
For a separately hosted API, set `VITE_API_BASE_URL` to its `/api` URL before
building.

If the AI Chat page reports that the service is unavailable, verify that
`http://localhost:5000/api/health` returns `{"status":"ok"}` and use the
**Retry** action in the chat banner.

## Available scripts

- `npm run dev` - start the Vite development server
- `npm run build` - create a production build
- `npm run lint` - run Oxlint
