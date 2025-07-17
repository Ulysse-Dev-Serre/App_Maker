# app_maker_backend/core/project_manager.py
import os
import time
from fastapi import HTTPException
from core.config import BASE_PROJECTS_DIR
from core.logging_config import add_log

# Type pour la structure de fichier/dossier
FileNode = dict

async def create_and_save_project(generated_code: str) -> tuple[str, str, str]:
    """
    Crée un nouveau dossier de projet, enregistre le code et retourne les chemins.
    Returns: (project_path_absolute, project_name, generated_code_preview)
    """
    timestamp = int(time.time())
    project_name = f"pyside_app_{timestamp}"
    
    project_path_absolute = os.path.join(BASE_PROJECTS_DIR, project_name)
    os.makedirs(project_path_absolute, exist_ok=True)

    main_py_path = os.path.join(project_path_absolute, "main.py")

    try:
        with open(main_py_path, "w", encoding="utf-8") as f:
            f.write(generated_code)
        add_log(f"Code écrit dans : {main_py_path}")
    except IOError as e:
        error_message = f"Erreur lors de l'écriture du fichier {main_py_path}: {e}"
        add_log(error_message)
        raise HTTPException(status_code=500, detail=error_message)

    add_log("Génération terminée.")
    return project_path_absolute, project_name, generated_code # Retourne aussi le code pour le preview

def _get_directory_structure_recursive(root_path: str, current_path: str) -> list[FileNode]:
    """
    Fonction auxiliaire récursive pour obtenir la structure d'un répertoire.
    """
    structure = []
    # Assurer la sécurité: le chemin ne doit pas sortir du répertoire de base des projets générés.
    abs_current_path = os.path.abspath(current_path)
    if not abs_current_path.startswith(os.path.abspath(root_path)):
        # Cette condition est déjà gérée au niveau de l'API appelante pour root_path,
        # mais on la garde ici pour les appels récursifs internes.
        add_log(f"ATTENTION (sécurité): Accès non autorisé en dehors du chemin racine du projet pour {current_path}.")
        return [] # Retourne vide pour éviter de lister des éléments non autorisés

    try:
        for item in os.listdir(current_path):
            item_path = os.path.join(current_path, item)
            # Pour le chemin relatif, il faut qu'il soit relatif au root_path du projet actuel
            relative_path = os.path.relpath(item_path, root_path)
            
            # Vérification de sécurité supplémentaire pour les éléments listés
            abs_item_path = os.path.abspath(item_path)
            if not abs_item_path.startswith(os.path.abspath(root_path)):
                add_log(f"ATTENTION: Élément de chemin invalide ou en dehors du root_path: {item_path}")
                continue 

            if os.path.isdir(item_path):
                if item == ".venv" or item == "__pycache__": # Ignorer l'environnement virtuel et le cache Python
                    continue
                structure.append({
                    "name": item,
                    "type": "directory",
                    "path": relative_path.replace("\\", "/"), # Assurer des chemins Unix-like
                    "children": _get_directory_structure_recursive(root_path, item_path)
                })
            else:
                structure.append({
                    "name": item,
                    "type": "file",
                    "path": relative_path.replace("\\", "/")
                })
        return structure
    except Exception as e:
        add_log(f"Erreur dans _get_directory_structure_recursive pour {current_path}: {e}")
        raise # Relance l'exception pour être gérée par l'endpoint appelant

async def get_project_files_structure(project_path_absolute: str) -> list[FileNode]:
    """
    Retourne la structure des fichiers et dossiers d'un projet généré.
    Effectue les vérifications de sécurité nécessaires.
    """
    if not os.path.isdir(project_path_absolute):
        raise HTTPException(status_code=404, detail="Dossier de projet non trouvé.")
    
    # Vérification de sécurité principale
    if not os.path.abspath(project_path_absolute).startswith(os.path.abspath(BASE_PROJECTS_DIR)):
        raise HTTPException(status_code=403, detail="Accès non autorisé en dehors du répertoire des projets générés.")

    try:
        structure = _get_directory_structure_recursive(project_path_absolute, project_path_absolute)
        return structure
    except Exception as e:
        add_log(f"Erreur lors de la récupération de la structure du projet {project_path_absolute}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur inattendue lors de la liste des fichiers du projet: {e}")

async def get_file_content_from_path(file_path_relative_to_generated_projects: str) -> str:
    """
    Récupère le contenu d'un fichier spécifié par son chemin relatif au dossier 'generated_projects'.
    Ex: 'pyside_app_1752717932/main.py'
    """
    if not file_path_relative_to_generated_projects:
        add_log("Erreur: Chemin de fichier manquant (None ou vide) pour get_file_content.")
        raise HTTPException(status_code=400, detail="Chemin du fichier non fourni.")

    # Assurer un chemin absolu sécurisé
    absolute_file_path = os.path.abspath(os.path.join(BASE_PROJECTS_DIR, file_path_relative_to_generated_projects))

    # Vérification de sécurité pour s'assurer que le chemin reste dans BASE_PROJECTS_DIR
    if not absolute_file_path.startswith(os.path.abspath(BASE_PROJECTS_DIR)):
        add_log(f"Accès au chemin {absolute_file_path} non autorisé (ne commence pas par {os.path.abspath(BASE_PROJECTS_DIR)}).")
        raise HTTPException(status_code=403, detail="Accès non autorisé au fichier. Tentative de sortir du répertoire des projets générés.")

    if not os.path.exists(absolute_file_path) or not os.path.isfile(absolute_file_path):
        add_log(f"Fichier introuvable ou n'est pas un fichier: {absolute_file_path}")
        raise HTTPException(status_code=404, detail="Fichier non trouvé ou n'est pas un fichier valide.")

    try:
        with open(absolute_file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return content
    except Exception as e:
        add_log(f"Erreur lors de la lecture du fichier {absolute_file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la lecture du fichier: {e}")