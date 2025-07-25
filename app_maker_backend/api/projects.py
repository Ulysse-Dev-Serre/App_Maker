from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import shutil
from typing import Dict, List, Optional, Any

# Imports absolus
from core.llm_service import generate_pyside_code
from core.project_manager import (
    create_new_project,
    update_project_files,
    get_project_files_content,
    delete_project,
    list_all_projects,
    rename_project,
    get_project_problem,
    get_project_history, # AJOUTER CET IMPORT
    ProjectNotFoundException,
    _get_project_path
)
from core.logging_config import add_log
from core.config import GEMINI_MODELS, OPENAI_MODELS, DEEPSEEK_MODELS, KIMI_MODELS

router = APIRouter()

# Modèles Pydantic pour la validation des requêtes
class GenerateProjectRequest(BaseModel):
    prompt: str
    llm_provider: str = "gemini"
    model_name: str = "gemini-1.5-pro"

class UpdateProjectRequest(BaseModel):
    prompt: str
    llm_provider: str = "gemini"
    model_name: str = "gemini-1.5-pro"

class RenameProjectRequest(BaseModel):
    new_name: str

class FileContent(BaseModel):
    file_name: str
    content: str

class ProjectInfo(BaseModel):
    project_id: str
    name: str

class ProjectFilesResponse(BaseModel):
    project_id: str
    files: Dict[str, str]

class ProblemStatusResponse(BaseModel):
    problem: Optional[Dict[str, Any]]

# NOUVEAU : Modèle pour la réponse de l'historique du projet
class ProjectHistoryResponse(BaseModel):
    history: Dict[str, Any] # L'historique est un dictionnaire

@router.post("/projects/", response_model=ProjectFilesResponse, summary="Crée un nouveau projet PySide6 basé sur un prompt initial")
async def create_project(request: GenerateProjectRequest):
    """
    Crée un tout nouveau projet PySide6. Le LLM génère le code initial
    qui est sauvegardé sous un nouvel ID de projet unique.
    """
    add_log(f"Requête: Création d'un nouveau projet avec prompt: {request.prompt[:100]}... utilisant {request.llm_provider}/{request.model_name}")
    try:
        initial_generated_files = await generate_pyside_code(
            request.prompt,
            current_files_context={},
            llm_provider=request.llm_provider,
            model_name=request.model_name
        )

        if not initial_generated_files:
            raise HTTPException(status_code=500, detail="Le LLM n'a pas généré de fichiers.")

        project_id = create_new_project(request.prompt, initial_generated_files)

        return ProjectFilesResponse(project_id=project_id, files=initial_generated_files)

    except Exception as e:
        add_log(f"Erreur lors de la création du projet: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")

@router.post("/projects/{project_id}/generate", response_model=ProjectFilesResponse, summary="Génère ou met à jour le code d'un projet existant PySide6")
async def generate_code_for_project(project_id: str, request: UpdateProjectRequest):
    """
    Prend un prompt et un ID de projet existant.
    Le LLM reçoit le code actuel du projet comme contexte et génère
    les modifications ou le nouveau code. Les fichiers du projet sont mis à jour.
    """
    add_log(f"Requête: Génération de code pour le projet {project_id} avec prompt: {request.prompt[:100]}... utilisant {request.llm_provider}/{request.model_name}")
    try:
        current_project_files = get_project_files_content(project_id)
        if not current_project_files:
            add_log(f"Aucun fichier trouvé pour le projet {project_id}, le LLM commencera à partir de zéro.", level="WARNING")

        updated_generated_files = await generate_pyside_code(
            request.prompt,
            current_files_context=current_project_files,
            llm_provider=request.llm_provider,
            model_name=request.model_name
        )

        if not updated_generated_files:
            raise HTTPException(status_code=500, detail="Le LLM n'a pas généré de fichiers pour la mise à jour.")

        update_project_files(project_id, updated_generated_files, prompt=request.prompt, llm_response=updated_generated_files)

        final_project_files = get_project_files_content(project_id)
        return ProjectFilesResponse(project_id=project_id, files=final_project_files)

    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé: {project_id} - {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors de la génération de code pour le projet {project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")

@router.get("/projects/", response_model=List[ProjectInfo], summary="Liste tous les projets existants")
async def get_projects():
    """
    Retourne une liste de tous les projets enregistrés, incluant leur ID et un nom.
    """
    add_log("Requête: Liste de tous les projets.")
    try:
        projects = list_all_projects()
        return projects
    except Exception as e:
        add_log(f"Erreur lors de la récupération de la liste des projets: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")

@router.get("/projects/{project_id}/files", response_model=ProjectFilesResponse, summary="Récupère tous les fichiers d'un projet spécifique")
async def get_project_files(project_id: str):
    """
    Retourne le contenu de tous les fichiers Python d'un projet donné par son ID.
    """
    add_log(f"Requête: Récupération des fichiers pour le projet {project_id}.")
    try:
        files_content = get_project_files_content(project_id)
        return ProjectFilesResponse(project_id=project_id, files=files_content)
    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé lors de la récupération des fichiers: {project_id} - {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors de la récupération des fichiers du projet {project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")

@router.get("/projects/{project_id}/problem_status", response_model=ProblemStatusResponse, summary="Récupère l'état du problème pour un projet PySide6")
async def get_project_problem_status(project_id: str):
    """
    Retourne les données du problème (problem.json) pour un projet donné, ou null s'il n'y a pas de problème.
    """
    add_log(f"Requête: Récupération du statut du problème pour le projet {project_id}.")
    try:
        problem_data = get_project_problem(project_id)
        return {"problem": problem_data}
    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé lors de la récupération du statut du problème: {project_id} - {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors de la récupération du statut du problème pour {project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")

# NOUVELLE ROUTE : Récupère l'historique d'un projet
@router.get("/projects/{project_id}/history", response_model=ProjectHistoryResponse, summary="Récupère l'historique des prompts et réponses LLM pour un projet")
async def get_project_history_route(project_id: str):
    """
    Retourne le contenu du fichier history.json pour un projet donné.
    """
    add_log(f"Requête: Récupération de l'historique pour le projet {project_id}.")
    try:
        history_data = get_project_history(project_id) # Appel à la fonction de project_manager
        return {"history": history_data}
    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé lors de la récupération de l'historique: {project_id} - {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors de la récupération de l'historique pour {project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")


# L'ancienne route /run_logs (si tu veux la garder pour d'autres usages, sinon elle peut être supprimée)
@router.get("/projects/{project_id}/run_logs", summary="Récupère les logs bruts d'exécution de l'application PySide6 d'un projet")
async def get_project_run_logs(project_id: str):
    """
    Retourne le contenu du fichier app_run.log pour un projet donné.
    """
    add_log(f"Requête: Récupération des logs d'exécution pour le projet {project_id}.")
    project_path = _get_project_path(project_id)
    run_log_file_path = os.path.join(project_path, "app_run.log")

    if not os.path.exists(run_log_file_path):
        add_log(f"Fichier de log d'exécution non trouvé pour le projet {project_id}.", level="WARNING")
        return {"logs": "Aucun log d'exécution trouvé pour ce projet."}
    
    try:
        with open(run_log_file_path, 'r', encoding='utf-8') as f:
            logs_content = f.read()
        return {"logs": logs_content}
    except Exception as e:
        add_log(f"Erreur lors de la lecture du fichier de log d'exécution pour {project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la lecture des logs d'exécution: {e}")


@router.delete("/projects/{project_id}", status_code=204, summary="Supprime un projet existant")
async def delete_single_project(project_id: str):
    """
    Supprime un projet entier, y compris tous ses fichiers.
    """
    add_log(f"Requête: Suppression du projet {project_id}.")
    try:
        delete_project(project_id)
        return {"message": "Project deleted successfully"}
    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé lors de la suppression: {project_id} - {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors de la suppression du projet {project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")

@router.put("/projects/{project_id}/rename", summary="Renomme un projet existant")
async def rename_single_project(project_id: str, request: RenameProjectRequest):
    """
    Renomme un projet donné par son ID.
    """
    add_log(f"Requête: Renommage du projet {project_id} en '{request.new_name}'.")
    try:
        rename_project(project_id, request.new_name)
        return {"message": f"Project {project_id} renamed to '{request.new_name}' successfully"}
    except ProjectNotFoundException as e:
        add_log(f"Projet non trouvé lors du renommage: {project_id} - {e}", level="WARNING")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        add_log(f"Erreur lors du renommage du projet {project_id}: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")


@router.get("/llm_options", summary="Liste les options de LLM et modèles disponibles")
async def get_llm_options():
    """
    Retourne un dictionnaire des fournisseurs de LLM disponibles et de leurs modèles associés.
    """
    add_log("Requête: Récupération des options de LLM pour le frontend.")
    return {
        "gemini": GEMINI_MODELS,
        "openai": OPENAI_MODELS,
        "deepseek": DEEPSEEK_MODELS,
        "kimi": KIMI_MODELS,          
    }