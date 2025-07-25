# run.py
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_excludes=[
            "**/.venv",
            "**/generated_projects/**/.venv",
            "**/__pycache__",
        ],
    )