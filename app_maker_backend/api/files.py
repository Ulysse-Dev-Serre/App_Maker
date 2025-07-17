# app_maker_backend/api/files.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.project_manager import get_project_files_structure, get_file_content_from_path
from core.config import BASE_PROJECTS_DIR
import os # Pour les opérations de chemin si nécessaire

router = APIRouter(
    prefix="/api",
    tags=["Files"],
)

class PathInfo(BaseModel):
    path: str # Ce chemin est un chemin ABSOLU du dossier projet pour list_project_files
              # ou un chemin RELATIF à generated_projects pour get_file_content

@router.post("/list_project_files")
async def list_project_files_route(project_info: PathInfo):
    """
    Retourne la structure des fichiers et dossiers d'un projet généré.
    Le chemin (path) attendu est le chemin ABSOLU du dossier du projet.
    """
    try:
        # La validation de sécurité est maintenant dans get_project_files_structure
        structure = await get_project_files_structure(project_info.path)
        return {"project_structure": structure}
    except HTTPException as e:
        raise e # Repropager les HTTPExceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la liste des fichiers: {e}")


@router.post("/get_file_content")
async def get_file_content_route(file_info: PathInfo):
    """
    Récupère le contenu d'un fichier spécifié par son chemin.
    Le chemin (path) attendu est le chemin RELATIF au dossier 'generated_projects'.
    Ex: 'pyside_app_1752717932/main.py'
    """
    try:
        content = await get_file_content_from_path(file_info.path)
        return {"content": content}
    except HTTPException as e:
        raise e # Repropager les HTTPExceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du contenu: {e}")