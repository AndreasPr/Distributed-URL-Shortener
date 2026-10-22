Quickstart for frontend

Install dependencies:

```bash
cd frontend
npm install
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open the app in your browser:

```bash
http://127.0.0.1:3000
```

Environment:

Create `frontend/.env.local` with:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Make sure the backend API is running first:

```bash
.venv/bin/uvicorn app.main:app --no-proxy-headers --reload --host 0.0.0.0 --port 8000
```

Build:

```bash
npm run build
npm run start
```


API-key access: after starting the updated backend and applying migrations, create
a read/write key using `python -m app.cli keys create --name browser --scopes read write`
in the API container. Paste it into the API key field and click Use key. The field
keeps it only in memory for this tab, clears on reload, and has a Forget button.
Do not add a real key to NEXT_PUBLIC_* environment variables or localStorage.
Read APIs (listing/analytics) now require read scope; shortening/deletion require
write. See [security setup](../docs/security.md). `npm test` checks the API client.
