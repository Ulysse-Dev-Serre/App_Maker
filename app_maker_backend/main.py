# app_maker_backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from contextlib import asynccontextmanager
from core.app_runner import stop_pyside_application  # coroutine de nettoyage

# Imports des routeurs
from api import projects, files, runner, log

from dotenv import load_dotenv
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield  # démarrage
    await stop_pyside_application()  # arrêt / Ctrl-C

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montage des routeurs
app.include_router(projects.router, prefix="/api")
app.include_router(files.router,   prefix="/api")
app.include_router(runner.router,  prefix="/api")
app.include_router(log.router)     # déjà prefix="/api" interne

@app.get("/")
async def read_root():
    return {"message": "Bienvenue dans le Backend d'app_maker !"}