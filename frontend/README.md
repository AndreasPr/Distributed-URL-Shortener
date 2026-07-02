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
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Build:

```bash
npm run build
npm run start
```
