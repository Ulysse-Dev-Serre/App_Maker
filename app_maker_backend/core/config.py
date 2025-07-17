# app_maker_backend/core/config.py
import os
from dotenv import load_dotenv

load_dotenv() # Assure que les variables d'environnement sont chargées

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("La variable d'environnement GOOGLE_API_KEY n'est pas définie. Veuillez la configurer dans un fichier .env.")

# Chemin de base pour les projets générés
CURRENT_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
# Remonte d'un niveau (core) puis d'un niveau (app_maker_backend)
BASE_PROJECTS_DIR = os.path.abspath(os.path.join(CURRENT_BACKEND_DIR, "..", "generated_projects"))
os.makedirs(BASE_PROJECTS_DIR, exist_ok=True) # S'assurer que le dossier existe