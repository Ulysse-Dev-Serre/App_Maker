# app_maker_backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Imports des modules qui contiennent les routeurs
from api import projects, files, runner, log # Assure-toi que log est importé ici

from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

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

# Inclure les routeurs des modules importés
# C'EST ICI LA CLÉ : AJOUTE prefix="/api" À CHAQUE ROUTEUR SAUF CELUI DE LOGS (QUI L'A DÉJÀ INTERNEMENT)
app.include_router(projects.router, prefix="/api") # <--- Assure-toi que cette ligne est correcte !
app.include_router(files.router, prefix="/api")    # <--- Ajoute ceci aussi si ce n'est pas fait
app.include_router(runner.router, prefix="/api")   # <--- Ajoute ceci aussi si ce n'est pas fait
app.include_router(log.router)                     # <--- Ici, PAS de prefix="/api", car log.py l'a déjà !

@app.get("/")
async def read_root():
    return {"message": "Bienvenue dans le Backend d'app_maker !"}