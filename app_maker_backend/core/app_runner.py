# app_maker_backend/core/app_runner.py
import os
import subprocess
import sys
import asyncio
from fastapi import HTTPException
from core.logging_config import add_log

# Variable globale pour stocker le processus de l'application PySide6
pyside_app_process = None

async def run_pyside_application(project_path_absolute: str):
    """
    Lance l'application PySide6 générée dans un processus séparé.
    """
    global pyside_app_process
    
    # Si une application est déjà en cours, la terminer d'abord
    if pyside_app_process and pyside_app_process.poll() is None:
        add_log("Une application PySide6 est déjà en cours. Tentative de l'arrêter...")
        pyside_app_process.terminate()
        try:
            pyside_app_process.wait(timeout=5)
            add_log("Application précédente terminée avec succès.")
        except subprocess.TimeoutExpired:
            pyside_app_process.kill()
            add_log("Application précédente forcée à quitter.")
        pyside_app_process = None

    add_log(f"Lancement de l'application depuis : {project_path_absolute}")

    venv_path = os.path.join(project_path_absolute, ".venv")

    if sys.platform == "win32":
        python_executable = os.path.join(venv_path, "Scripts", "python.exe")
    else:
        python_executable = os.path.join(venv_path, "bin", "python")

    if not os.path.exists(python_executable):
        add_log(f"Environnement virtuel non trouvé dans {venv_path}. Création...")
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_path], check=True, capture_output=True, text=True)
            add_log("Environnement virtuel créé avec succès.")
        except subprocess.CalledProcessError as e:
            error_message = f"Erreur lors de la création de l'environnement virtuel : {e.stderr}"
            add_log(error_message)
            raise HTTPException(status_code=500, detail=error_message)

    try:
        pip_list_process = subprocess.run(
            [python_executable, "-m", "pip", "list"],
            check=True,
            capture_output=True,
            text=True
        )
        if "PySide6" not in pip_list_process.stdout:
            add_log("PySide6 non trouvé dans l'environnement virtuel. Installation...")
            subprocess.run(
                [python_executable, "-m", "pip", "install", "PySide6"],
                check=True,
                capture_output=True,
                text=True
            )
            add_log("PySide6 installé avec succès.")
        else:
            add_log("PySide6 est déjà installé dans l'environnement virtuel.")
    except subprocess.CalledProcessError as e:
        error_message = f"Erreur lors de la vérification/installation de PySide6 : {e.stderr}"
        add_log(error_message)
        raise HTTPException(status_code=500, detail=error_message)
    except FileNotFoundError:
        error_message = f"L'exécutable Python de l'environnement virtuel est introuvable à : {python_executable}"
        add_log(error_message)
        raise HTTPException(status_code=500, detail=error_message)

    try:
        main_py_full_path = os.path.join(project_path_absolute, "main.py")
        if not os.path.exists(main_py_full_path):
            error_message = f"Fichier main.py introuvable à : {main_py_full_path}"
            add_log(error_message)
            raise HTTPException(status_code=404, detail=error_message)

        with open(os.devnull, 'w') as devnull:
             pyside_app_process = subprocess.Popen(
                [python_executable, main_py_full_path],
                cwd=project_path_absolute,
                stdout=devnull,
                stderr=devnull,
            )
        add_log("Application PySide6 lancée en arrière-plan.")
        add_log("Veuillez fermer la fenêtre de l'application PySide6 manuellement.")
        add_log("Statut de l'application: En cours d'exécution.")
    except Exception as e:
        error_message = f"Erreur lors du lancement de l'application PySide6 : {e}"
        add_log(error_message)
        raise HTTPException(status_code=500, detail=error_message)

async def stop_pyside_application():
    """
    Arrête le processus de l'application PySide6 si elle est en cours d'exécution.
    """
    global pyside_app_process
    if pyside_app_process and pyside_app_process.poll() is None:
        add_log("Arrêt de l'application PySide6...")
        pyside_app_process.terminate()
        try:
            pyside_app_process.wait(timeout=5)
            add_log("Application arrêtée avec succès.")
        except subprocess.TimeoutExpired:
            pyside_app_process.kill()
            add_log("Application forcée à quitter.")
        pyside_app_process = None
        add_log("Statut de l'application: Arrêtée.")
        return True
    else:
        add_log("Aucune application PySide6 n'est en cours d'exécution à arrêter.")
        return False