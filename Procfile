web: echo "PORT env var: $PORT" && pip install -r requirements.txt && echo "ABOUT TO START UVICORN on $PORT" && uvicorn app.main:app --host 0.0.0.0 --port $PORT 2>&1
