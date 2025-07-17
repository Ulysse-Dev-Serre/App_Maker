# app_maker_backend/api/runner.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import asyncio
import os
import sys
import subprocess
import threading

# Assurez-vous que ces imports sont corrects pour vos fonctions d'exécution
from core.app_runner import run_pyside_application, stop_pyside_application
from core.logging_config import add_log
from core.project_manager import get_project_files_content, ProjectNotFoundException, _get_project_path # Ajout de _get_project_path

router = APIRouter()

class RunProjectRequest(BaseModel):
    project_id: str

@router.post("/runner/run", summary="Lance une application PySide6 pour un projet donné")
async def run_project(request: RunProjectRequest, background_tasks: BackgroundTasks):
    """
    Lance le fichier `main.py` d'un projet PySide6 donné.
    """
    add_log(f"Requête: Lancement de l'application pour le projet {request.project_id}")
    try:
        # Récupérer le chemin du projet
        project_path = _get_project_path(request.project_id) # Utiliser la fonction interne pour le chemin

        if not os.path.exists(os.path.join(project_path, "main.py")):
            raise HTTPException(status_code=404, detail=f"main.py non trouvé pour le projet {request.project_id}")

        # Exécuter l'application en arrière-plan
        background_tasks.add_task(run_pyside_application, project_path)
        return {"message": f"Application PySide6 pour le projet {request.project_id} lancée en arrière-plan."}
    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé lors du lancement: {request.project_id} - {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors du lancement de l'application pour le projet {request.project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")

@router.post("/runner/stop", summary="Arrête l'application PySide6 en cours d'exécution")
async def stop_project():
    """
    Arrête l'application PySide6 actuellement exécutée.
    """
    add_log("Requête: Arrêt de l'application PySide6.")
    try:
        stop_pyside_application()
        return {"message": "Application PySide6 arrêtée."}
    except Exception as e:
        add_log(f"Erreur lors de l'arrêt de l'application: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")