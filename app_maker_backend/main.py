# app_maker_backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import subprocess
import asyncio
import time
import sys
import google.generativeai as genai
from dotenv import load_dotenv

# Charger les variables d'environnement depuis le fichier .env
load_dotenv()

app = FastAPI()
pyside_app_process = None

# Configuration CORS pour permettre au frontend React de communiquer avec le backend
origins = [
    "http://localhost",
    "http://localhost:5173",  # Le port par défaut de Vite pour le frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Bienvenue dans le Backend d'app_maker !"}

# Variable globale pour stocker les logs (pour la simulation de polling)
global_logs = []

# --- Configuration de l'API Gemini ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("La variable d'environnement GOOGLE_API_KEY n'est pas définie. Veuillez la configurer dans un fichier .env.")

genai.configure(api_key=GOOGLE_API_KEY)
# --- Fin de la configuration Gemini ---


@app.post("/api/generate")
async def generate_app(prompt: dict):
    """
    Génère une application PySide6 en utilisant un modèle de langage et enregistre son code.
    """
    global global_logs
    global_logs = [] # Réinitialise les logs pour la nouvelle génération

    user_prompt = prompt.get("text", "Crée une application PySide6 simple avec un bouton 'Bonjour' qui affiche un message.")

    log_message = f"Génération du code PySide6 pour le prompt : '{user_prompt}'..."
    print(log_message); global_logs.append(log_message)

    try:
        # Initialisation du modèle Gemini 1.5 Flash
        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        # Construction du prompt pour le LLM
        llm_request_prompt = f"""
        Génère le code Python complet d'une application PySide6 basée sur la description suivante :
        "{user_prompt}"

        Le code doit être un fichier unique nommé `main.py`.
        La structure générale doit inclure :
        - Les imports nécessaires de PySide6 (ex: `QApplication`, `QWidget`, `QPushButton`, `QLabel`, `QVBoxLayout`, `QMessageBox` si nécessaire).
        - Une classe principale pour la fenêtre de l'application, héritant de `QWidget`.
        - Un constructeur `__init__` qui initialise l'interface utilisateur.
        - Une fonction `main` pour lancer l'application, s'assurant que `app.exec()` est appelé.
        - L'application doit démarrer une fenêtre visible.
        - Utilise des layouts (ex: `QVBoxLayout`) pour organiser les widgets.

        Retourne uniquement le code Python complet, sans explication, introduction, conclusion ni texte additionnel.
        Commence directement par la première ligne de code Python (généralement un import).
        N'encadre pas le code avec des triple backticks (```python).
        """

        # Appel au modèle Gemini
        # Utilisation de generate_content_async car l'endpoint est async
        response = await model.generate_content_async(llm_request_prompt)

        # Extraction du texte généré par le modèle
        generated_code_raw = response.text

        # Nettoyage si le modèle inclut malgré tout les backticks Markdown
        if generated_code_raw.startswith("```python"):
            generated_code = generated_code_raw.replace("```python", "").replace("```", "").strip()
        else:
            generated_code = generated_code_raw.strip()

        if not generated_code:
            raise ValueError("Le modèle n'a pas retourné de code PySide6 valide.")

        log_message = f"Code PySide6 généré par le LLM (premières 100 lettres): '{generated_code[:100]}...'"
        print(log_message); global_logs.append(log_message)

    except Exception as e:
        error_message = f"Erreur lors de l'appel au LLM ou de la génération du code : {e}"
        print(error_message); global_logs.append(error_message)
        raise HTTPException(status_code=500, detail=error_message)

    # --- Reste de la logique pour créer le projet et écrire le fichier ---
    timestamp = int(time.time())
    project_name = f"pyside_app_{timestamp}"
    # Utilise os.path.dirname(os.path.abspath(__file__)) pour obtenir le répertoire du script main.py
    current_backend_dir = os.path.dirname(os.path.abspath(__file__))
    base_projects_dir = os.path.join(current_backend_dir, "generated_projects")

    os.makedirs(base_projects_dir, exist_ok=True)

    project_path = os.path.join(base_projects_dir, project_name)
    os.makedirs(project_path, exist_ok=True)

    main_py_path = os.path.join(project_path, "main.py")
    relative_main_py_path = os.path.join("generated_projects", project_name, "main.py") # Ce chemin n'est pas utilisé directement pour lire le fichier dans le frontend, mais peut servir de référence

    try:
        with open(main_py_path, "w", encoding="utf-8") as f: # Ajout de encoding="utf-8"
            f.write(generated_code)
        log_message = f"Code écrit dans : {main_py_path}"
        print(log_message); global_logs.append(log_message)
    except IOError as e:
        error_message = f"Erreur lors de l'écriture du fichier {main_py_path}: {e}"
        print(error_message); global_logs.append(error_message)
        raise HTTPException(status_code=500, detail=error_message)

    global_logs.append("Génération terminée.")

    return {
        "message": "Application PySide6 générée avec succès.",
        "project_path": project_path, # Retourne le chemin ABSOLU du dossier projet
        "main_py_relative_path": relative_main_py_path, # Peut être utile pour l'affichage, mais pas pour le get_file_content
        "generated_code_preview": generated_code # Retourne le code généré pour un affichage immédiat
    }


@app.post("/api/get_file_content")
async def get_file_content(file_info: dict):
    """
    Récupère le contenu d'un fichier spécifié par son chemin relatif.
    """
    file_path_relative = file_info.get("path")
    print(f"DEBUG: 1. Chemin relatif reçu: {file_path_relative}") # <-- Ajoute/vérifie cette ligne

    if not file_path_relative:
        print("DEBUG: 1.1. Erreur: Chemin de fichier manquant (None ou vide).") # <-- Ajoute/vérifie cette ligne
        raise HTTPException(status_code=400, detail="Chemin du fichier non fourni.")

    current_backend_dir = os.path.dirname(os.path.abspath(__file__))
    base_projects_dir = os.path.join(current_backend_dir, "generated_projects")
    
    # ... (le code pour nettoyer file_path_relative) ...
    if file_path_relative.startswith("generated_projects/"):
        file_path_relative = file_path_relative[len("generated_projects/"):]
    elif sys.platform == "win32" and file_path_relative.startswith("generated_projects\\"):
        file_path_relative = file_path_relative[len("generated_projects\\"):]
    if sys.platform == "win32":
        file_path_relative = file_path_relative.replace("/", "\\")

    absolute_file_path = os.path.abspath(os.path.join(base_projects_dir, file_path_relative))

    print(f"DEBUG: 2. Répertoire de base calculé: {base_projects_dir}") # <-- Ajoute/vérifie cette ligne
    print(f"DEBUG: 3. Chemin absolu du fichier tenté: {absolute_file_path}") # <-- Ajoute/vérifie cette ligne

    # ... (vérification de sécurité du chemin) ...
    if not absolute_file_path.startswith(os.path.abspath(base_projects_dir)):
        print(f"DEBUG: 4. Accès au chemin {absolute_file_path} non autorisé (ne commence pas par {os.path.abspath(base_projects_dir)}).") # <-- Ajoute/vérifie cette ligne
        raise HTTPException(status_code=403, detail="Accès non autorisé au fichier. Tentative de sortir du répertoire des projets générés.")
    print(f"DEBUG: 4.1. Vérification de sécurité du chemin OK.") # <-- Ajoute/vérifie cette ligne

    await asyncio.sleep(0.5) # Le délai est toujours là, c'est bien.

    if not os.path.exists(absolute_file_path) or not os.path.isfile(absolute_file_path):
        # <-- Cette ligne est TRÈS importante pour le DEBUG -->
        print(f"DEBUG: 5. Fichier introuvable ou n'est pas un fichier. os.path.exists='{os.path.exists(absolute_file_path)}', os.path.isfile='{os.path.isfile(absolute_file_path)}'")
        raise HTTPException(status_code=404, detail="Fichier non trouvé ou n'est pas un fichier valide.")
    print(f"DEBUG: 5.1. Fichier trouvé et valide.") # <-- Ajoute/vérifie cette ligne

    try:
        with open(absolute_file_path, "r", encoding="utf-8") as f:
            content = f.read()
        print(f"DEBUG: 6. Contenu du fichier lu avec succès.") # <-- Ajoute/vérifie cette ligne
        return {"content": content}
    except Exception as e:
        print(f"DEBUG: 7. Erreur inattendue lors de la lecture du fichier {absolute_file_path}: {str(e)}") # <-- Ajoute/vérifie cette ligne
        raise HTTPException(status_code=500, detail=f"Erreur lors de la lecture du fichier: {e}")

# --- NOUVELLE FONCTION AUXILIAIRE POUR LIRE LA STRUCTURE DES DOSSIERS ---
def _get_directory_structure(root_path, current_path, base_projects_dir):
    """
    Fonction auxiliaire récursive pour obtenir la structure d'un répertoire.
    Prend base_projects_dir pour la vérification de sécurité.
    """
    structure = []
    # Assurer la sécurité: le chemin ne doit pas sortir du répertoire de base des projets générés.
    abs_current_path = os.path.abspath(current_path)
    if not abs_current_path.startswith(os.path.abspath(base_projects_dir)):
        raise HTTPException(status_code=403, detail="Accès non autorisé en dehors du répertoire des projets générés.")

    try:
        for item in os.listdir(current_path):
            item_path = os.path.join(current_path, item)
            # Pour le chemin relatif, il faut qu'il soit relatif au root_path du projet actuel
            relative_path = os.path.relpath(item_path, root_path)
            
            # Vérification de sécurité supplémentaire pour les éléments listés
            abs_item_path = os.path.abspath(item_path)
            if not abs_item_path.startswith(os.path.abspath(root_path)):
                print(f"ATTENTION: Élément de chemin invalide ou en dehors du root_path: {item_path}")
                continue # Skip cet élément pour la sécurité

            if os.path.isdir(item_path):
                # Ignorer l'environnement virtuel pour la liste des fichiers
                if item == ".venv":
                    continue
                structure.append({
                    "name": item,
                    "type": "directory",
                    "path": relative_path.replace("\\", "/"), # Assurer des chemins Unix-like pour le frontend
                    "children": _get_directory_structure(root_path, item_path, base_projects_dir)
                })
            else:
                structure.append({
                    "name": item,
                    "type": "file",
                    "path": relative_path.replace("\\", "/") # Assurer des chemins Unix-like pour le frontend
                })
        return structure
    except Exception as e:
        # Ne pas propager d'HTTPException ici directement, car c'est une fonction auxiliaire.
        # Le endpoint appelant (list_project_files) gérera l'erreur.
        print(f"Erreur dans _get_directory_structure pour {current_path}: {e}")
        raise e # Relance l'exception pour qu'elle soit gérée plus haut


# --- NOUVEL ENDPOINT POUR LISTER LES FICHIERS ET DOSSIERS D'UN PROJET ---
@app.post("/api/list_project_files")
async def list_project_files(project_info: dict):
    """
    Retourne la structure des fichiers et dossiers d'un projet généré.
    """
    project_path = project_info.get("path")
    if not project_path:
        raise HTTPException(status_code=400, detail="Chemin du projet non fourni.")

    # Assurer que le chemin fourni est bien dans generated_projects
    # current_backend_dir est le répertoire où main.py est exécuté (app_maker_backend)
    current_backend_dir = os.path.dirname(os.path.abspath(__file__))
    base_projects_dir = os.path.abspath(os.path.join(current_backend_dir, "generated_projects"))
    absolute_project_path = os.path.abspath(project_path) # Assurer qu'on travaille avec des chemins absolus normalisés

    if not absolute_project_path.startswith(base_projects_dir):
        raise HTTPException(status_code=403, detail="Accès non autorisé en dehors du répertoire des projets générés.")

    if not os.path.isdir(absolute_project_path):
        raise HTTPException(status_code=404, detail="Dossier de projet non trouvé.")

    try:
        # Appelle la fonction auxiliaire pour obtenir la structure, en passant le base_projects_dir pour la sécurité
        structure = _get_directory_structure(absolute_project_path, absolute_project_path, base_projects_dir)
        return {"project_structure": structure}
    except HTTPException as e:
        # Repropager les HTTPException générées par _get_directory_structure
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur inattendue lors de la liste des fichiers du projet: {e}")


@app.post("/api/run_app")
async def run_app(project_info: dict):
    """
    Lance réellement l'application PySide6 générée dans un processus séparé.
    """
    global global_logs
    global pyside_app_process
    global_logs = [] # Réinitialise les logs pour chaque exécution

    project_path = project_info.get("path")
    if not project_path:
        log_message = "Chemin du projet non fourni pour lancer l'application."
        print(log_message); global_logs.append(log_message)
        raise HTTPException(status_code=400, detail=log_message)

    # Si une application est déjà en cours, la terminer d'abord
    if pyside_app_process and pyside_app_process.poll() is None:
        log_message = "Une application PySide6 est déjà en cours. Tentative de l'arrêter..."
        print(log_message); global_logs.append(log_message)
        pyside_app_process.terminate() # Envoie un signal de terminaison
        try:
            pyside_app_process.wait(timeout=5) # Attend 5 secondes pour qu'elle se termine
            log_message = "Application précédente terminée avec succès."
            print(log_message); global_logs.append(log_message)
        except subprocess.TimeoutExpired:
            pyside_app_process.kill() # Force l'arrêt si elle ne répond pas
            log_message = "Application précédente forcée à quitter."
            print(log_message); global_logs.append(log_message)
        pyside_app_process = None # Réinitialise la variable après l'arrêt

    log_message = f"Lancement de l'application depuis : {project_path}"
    print(log_message); global_logs.append(log_message)

    # Chemin de l'environnement virtuel et de l'exécutable Python
    venv_path = os.path.join(project_path, ".venv")

    # Déterminer le chemin de l'exécutable Python en fonction du système d'exploitation
    if sys.platform == "win32": # Pour Windows, l'exécutable Python est dans Scripts/
        python_executable = os.path.join(venv_path, "Scripts", "python.exe")
    else: # Pour Linux/macOS, l'exécutable Python est dans bin/
        python_executable = os.path.join(venv_path, "bin", "python")

    # Vérifier si l'environnement virtuel existe et le créer si nécessaire
    if not os.path.exists(python_executable):
        log_message = f"Environnement virtuel non trouvé dans {venv_path}. Création..."
        print(log_message); global_logs.append(log_message)
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_path], check=True, capture_output=True, text=True)
            log_message = "Environnement virtuel créé avec succès."
            print(log_message); global_logs.append(log_message)
        except subprocess.CalledProcessError as e:
            error_message = f"Erreur lors de la création de l'environnement virtuel : {e.stderr}"
            print(error_message); global_logs.append(error_message)
            raise HTTPException(status_code=500, detail=error_message)

    # Vérifier si PySide6 est installé et l'installer si nécessaire
    try:
        # Utiliser l'exécutable Python du venv pour vérifier l'installation
        pip_list_process = subprocess.run(
            [python_executable, "-m", "pip", "list"],
            check=True,
            capture_output=True,
            text=True
        )
        if "PySide6" not in pip_list_process.stdout:
            log_message = "PySide6 non trouvé dans l'environnement virtuel. Installation..."
            print(log_message); global_logs.append(log_message)
            subprocess.run(
                [python_executable, "-m", "pip", "install", "PySide6"],
                check=True,
                capture_output=True,
                text=True
            )
            log_message = "PySide6 installé avec succès."
            print(log_message); global_logs.append(log_message)
        else:
            log_message = "PySide6 est déjà installé dans l'environnement virtuel."
            print(log_message); global_logs.append(log_message)
    except subprocess.CalledProcessError as e:
        error_message = f"Erreur lors de la vérification/installation de PySide6 : {e.stderr}"
        print(error_message); global_logs.append(error_message)
        raise HTTPException(status_code=500, detail=error_message)
    except FileNotFoundError:
        error_message = f"L'exécutable Python de l'environnement virtuel est introuvable à : {python_executable}"
        print(error_message); global_logs.append(error_message)
        raise HTTPException(status_code=500, detail=error_message)


    # Lancer l'application PySide6 dans un processus séparé
    # Nous redirigeons la sortie standard et d'erreur vers /dev/null
    # pour éviter que les logs de l'application PySide6 ne polluent le terminal du backend.
    try:
        main_py_full_path = os.path.join(project_path, "main.py")
        if not os.path.exists(main_py_full_path):
            error_message = f"Fichier main.py introuvable à : {main_py_full_path}"
            print(error_message); global_logs.append(error_message)
            raise HTTPException(status_code=404, detail=error_message)

        # Utilisation de subprocess.Popen pour un processus non bloquant
        # et redirection de la sortie
        with open(os.devnull, 'w') as devnull: # Ouvre /dev/null (ou NUL sur Windows)
             pyside_app_process = subprocess.Popen(
                [python_executable, main_py_full_path],
                cwd=project_path, # Le répertoire de travail est le dossier du projet
                stdout=devnull, # Redirige stdout vers /dev/null
                stderr=devnull, # Redirige stderr vers /dev/null
            )
        log_message = "Application PySide6 lancée en arrière-plan."
        print(log_message); global_logs.append(log_message)
    except Exception as e:
        error_message = f"Erreur lors du lancement de l'application PySide6 : {e}"
        print(error_message); global_logs.append(error_message)
        raise HTTPException(status_code=500, detail=error_message)


    global_logs.append("Veuillez fermer la fenêtre de l'application PySide6 manuellement.")
    global_logs.append("Statut de l'application: En cours d'exécution.")

    return {"message": "Application PySide6 lancée avec succès."}

# Nouvel endpoint pour arrêter l'application PySide6 (optionnel, mais utile)
@app.post("/api/stop_app")
async def stop_app():
    global global_logs
    global pyside_app_process
    if pyside_app_process and pyside_app_process.poll() is None:
        log_message = "Arrêt de l'application PySide6..."
        print(log_message); global_logs.append(log_message)
        pyside_app_process.terminate()
        try:
            pyside_app_process.wait(timeout=5)
            log_message = "Application arrêtée avec succès."
            print(log_message); global_logs.append(log_message)
        except subprocess.TimeoutExpired:
            pyside_app_process.kill()
            log_message = "Application forcée à quitter."
            print(log_message); global_logs.append(log_message)
        pyside_app_process = None
        global_logs.append("Statut de l'application: Arrêtée.")
        return {"message": "Application PySide6 arrêtée."}
    else:
        global_logs.append("Aucune application PySide6 n'est en cours d'exécution à arrêter.")
        return {"message": "Aucune application n'est en cours d'exécution.", "status": "no_app_running"}


@app.get("/api/get_logs")
async def get_logs():
    """
    Retourne les logs collectés par le backend pour le frontend.
    """
    global global_logs
    return {"logs": global_logs}