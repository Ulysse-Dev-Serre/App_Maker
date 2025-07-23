uvicorn main:app --reload --port 8000
uvicorn main:app --reload --reload-exclude .venv

source venv/bin/activate

http://127.0.0.1:8000/docs

http://localhost:5173/chat/greenhouse-monitoring-app