# app_maker_backend/api/projects.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.llm_service import generate_pyside_code
from core.project_manager import create_and_save_project
from core.logging_config import clear_logs, add_log

router = APIRouter(
    prefix="/api",
    tags=["Projects"],
    responses={404: {"description": "Not found"}},
)

class GenerateRequest(BaseModel):
    text: str

@router.post("/generate")
async def generate_app_route(request: GenerateRequest):
    """
    Génère une application PySide6 et enregistre son code.
    (Ce sera la première étape pour la logique de conversation)
    """
    clear_logs() # Réinitialise les logs pour la nouvelle génération
    try:
        generated_code = await generate_pyside_code(request.text)
        project_path, project_name, generated_code_preview = await create_and_save_project(generated_code)
        
        return {
            "message": "Application PySide6 générée avec succès.",
            "project_path": project_path,
            "project_name": project_name, # Utile pour le frontend pour construire le chemin relatif
            "generated_code_preview": generated_code_preview 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération de l'application: {e}")

# NOTE: Pour la future conversation/mise à jour, cet endpoint pourrait évoluer
# pour accepter un project_id ou project_path existant et un historique.
# Par exemple:
# class ProcessPromptRequest(BaseModel):
#     prompt: str
#     project_id: str | None = None
#     current_code: str | None = None # Ou l'historique de la conversation

# @router.post("/process_prompt")
# async def process_prompt_route(request: ProcessPromptRequest):
#     if request.project_id:
#         # Logique de mise à jour: charger le projet, passer au LLM le prompt + ancien code, sauvegarder
#         pass
#     else:
#         # Logique de création de nouveau projet (comme ci-dessus)
#         pass