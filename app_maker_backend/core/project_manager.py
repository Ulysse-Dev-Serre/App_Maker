import os
import shutil
import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from core.config import BASE_PROJECTS_DIR
from core.logging_config import add_log

os.makedirs(BASE_PROJECTS_DIR, exist_ok=True)

class ProjectNotFoundException(Exception):
    """Exception levée quand un projet n'est pas trouvé."""
    pass

# --- Fonctions de gestion des projets ---

def _get_project_path(project_id: str) -> str:
    """Retourne le chemin complet du répertoire d'un projet."""
    return os.path.join(BASE_PROJECTS_DIR, project_id)

def create_new_project(initial_prompt: str, files_content: Dict[str, str]) -> str:
    """
    Crée un nouveau répertoire de projet avec un ID unique,
    sauvegarde les fichiers initiaux et l'historique du prompt.
    Retourne l'ID du nouveau projet.
    """
    project_id = str(uuid.uuid4())
    project_path = _get_project_path(project_id)
    os.makedirs(project_path, exist_ok=True) # Crée le répertoire principal du projet
    add_log(f"Création d'un nouveau projet: {project_id} dans {project_path}")

    for file_name, content in files_content.items():
        file_path = os.path.join(project_path, file_name)
        
        # Crée tous les répertoires parents si ils n'existent pas
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        add_log(f"Fichier sauvegardé: {file_name} pour le projet {project_id}")

    default_project_name = initial_prompt.splitlines()[0][:50]
    if len(initial_prompt.splitlines()[0]) > 50:
        default_project_name += "..."

    project_history = {
        "project_name": default_project_name,
        "prompts": [
            {"type": "user", "content": initial_prompt, "timestamp": datetime.now().isoformat()},
            {"type": "llm_response", "content": files_content, "timestamp": datetime.now().isoformat()}
        ]
    }
    save_project_history(project_id, project_history)
    clear_project_problem(project_id)

    return project_id

def update_project_files(project_id: str, new_files_content: Dict[str, str], prompt: str = None, llm_response: Dict[str, str] = None):
    """
    Met à jour les fichiers d'un projet existant.
    Si un prompt et une réponse LLM sont fournis, ils sont ajoutés à l'historique.
    """
    project_path = _get_project_path(project_id)
    if not os.path.exists(project_path):
        raise ProjectNotFoundException(f"Projet avec l'ID {project_id} non trouvé.")
    add_log(f"Mise à jour du projet: {project_id}")

    for file_name, content in new_files_content.items():
        file_path = os.path.join(project_path, file_name)
        # Crée tous les répertoires parents si ils n'existent pas
        os.makedirs(os.path.dirname(file_path), exist_ok=True) # Assure que les sous-dossiers existent
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        add_log(f"Fichier mis à jour: {file_name} pour le projet {project_id}")

    if prompt or llm_response:
        history = get_project_history(project_id)
        if prompt:
            history["prompts"].append({"type": "user", "content": prompt, "timestamp": datetime.now().isoformat()})
        if llm_response:
            history["prompts"].append({"type": "llm_response", "content": llm_response, "timestamp": datetime.now().isoformat()})
        save_project_history(project_id, history)
    
    clear_project_problem(project_id)

def get_project_files_content(project_id: str) -> Dict[str, str]:
    """
    Récupère le contenu de tous les fichiers Python (.py) d'un projet.
    Utile pour fournir le contexte au LLM.
    """
    project_path = _get_project_path(project_id)
    if not os.path.exists(project_path):
        raise ProjectNotFoundException(f"Projet avec l'ID {project_id} non trouvé.")

    files_content = {}
    for root, _, files in os.walk(project_path):
        for file in files:
            relative_path = os.path.relpath(os.path.join(root, file), project_path)
            
            if ".venv" in relative_path or "history.json" in relative_path or "__pycache__" in relative_path or "app_run.log" in relative_path or "problem.json" in relative_path:
                continue

            try:
                with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                    files_content[relative_path] = f.read()
            except Exception as e:
                add_log(f"Erreur de lecture du fichier {relative_path} pour le projet {project_id}: {e}", level="WARNING")
    add_log(f"Contenu des fichiers du projet {project_id} récupéré.", level="INFO")
    return files_content

def delete_project(project_id: str):
    """Supprime un projet et tous ses fichiers."""
    project_path = _get_project_path(project_id)
    if os.path.exists(project_path):
        shutil.rmtree(project_path)
        add_log(f"Projet {project_id} supprimé.", level="INFO")
    else:
        raise ProjectNotFoundException(f"Projet avec l'ID {project_id} non trouvé.")

def list_all_projects() -> List[Dict[str, Any]]:
    """
    Liste tous les projets disponibles avec leur ID et leur nom.
    Gère les cas où l'historique est manquant ou corrompu.
    """
    projects_list = []
    for project_id in os.listdir(BASE_PROJECTS_DIR):
        project_path = _get_project_path(project_id)
        if os.path.isdir(project_path):
            try:
                history = get_project_history(project_id)
                project_name = history.get("project_name", "Projet sans nom")
                projects_list.append({"project_id": project_id, "name": project_name})
            except (ProjectNotFoundException, json.JSONDecodeError) as e:
                # Si l'historique est manquant ou corrompu, on ajoute quand même le projet
                # avec un nom par défaut et on log un avertissement.
                add_log(f"Historique du projet {project_id} introuvable ou corrompu ({e}), ajout avec un nom par défaut.", level="WARNING")
                projects_list.append({"project_id": project_id, "name": f"Projet Corrompu ({project_id[:8]})"})
            except Exception as e:
                # Gérer toute autre exception inattendue lors du chargement de l'historique
                add_log(f"Erreur inattendue lors du chargement de l'historique pour le projet {project_id}: {e}", level="ERROR")
                projects_list.append({"project_id": project_id, "name": f"Projet Erreur ({project_id[:8]})"})
    return projects_list

def rename_project(project_id: str, new_name: str):
    """Renomme un projet en mettant à jour son nom dans le fichier d'historique."""
    add_log(f"Requête: Renommage du projet {project_id} en '{new_name}'.", level="INFO")
    history = get_project_history(project_id)
    history["project_name"] = new_name
    save_project_history(project_id, history)
    add_log(f"Projet {project_id} renommé avec succès en '{new_name}'.", level="INFO")

# --- Fonctions de gestion de l'historique ---

def _get_history_file_path(project_id: str) -> str:
    """Retourne le chemin complet du fichier d'historique d'un projet."""
    return os.path.join(_get_project_path(project_id), "history.json")

def save_project_history(project_id: str, history: Dict[str, Any]):
    """Sauvegarde l'historique d'un projet dans un fichier JSON."""
    history_path = _get_history_file_path(project_id)
    try:
        # Assurer que le répertoire existe avant de sauvegarder l'historique
        os.makedirs(os.path.dirname(history_path), exist_ok=True) 
        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=4, ensure_ascii=False)
        add_log(f"Historique du projet {project_id} sauvegardé.", level="INFO")
    except Exception as e:
        add_log(f"Erreur lors de la sauvegarde de l'historique pour {project_id}: {e}", level="ERROR")


def get_project_history(project_id: str) -> Dict[str, Any]:
    """Charge l'historique d'un projet depuis un fichier JSON."""
    history_path = _get_history_file_path(project_id)
    if not os.path.exists(history_path):
        raise ProjectNotFoundException(f"Historique pour le projet {project_id} non trouvé à {history_path}.")
    try:
        with open(history_path, "r", encoding="utf-8") as f:
            history = json.load(f)
        add_log(f"Historique du projet {project_id} chargé.", level="INFO")
        return history
    except json.JSONDecodeError as e:
        add_log(f"Erreur de décodage JSON pour l'historique du projet {project_id}: {e}. Le fichier sera considéré comme vide.", level="ERROR")
        raise json.JSONDecodeError(f"Fichier history.json corrompu pour le projet {project_id}: {e}", doc=e.doc, pos=e.pos)
    except Exception as e:
        add_log(f"Erreur inattendue lors du chargement de l'historique pour {project_id}: {e}", level="ERROR")
        raise

# --- NOUVELLES FONCTIONS DE GESTION DES PROBLÈMES ---

def _get_problem_file_path(project_id: str) -> str:
    """Retourne le chemin complet du fichier problem.json d'un projet."""
    return os.path.join(_get_project_path(project_id), "problem.json")

def save_project_problem(project_id: str, problem_data: Dict[str, Any]):
    """Sauvegarde les données d'un problème pour un projet dans problem.json."""
    problem_path = _get_problem_file_path(project_id)
    try:
        # Assurer que le répertoire existe avant de sauvegarder le problème
        os.makedirs(os.path.dirname(problem_path), exist_ok=True)
        with open(problem_path, "w", encoding="utf-8") as f:
            json.dump(problem_data, f, indent=4, ensure_ascii=False)
        add_log(f"Problème enregistré pour le projet {project_id}.", level="INFO")
    except Exception as e:
        add_log(f"Erreur lors de la sauvegarde du problème pour {project_id}: {e}", level="ERROR")

def get_project_problem(project_id: str) -> Optional[Dict[str, Any]]:
    """Charge les données d'un problème pour un projet depuis problem.json."""
    problem_path = _get_problem_file_path(project_id)
    if not os.path.exists(problem_path):
        return None # Pas de problème enregistré
    try:
        with open(problem_path, "r", encoding="utf-8") as f:
            problem = json.load(f)
        add_log(f"Problème chargé pour le projet {project_id}.", level="INFO")
        return problem
    except json.JSONDecodeError as e:
        add_log(f"Erreur de décodage JSON pour problem.json du projet {project_id}: {e}. Le fichier sera considéré comme vide.", level="ERROR")
        clear_project_problem(project_id) # Effacer le fichier corrompu
        return None
    except Exception as e:
        add_log(f"Erreur inattendue lors du chargement de problem.json pour {project_id}: {e}", level="ERROR")
        return None

def clear_project_problem(project_id: str):
    """Supprime le fichier problem.json pour un projet."""
    problem_path = _get_problem_file_path(project_id)
    if os.path.exists(problem_path):
        try:
            os.remove(problem_path)
            add_log(f"Fichier problem.json effacé pour le projet {project_id}.", level="INFO")
        except Exception as e:
            add_log(f"Erreur lors de l'effacement de problem.json pour {project_id}: {e}", level="ERROR")