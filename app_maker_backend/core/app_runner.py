# app_maker_backend/core/app_runner.py
import os
import subprocess
import sys
import asyncio
import json
import re
from datetime import datetime
from fastapi import HTTPException
from core.logging_config import add_log
from core.project_manager import save_project_problem, clear_project_problem
import glob

# Variable globale pour stocker le processus de l'application PySide6
pyside_app_process = None


def _detect_entrypoint(project_path: str) -> str:
    """
    Renvoie le chemin absolu du fichier d’entrée détecté.
    Priorité :
    1. fichier contenant '# ENTRYPOINT'
    2. main.py
    3. run.py
    4. premier .py trouvé
    """
    candidates = glob.glob(os.path.join(project_path, "*.py"))
    if not candidates:
        raise FileNotFoundError("Aucun fichier .py trouvé.")

    # 1) Marqueur
    for pyfile in candidates:
        with open(pyfile, encoding="utf-8") as f:
            first_line = f.readline().strip()
            if first_line == "# ENTRYPOINT":
                return pyfile

    # 2) Convention
    for name in ("main.py", "run.py"):
        path = os.path.join(project_path, name)
        if os.path.exists(path):
            return path

    # 3) Premier .py disponible
    return candidates[0]


async def run_pyside_application(project_path_absolute: str):
    """
    Lance l'application PySide6 générée dans un processus séparé.
    Capture stdout et stderr pour détecter les erreurs et les enregistrer dans problem.json.
    """
    global pyside_app_process

    # Arrêt propre d’un éventuel processus déjà en cours
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

    project_id = os.path.basename(project_path_absolute)
    clear_project_problem(project_id)
    add_log(f"Problème précédent effacé pour le projet {project_id}.", level="INFO")

    venv_path = os.path.join(project_path_absolute, ".venv")

    # Détection du point d’entrée
    try:
        entry_file = _detect_entrypoint(project_path_absolute)
    except FileNotFoundError as e:
        error_message = str(e)
        add_log(error_message, level="ERROR")
        save_project_problem(project_id, {"type": "no_entrypoint", "message": error_message})
        raise HTTPException(status_code=404, detail=error_message)

    if sys.platform == "win32":
        python_executable = os.path.join(venv_path, "Scripts", "python.exe")
    else:
        python_executable = os.path.join(venv_path, "bin", "python")

    # Création venv si besoin
    if not os.path.exists(python_executable):
        add_log(f"Environnement virtuel non trouvé dans {venv_path}. Création...", level="INFO")
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_path], check=True)
            add_log("Environnement virtuel créé avec succès.", level="INFO")
        except subprocess.CalledProcessError as e:
            error_message = f"Erreur lors de la création de l'environnement virtuel : {e}"
            add_log(error_message, level="ERROR")
            save_project_problem(project_id, {"type": "venv_creation_error", "message": error_message, "details": str(e)})
            raise HTTPException(status_code=500, detail=error_message)

    # Vérification / installation PySide6
    try:
        subprocess.run([python_executable, "-c", "import PySide6"], check=True, capture_output=True, text=True)
        add_log("PySide6 est déjà installé dans l'environnement virtuel.", level="INFO")
    except subprocess.CalledProcessError:
        add_log("PySide6 non trouvé dans l'environnement virtuel. Installation...", level="INFO")
        pip_executable = os.path.join(venv_path, "bin", "pip") if sys.platform != "win32" else os.path.join(venv_path, "Scripts", "pip.exe")
        try:
            subprocess.run([pip_executable, "install", "PySide6"], check=True, capture_output=True, text=True)
            add_log("PySide6 installé avec succès.", level="INFO")
        except subprocess.CalledProcessError as e:
            error_message = f"Erreur lors de l'installation de PySide6 : {e.stderr}"
            add_log(error_message, level="ERROR")
            save_project_problem(project_id, {"type": "pyside6_install_error", "message": error_message, "details": e.stderr})
            raise HTTPException(status_code=500, detail=error_message)

    # Installation requirements.txt
    requirements_file_path = os.path.join(project_path_absolute, "requirements.txt")
    if os.path.exists(requirements_file_path):
        add_log("Fichier requirements.txt trouvé. Installation des dépendances...", level="INFO")
        pip_executable = os.path.join(venv_path, "bin", "pip") if sys.platform != "win32" else os.path.join(venv_path, "Scripts", "pip.exe")
        try:
            subprocess.run([pip_executable, "install", "-r", requirements_file_path], check=True, capture_output=True, text=True)
            add_log("Dépendances installées avec succès.", level="INFO")
        except subprocess.CalledProcessError as e:
            error_message = f"Erreur lors de l'installation des dépendances : {e.stderr}"
            add_log(error_message, level="ERROR")
            save_project_problem(project_id, {"type": "requirements_install_error", "message": error_message, "details": e.stderr})
            raise HTTPException(status_code=500, detail=error_message)

    # Lancement effectif
    command = [python_executable, entry_file]
    add_log(f"Commande d'exécution : {' '.join(command)}", level="INFO")

    try:
        pyside_app_process = subprocess.Popen(
            command,
            cwd=project_path_absolute,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        add_log(f"Application PySide6 lancée. PID : {pyside_app_process.pid}", level="INFO")
    except Exception as e:
        error_message = f"Erreur lors du lancement : {e}"
        add_log(error_message, level="ERROR")
        save_project_problem(project_id, {"type": "launch_error", "message": error_message, "details": str(e)})
        raise HTTPException(status_code=500, detail=error_message)

    # Lecture asynchrone des logs
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

    asyncio.create_task(read_stream(pyside_app_process.stdout, full_stdout_output, "info"))
    asyncio.create_task(read_stream(pyside_app_process.stderr, full_stderr_output, "error"))

    await asyncio.sleep(2)  # captures rapides

    if pyside_app_process.poll() is not None and pyside_app_process.returncode != 0:
        error_message = f"Erreur au démarrage (code {pyside_app_process.returncode})"
        stderr_content = "".join(full_stderr_output)
        save_project_problem(project_id, {
            "type": "runtime_error",
            "message": error_message,
            "details": stderr_content,
            "timestamp": datetime.now().isoformat()
        })
        add_log(error_message, level="ERROR")


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
    else:
        add_log("Aucune application PySide6 n'était en cours d'exécution.", level="INFO")