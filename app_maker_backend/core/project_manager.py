import os
import shutil
import json
import uuid # Pour générer des identifiants uniques
from typing import Dict, Any, List

from core.config import BASE_PROJECTS_DIR
from core.logging_config import add_log

# Assurez-vous que le répertoire de base des projets existe
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
    os.makedirs(project_path, exist_ok=True)
    add_log(f"Création d'un nouveau projet: {project_id} dans {project_path}")

    # Sauvegarder les fichiers
    for file_name, content in files_content.items():
        file_path = os.path.join(project_path, file_name)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        add_log(f"Fichier sauvegardé: {file_name} pour le projet {project_id}")

    # Initialiser l'historique du projet
    project_history = {
        "prompts": [
            {"type": "user", "content": initial_prompt, "timestamp": os.path.getmtime(project_path)},
            {"type": "llm_response", "content": files_content, "timestamp": os.path.getmtime(project_path)}
        ]
    }
    save_project_history(project_id, project_history)

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

    # Mettre à jour les fichiers
    for file_name, content in new_files_content.items():
        file_path = os.path.join(project_path, file_name)
        # Vous pouvez ajouter une logique pour supprimer les fichiers non présents
        # dans new_files_content si nécessaire, mais attention aux side-effects.
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        add_log(f"Fichier mis à jour: {file_name} pour le projet {project_id}")

    # Mettre à jour l'historique si des informations sont fournies
    if prompt or llm_response:
        history = get_project_history(project_id)
        if prompt:
            history["prompts"].append({"type": "user", "content": prompt, "timestamp": os.path.getmtime(project_path)})
        if llm_response:
            history["prompts"].append({"type": "llm_response", "content": llm_response, "timestamp": os.path.getmtime(project_path)})
        save_project_history(project_id, history)

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
            if file.endswith(".py"): # Ou d'autres extensions pertinentes
                relative_path = os.path.relpath(os.path.join(root, file), project_path)
                with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                    files_content[relative_path] = f.read()
    add_log(f"Contenu des fichiers du projet {project_id} récupéré.")
    return files_content

def delete_project(project_id: str):
    """Supprime un projet et tous ses fichiers."""
    project_path = _get_project_path(project_id)
    if os.path.exists(project_path):
        shutil.rmtree(project_path)
        add_log(f"Projet {project_id} supprimé.")
    else:
        raise ProjectNotFoundException(f"Projet avec l'ID {project_id} non trouvé.")

def list_all_projects() -> List[Dict[str, Any]]:
    """Liste tous les projets disponibles avec leur ID et potentiellement leur premier prompt."""
    projects_list = []
    for project_id in os.listdir(BASE_PROJECTS_DIR):
        project_path = _get_project_path(project_id)
        if os.path.isdir(project_path):
            try:
                history = get_project_history(project_id)
                # Trouver le premier prompt utilisateur pour un nom de projet
                first_prompt = "Nouveau projet"
                for entry in history.get("prompts", []):
                    if entry.get("type") == "user" and entry.get("content"):
                        first_prompt = entry["content"].splitlines()[0][:50] # Prend les 50 premiers caractères
                        if len(entry["content"].splitlines()[0]) > 50:
                            first_prompt += "..."
                        break
                projects_list.append({"project_id": project_id, "name": first_prompt})
            except FileNotFoundError:
                add_log(f"Historique du projet {project_id} introuvable, ajout avec un nom par défaut.")
                projects_list.append({"project_id": project_id, "name": "Projet sans historique"})
            except json.JSONDecodeError:
                add_log(f"Erreur de lecture de l'historique du projet {project_id}, ajout avec un nom par défaut.")
                projects_list.append({"project_id": project_id, "name": "Projet avec historique corrompu"})
    return projects_list

# --- Fonctions de gestion de l'historique ---

def _get_history_file_path(project_id: str) -> str:
    """Retourne le chemin complet du fichier d'historique d'un projet."""
    return os.path.join(_get_project_path(project_id), "history.json")

def save_project_history(project_id: str, history: Dict[str, Any]):
    """Sauvegarde l'historique d'un projet dans un fichier JSON."""
    history_path = _get_history_file_path(project_id)
    try:
        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=4, ensure_ascii=False)
        add_log(f"Historique du projet {project_id} sauvegardé.")
    except Exception as e:
        add_log(f"Erreur lors de la sauvegarde de l'historique pour {project_id}: {e}", level="ERROR")


def get_project_history(project_id: str) -> Dict[str, Any]:
    """Charge l'historique d'un projet depuis un fichier JSON."""
    history_path = _get_history_file_path(project_id)
    if not os.path.exists(history_path):
        # Créer un historique vide si non trouvé
        add_log(f"Historique pour le projet {project_id} non trouvé, création d'un nouveau.")
        return {"prompts": []}
    try:
        with open(history_path, "r", encoding="utf-8") as f:
            history = json.load(f)
        add_log(f"Historique du projet {project_id} chargé.")
        return history
    except json.JSONDecodeError as e:
        add_log(f"Erreur de décodage JSON pour l'historique du projet {project_id}: {e}", level="ERROR")
        # Gérer le cas d'un fichier corrompu en retournant un historique vide ou en levant une exception
        raise # Remplacer par une gestion plus robuste si nécessaire
    except Exception as e:
        add_log(f"Erreur inattendue lors du chargement de l'historique pour {project_id}: {e}", level="ERROR")
        raise