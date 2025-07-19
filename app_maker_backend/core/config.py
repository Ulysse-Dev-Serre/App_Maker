# app_maker_backend/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()  # Assure que les variables d'environnement sont chargées

# Clés API pour différents LLM
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")  # Pour un usage futur si tu ajoutes DeepSeek
KIMI_API_KEY = os.getenv("KIMI_API_KEY")          # <-- AJOUT

# Chemin de base pour les projets générés
CURRENT_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
# Remonte d'un niveau (core) puis d'un niveau (app_maker_backend)
BASE_PROJECTS_DIR = os.path.abspath(os.path.join(CURRENT_BACKEND_DIR, "..", "generated_projects"))
os.makedirs(BASE_PROJECTS_DIR, exist_ok=True)  # S'assurer que le dossier existe

# Modèles disponibles pour chaque fournisseur de LLM
GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"]
OPENAI_MODELS = ["gpt-3.5-turbo", "gpt-4-turbo", "gpt-4o"]
DEEPSEEK_MODELS = ["deepseek-coder", "deepseek-chat"]  # Exemple
KIMI_MODELS = ["moonshotai/kimi-k2:free"]             

# --- NOUVEAU : Patterns de fichiers/dossiers à exclure lors de l'envoi du contexte au LLM ---
LLM_CONTEXT_EXCLUSIONS = [
    ".venv/",          # Exclure l'environnement virtuel
    "__pycache__/",    # Exclure les caches Python
    "history.json",    # Exclure le fichier d'historique du projet
    "*.log",           # Exclure les fichiers de log
    "*.txt",           # Exclure les fichiers texte génériques (si non pertinents)
    "*.md",            # Exclure les fichiers Markdown (si non pertinents)
    # Ajoutez d'autres patterns si nécessaire.
    # Les patterns peuvent être des noms de fichiers exacts, des dossiers (finissant par '/'),
    # ou des wildcards (ex: '*.json' si vous ne voulez aucun fichier JSON)
]