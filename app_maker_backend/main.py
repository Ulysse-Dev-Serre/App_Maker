# app_maker_backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import subprocess
import asyncio
import time
import sys

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



@app.post("/api/generate")
async def generate_app(prompt: dict):
    """
    Génère une application PySide6 simulée et enregistre son code dans un fichier.
    """
    global global_logs
    global_logs = [] # Réinitialise les logs pour la nouvelle génération

    user_prompt = prompt.get("text", "Pas de prompt fourni.")

    timestamp = int(time.time())
    project_name = f"pyside_app_{timestamp}"
    base_projects_dir = os.path.join(os.getcwd(), "generated_projects")
    
    os.makedirs(base_projects_dir, exist_ok=True)
    
    project_path = os.path.join(base_projects_dir, project_name)
    os.makedirs(project_path, exist_ok=True)

    # Contenu simulé d'une application PySide6 simple.
    fake_pyside_code = f"""
import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout, QLabel

class MyApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Mon Application PySide6 Générée")
        self.setGeometry(100, 100, 400, 200)

        layout = QVBoxLayout()

        self.label = QLabel("Bonjour, voici votre application générée par IA !")
        layout.addWidget(self.label)

        button = QPushButton("Cliquez-moi !")
        button.clicked.connect(self.on_button_click)
        layout.addWidget(button)

        self.setLayout(layout)

    def on_button_click(self):
        self.label.setText("Vous avez cliqué ! Prompt initial: '{user_prompt}'")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MyApp()
    window.show()
    sys.exit(app.exec())
"""
    # Remplace le placeholder du prompt dans le code généré
    fake_pyside_code = fake_pyside_code.replace("{user_prompt}", user_prompt)

    main_py_path = os.path.join(project_path, "main.py")
    with open(main_py_path, "w") as f:
        f.write(fake_pyside_code)

    print(f"Fichier {main_py_path} créé avec le code PySide6 simulé.")
    global_logs.append(f"[Génération] Projet créé dans: {project_path}")
    global_logs.append(f"[Génération] Fichier main.py créé: {main_py_path}")

    return {
        "message": "Fichiers de l'application générés avec succès (simulation).",
        "project_path": project_path, # Chemin absolu du dossier projet
        "main_py_relative_path": os.path.join("generated_projects", project_name, "main.py"), # Chemin relatif pour lecture
        "generated_code_preview": fake_pyside_code # On renvoie le code complet pour l'afficher
    }

@app.post("/api/get_file_content")
async def get_file_content(file_info: dict):
    """
    Lit et retourne le contenu d'un fichier spécifié par son chemin relatif.
    """
    relative_path = file_info.get("path")
    print(f"DEBUG: 1. Chemin relatif reçu: {relative_path}") # Debug print

    if not relative_path:
        print("DEBUG: 1.1. Erreur: Chemin de fichier manquant (None ou vide).") # Debug print
        raise HTTPException(status_code=400, detail="Chemin de fichier manquant.")

    # Obtenir le répertoire du fichier main.py du backend
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.join(current_file_dir, "generated_projects")
    
    # Construction du full_path corrigée :
    # Si relative_path contient déjà 'generated_projects/', on le retire pour éviter le doublon.
    path_to_join = relative_path
    if path_to_join.startswith("generated_projects/"):
        path_to_join = path_to_join.replace("generated_projects/", "", 1) # Supprime seulement la première occurrence
    
    full_path = os.path.abspath(os.path.join(base_dir, path_to_join))
    
    print(f"DEBUG: 2. Répertoire de base calculé: {base_dir}") # Debug print
    print(f"DEBUG: 3. Chemin absolu du fichier tenté: {full_path}") # Debug print

    # Vérification de sécurité 1: S'assurer que le chemin reste dans le répertoire des projets
    if not full_path.startswith(base_dir):
        print(f"DEBUG: 4. Accès au chemin {full_path} non autorisé (ne commence pas par {base_dir}).") # Debug print
        raise HTTPException(status_code=403, detail="Accès au chemin non autorisé.")
    print(f"DEBUG: 4.1. Vérification de sécurité du chemin OK.") # Debug print
    
    # Vérification de sécurité 2: Le fichier existe-t-il et est-ce bien un fichier ?
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        print(f"DEBUG: 5. Fichier introuvable ou n'est pas un fichier. os.path.exists='{os.path.exists(full_path)}', os.path.isfile='{os.path.isfile(full_path)}'") # Debug print
        raise HTTPException(status_code=404, detail="Fichier non trouvé.")
    print(f"DEBUG: 5.1. Fichier trouvé et valide.") # Debug print

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        print(f"DEBUG: 6. Contenu du fichier lu avec succès.") # Debug print
        return {"content": content}
    except Exception as e:
        print(f"DEBUG: 7. Erreur inattendue lors de la lecture du fichier {full_path}: {str(e)}") # Debug print
        raise HTTPException(status_code=500, detail=f"Erreur de lecture du fichier : {str(e)}")

#=========================================================================
@app.post("/api/run_app")
async def run_app(project_info: dict):
    """
    Lance réellement l'application PySide6 générée dans un processus séparé.
    """
    global global_logs
    global pyside_app_process # Déclare que nous allons modifier cette variable globale
    global_logs = [] # Réinitialise les logs pour chaque exécution

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

    project_path = project_info.get("path")
    if not project_path or not os.path.isdir(project_path):
        global_logs.append("Erreur: Chemin du projet invalide ou non trouvé.")
        raise HTTPException(status_code=400, detail="Chemin du projet invalide ou non trouvé.")

    main_py_path = os.path.join(project_path, "main.py")
    if not os.path.exists(main_py_path):
        global_logs.append(f"Erreur: Fichier main.py non trouvé dans {project_path}.")
        raise HTTPException(status_code=404, detail="Fichier main.py non trouvé.")

    # --- ÉTAPES RÉELLES DE LANCEMENT ---

    # 1. Création et activation d'un environnement virtuel propre au projet (si ce n'est pas déjà fait)
    venv_path = os.path.join(project_path, ".venv")
    python_executable = os.path.join(venv_path, "bin", "python") # Pour Linux/macOS

    if sys.platform == "win32": # Pour Windows, l'exécutable Python est dans Scripts/
        python_executable = os.path.join(venv_path, "Scripts", "python.exe")

    if not os.path.exists(python_executable):
        log_message = f"Création de l'environnement virtuel pour le projet dans '{venv_path}'..."
        print(log_message); global_logs.append(log_message)
        try:
            # Exécuter `python -m venv .venv` dans le dossier du projet
            process = await asyncio.create_subprocess_exec(
                sys.executable, "-m", "venv", ".venv",
                cwd=project_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            if process.returncode != 0:
                error_msg = f"Erreur lors de la création de l'environnement virtuel: {stderr.decode()}"
                print(error_msg); global_logs.append(error_msg)
                raise Exception(error_msg)
            log_message = "Environnement virtuel créé avec succès."
            print(log_message); global_logs.append(log_message)
        except Exception as e:
            global_logs.append(f"Échec de la création de l'environnement virtuel: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Échec de la création de l'environnement virtuel: {str(e)}")

    else:
        log_message = f"Environnement virtuel existant détecté dans '{venv_path}'."
        print(log_message); global_logs.append(log_message)

    # 2. Installation de PySide6 dans l'environnement virtuel du projet
    log_message = "Installation de PySide6 dans l'environnement virtuel..."
    print(log_message); global_logs.append(log_message)
    try:
        process = await asyncio.create_subprocess_exec(
            python_executable, "-m", "pip", "install", "PySide6",
            cwd=project_path, # S'assure que pip utilise le venv du projet
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            error_msg = f"Erreur lors de l'installation de PySide6: {stderr.decode()}"
            print(error_msg); global_logs.append(error_msg)
            raise Exception(error_msg)
        log_message = f"PySide6 installé avec succès dans l'environnement virtuel."
        print(log_message); global_logs.append(log_message)
    except Exception as e:
        global_logs.append(f"Échec de l'installation de PySide6: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Échec de l'installation de PySide6: {str(e)}")


    # 3. Lancement de l'application PySide6
    log_message = f"Lancement de l'application PySide6: {main_py_path} via {python_executable}..."
    print(log_message); global_logs.append(log_message)
    try:
        # Utilise Popen pour lancer l'application en arrière-plan et non bloquante
        # stdout et stderr sont redirigés vers DEVNULL pour ne pas polluer les logs du backend
        # Note: l'application PySide6 ouvrira une fenêtre graphique
        pyside_app_process = subprocess.Popen(
            [python_executable, main_py_path],
            cwd=project_path,
            stdout=subprocess.DEVNULL, # Ne pas afficher la sortie de l'app dans le terminal du backend
            stderr=subprocess.DEVNULL, # Ne pas afficher les erreurs de l'app
            # creationflags=subprocess.DETACHED_PROCESS if sys.platform == "win32" else 0, # Pour Windows, détacher le processus
            close_fds=True # Ferme les descripteurs de fichiers pour le processus enfant
        )
        log_message = "Application PySide6 lancée (fenêtre devrait apparaître)."
        print(log_message); global_logs.append(log_message)
        # On ne va pas attendre la fermeture ici, l'utilisateur la fermera manuellement
        # C'est pourquoi nous utilisons Popen et non run/communicate
    except Exception as e:
        global_logs.append(f"Échec du lancement de l'application PySide6: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Échec du lancement de l'application PySide6: {str(e)}")
    
    # On ajoute un log pour indiquer que l'application a été lancée et qu'elle peut être fermée manuellement
    global_logs.append("Application PySide6 lancée. Vous pouvez fermer la fenêtre manuellement.")
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