from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# CHANGEMENT IMPORTANT ICI : Utiliser des imports absolus depuis la racine du projet
# Python regarde dans les chemins de sys.path. Puisque votre répertoire app_maker_backend
# est le répertoire de travail, 'api' sera trouvé.
from api import projects, files, runner, log

# Charger les variables d'environnement (peut être déplacé dans core/config.py si plus complexe)
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

# Configuration CORS
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

# Inclure les routeurs. Chaque routeur gère un ensemble d'endpoints logiquement liés.
app.include_router(projects.router)
app.include_router(files.router)
app.include_router(runner.router)
app.include_router(log.router)

@app.get("/")
async def read_root():
    return {"message": "Bienvenue dans le Backend d'app_maker !"}