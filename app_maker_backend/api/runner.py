# app_maker_backend/api/runner.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from core.app_runner import run_pyside_application, stop_pyside_application
from core.logging_config import add_log
from core.project_manager import ProjectNotFoundException, _get_project_path

router = APIRouter()

class RunProjectRequest(BaseModel):
    project_id: str


@router.post("/runner/run", summary="Lance une application PySide6 pour un projet donné")
async def run_project(request: RunProjectRequest, background_tasks: BackgroundTasks):
    """
    Lance l’application PySide6 associée au projet spécifié.
    Le fichier d’entrée est automatiquement détecté via # ENTRYPOINT, main.py, run.py ou premier .py trouvé.
    """
    add_log(f"Requête : lancement de l’application pour le projet {request.project_id}")
    try:
        project_path = _get_project_path(request.project_id)
        background_tasks.add_task(run_pyside_application, project_path)
        return {"message": f"Application PySide6 pour le projet {request.project_id} lancée en arrière-plan."}
    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé : {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors du lancement : {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur : {e}")


@router.post("/runner/stop", summary="Arrête l’application PySide6 en cours d’exécution")
async def stop_project():
    """
    Arrête l’application PySide6 actuellement exécutée.
    """
    add_log("Requête : arrêt de l’application PySide6.")
    try:
        await stop_pyside_application()
        return {"message": "Application PySide6 arrêtée."}
    except Exception as e:
        add_log(f"Erreur lors de l’arrêt : {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur : {e}")