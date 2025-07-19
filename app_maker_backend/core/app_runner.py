# app_maker_backend/core/app_runner.py
import os
import subprocess
import sys
import asyncio
import json
import re # Pour les expressions régulières
from datetime import datetime 
from fastapi import HTTPException
from core.logging_config import add_log
from core.project_manager import save_project_problem, clear_project_problem 

# Variable globale pour stocker le processus de l'application PySide6
pyside_app_process = None

async def run_pyside_application(project_path_absolute: str):
    """
    Lance l'application PySide6 générée dans un processus séparé.
    Capture stdout et stderr pour détecter les erreurs et les enregistrer dans problem.json.
    """
    global pyside_app_process
    
    # Si une application est déjà en cours, la terminer d'abord
    if pyside_app_process and pyside_app_process.poll() is None:
        add_log("Une application PySide6 est déjà en cours. Tentative de l'arrêter...", level="WARNING")
        pyside_app_process.terminate()
        try:
            await asyncio.to_thread(pyside_app_process.wait, timeout=5)
            add_log("Application précédente terminée avec succès.", level="INFO")
        except subprocess.TimeoutExpired:
            pyside_app_process.kill()
            add_log("Application précédente forcée à quitter.", level="WARNING")
        pyside_app_process = None

    # Effacer tout problème précédent avant de relancer l'application
    project_id = os.path.basename(project_path_absolute)
    clear_project_problem(project_id)
    add_log(f"Problème précédent effacé pour le projet {project_id}.", level="INFO")

    add_log(f"Lancement de l'application depuis : {project_path_absolute}", level="INFO")

    venv_path = os.path.join(project_path_absolute, ".venv")
    main_py_full_path = os.path.join(project_path_absolute, "main.py")

    if sys.platform == "win32":
        python_executable = os.path.join(venv_path, "Scripts", "python.exe")
    else:
        python_executable = os.path.join(venv_path, "bin", "python")

    # Vérifications de l'environnement et installation de PySide6 (inchangées)
    if not os.path.exists(python_executable):
        add_log(f"Environnement virtuel non trouvé dans {venv_path}. Création...", level="INFO")
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_path], check=True)
            add_log("Environnement virtuel créé avec succès.", level="INFO")
        except subprocess.CalledProcessError as e:
            error_message = f"Erreur lors de la création de l'environnement virtuel: {e}"
            add_log(error_message, level="ERROR")
            save_project_problem(project_id, {"type": "venv_creation_error", "message": error_message, "details": str(e)})
            raise HTTPException(status_code=500, detail=error_message)

    pyside6_installed = False
    try:
        check_command = [python_executable, "-c", "import PySide6"]
        subprocess.run(check_command, check=True, capture_output=True, text=True)
        pyside6_installed = True
        add_log("PySide6 est déjà installé dans l'environnement virtuel.", level="INFO")
    except subprocess.CalledProcessError:
        add_log("PySide6 non trouvé dans l'environnement virtuel. Installation...", level="INFO")
        try:
            pip_executable = os.path.join(venv_path, "bin", "pip") if sys.platform != "win32" else os.path.join(venv_path, "Scripts", "pip.exe")
            subprocess.run([pip_executable, "install", "PySide6"], check=True, capture_output=True, text=True)
            add_log("PySide6 installé avec succès.", level="INFO")
            pyside6_installed = True
        except subprocess.CalledProcessError as e:
            error_message = f"Erreur lors de l'installation de PySide6: {e.stderr}"
            add_log(error_message, level="ERROR")
            save_project_problem(project_id, {"type": "pyside6_install_error", "message": error_message, "details": e.stderr})
            raise HTTPException(status_code=500, detail=error_message)

    if not pyside6_installed:
        error_message = "PySide6 n'a pas pu être installé ou vérifié."
        add_log(error_message, level="ERROR")
        save_project_problem(project_id, {"type": "pyside6_missing", "message": error_message})
        raise HTTPException(status_code=500, detail=error_message)

    # NOUVELLE SECTION: Vérifier et installer les dépendances de requirements.txt
    requirements_file_path = os.path.join(project_path_absolute, "requirements.txt")
    if os.path.exists(requirements_file_path):
        add_log(f"Fichier requirements.txt trouvé. Installation des dépendances...", level="INFO")
        pip_executable = os.path.join(venv_path, "bin", "pip") if sys.platform != "win32" else os.path.join(venv_path, "Scripts", "pip.exe")
        try:
            install_command = [pip_executable, "install", "-r", requirements_file_path]
            add_log(f"Exécution de la commande : {' '.join(install_command)}", level="INFO")
            subprocess.run(install_command, check=True, capture_output=True, text=True)
            add_log("Dépendances de requirements.txt installées avec succès.", level="INFO")
        except subprocess.CalledProcessError as e:
            error_message = f"Erreur lors de l'installation des dépendances de requirements.txt: {e.stderr}"
            add_log(error_message, level="ERROR")
            save_project_problem(project_id, {"type": "requirements_install_error", "message": error_message, "details": e.stderr})
            raise HTTPException(status_code=500, detail=error_message)
    else:
        add_log("Pas de fichier requirements.txt trouvé. Poursuite sans installation de dépendances supplémentaires.", level="INFO")

    if not os.path.exists(main_py_full_path):
        error_message = f"main.py non trouvé dans le chemin du projet: {main_py_full_path}"
        add_log(error_message, level="ERROR")
        save_project_problem(project_id, {"type": "main_py_missing", "message": error_message})
        raise HTTPException(status_code=404, detail=error_message)

    try:
        command = [python_executable, main_py_full_path]
        add_log(f"Commande d'exécution de l'application : {' '.join(command)}", level="INFO")
        add_log(f"Exécutable Python utilisé : {python_executable}", level="INFO")

        pyside_app_process = subprocess.Popen(
            command,
            cwd=project_path_absolute,
            stdout=subprocess.PIPE, # Capturer la sortie standard
            stderr=subprocess.PIPE, # Capturer la sortie d'erreur
            text=True, # Traiter la sortie comme du texte
            bufsize=1 # Ligne par ligne
        )
        
        add_log(f"Application PySide6 lancée en arrière-plan. PID: {pyside_app_process.pid}", level="INFO")
        add_log("Veuillez fermer la fenêtre de l'application PySide6 manuellement.", level="INFO")
        add_log("Statut de l'application: En cours d'exécution.", level="INFO")

        # Lire les sorties stdout et stderr en arrière-plan et détecter les erreurs
        full_stderr_output = []
        full_stdout_output = []

        async def read_stream(stream, output_list, log_level):
            while True:
                line = await asyncio.to_thread(stream.readline)
                if not line:
                    break
                output_list.append(line)
                add_log(f"App Output ({log_level}): {line.strip()}", level=log_level.upper())
            stream.close()

        # Lancer la lecture des sorties en tant que tâches asyncio
        stdout_task = asyncio.create_task(read_stream(pyside_app_process.stdout, full_stdout_output, "info"))
        stderr_task = asyncio.create_task(read_stream(pyside_app_process.stderr, full_stderr_output, "error"))

        # Attendre que l'application se termine (ou que nous la tuions)
        # Ne pas await pyside_app_process.wait() ici, car cela bloquerait le serveur FastAPI.
        # Le processus sera surveillé par le système ou par la fermeture manuelle de la fenêtre.
        # Nous attendons juste un court instant pour capturer les erreurs de démarrage rapides.
        await asyncio.sleep(2) # Attendre 2 secondes pour les erreurs de démarrage

        # Vérifier si le processus s'est terminé prématurément avec une erreur
        if pyside_app_process.poll() is not None and pyside_app_process.returncode != 0:
            error_message = f"L'application PySide6 s'est terminée avec le code d'erreur {pyside_app_process.returncode}."
            add_log(error_message, level="ERROR")
            
            # Tenter de récupérer les logs d'erreur complets si non vides
            stderr_content = "".join(full_stderr_output)
            stdout_content = "".join(full_stdout_output)

            # Détecter un traceback Python
            if "Traceback (most recent call last):" in stderr_content:
                problem_details = stderr_content
                problem_type = "runtime_error"
                # Extraire le message d'erreur final
                match = re.search(r"(\w+Error: .*)$", stderr_content, re.MULTILINE)
                if match:
                    error_message = match.group(1)
            else:
                problem_details = stderr_content if stderr_content else stdout_content
                problem_type = "unknown_app_error"
                if not problem_details:
                    problem_details = "L'application s'est fermée inopinément sans sortie d'erreur visible."

            save_project_problem(project_id, {
                "type": problem_type,
                "message": error_message,
                "details": problem_details,
                "timestamp": datetime.now().isoformat()
            })
            add_log(f"Problème enregistré pour le projet {project_id}.", level="ERROR")

    except Exception as e:
        error_message = f"Erreur lors du lancement de l'application PySide6 : {e}"
        add_log(error_message, level="ERROR")
        save_project_problem(project_id, {
            "type": "launch_error",
            "message": error_message,
            "details": str(e),
            "timestamp": datetime.now().isoformat()
        })
        raise HTTPException(status_code=500, detail=error_message)

async def stop_pyside_application():
    """
    Arrête le processus de l'application PySide6 si elle est en cours d'exécution.
    """
    global pyside_app_process
    if pyside_app_process and pyside_app_process.poll() is None:
        add_log("Arrêt de l'application PySide6...", level="INFO")
        pyside_app_process.terminate()
        try:
            await asyncio.to_thread(pyside_app_process.wait, timeout=5)
            add_log("Application arrêtée avec succès.", level="INFO")
        except subprocess.TimeoutExpired:
            pyside_app_process.kill()
            add_log("Application forcée à quitter.", level="WARNING")
        pyside_app_process = None
        add_log("Statut de l'application: Arrêtée.", level="INFO")
    else:
        add_log("Aucune application PySide6 n'était en cours d'exécution.", level="INFO")