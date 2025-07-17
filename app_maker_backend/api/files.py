from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from typing import List, Dict

# Imports des nouvelles fonctions du project_manager
from core.project_manager import get_project_files_content, ProjectNotFoundException
from core.logging_config import add_log

router = APIRouter()

# Modèles Pydantic (si nécessaires pour vos requêtes/réponses dans ce fichier)
class FileDetail(BaseModel):
    path: str
    content: str

class ProjectIdRequest(BaseModel):
    project_id: str

# Ancien endpoint pour lister les fichiers, adapté
@router.get("/files/{project_id}", response_model=Dict[str, str], summary="Liste et retourne le contenu de tous les fichiers d'un projet")
async def list_project_files_content(project_id: str):
    """
    Récupère le contenu de tous les fichiers d'un projet spécifique.
    """
    add_log(f"Requête: Liste et contenu des fichiers pour le projet {project_id}")
    try:
        files_content = get_project_files_content(project_id)
        return files_content
    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé lors de la liste des fichiers: {project_id} - {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors de la récupération des fichiers du projet {project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")


# Ancien endpoint pour obtenir le contenu d'un fichier spécifique.
# Cette logique peut être gérée côté frontend en utilisant la réponse de /files/{project_id},
# ou nous pouvons ajouter une fonction spécifique si vraiment nécessaire.
# Pour l'instant, je le commente si vous n'avez pas de fonction équivalente.
# Si vous avez besoin d'un endpoint pour un fichier unique, la logique serait:
# @router.post("/get_file_content", response_model=FileDetail)
# async def get_single_file_content(request: FileRequest): # Vous aurez besoin d'un modèle FileRequest
#     try:
#         # Nous n'avons pas de fonction directe get_file_content_from_path
#         # Il faudrait adapter pour lire un fichier spécifique dans le dossier du projet
#         # Ou bien, le frontend demande tous les fichiers et choisit ensuite.
#         # Exemple (non testé):
#         # project_path = _get_project_path(request.project_id) # Nécessite d'importer _get_project_path
#         # file_path = os.path.join(project_path, request.file_name)
#         # with open(file_path, 'r', encoding='utf-8') as f:
#         #    content = f.read()
#         # return FileDetail(file_name=request.file_name, content=content)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))