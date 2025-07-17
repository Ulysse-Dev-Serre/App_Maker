# app_maker_backend/api/runner.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.app_runner import run_pyside_application, stop_pyside_application

router = APIRouter(
    prefix="/api",
    tags=["Runner"],
)

class RunAppRequest(BaseModel):
    path: str # Chemin ABSOLU du dossier projet

@router.post("/run_app")
async def run_app_route(request: RunAppRequest):
    """
    Lance l'application PySide6 générée.
    """
    try:
        await run_pyside_application(request.path)
        return {"message": "Application PySide6 lancée avec succès."}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du lancement de l'application: {e}")

@router.post("/stop_app")
async def stop_app_route():
    """
    Arrête l'application PySide6.
    """
    try:
        stopped = await stop_pyside_application()
        if stopped:
            return {"message": "Application PySide6 arrêtée."}
        else:
            return {"message": "Aucune application n'est en cours d'exécution.", "status": "no_app_running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'arrêt de l'application: {e}")