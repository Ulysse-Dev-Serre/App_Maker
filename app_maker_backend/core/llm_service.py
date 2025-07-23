# app_maker_backend/core/llm_service.py
import os
import json
from fastapi import HTTPException
from dotenv import load_dotenv
from typing import Dict, Any, List
import fnmatch  # Pour la correspondance de patterns de fichiers

from core.logging_config import add_log
# Importer la nouvelle liste d'exclusions
from core.config import (
    GEMINI_API_KEY,
    OPENAI_API_KEY,
    DEEPSEEK_API_KEY,
    KIMI_API_KEY,           # <-- AJOUT
    LLM_CONTEXT_EXCLUSIONS
)

# Initialisation des clients LLM (conditionnelle)
# Assurez-vous d'avoir installé les SDKs nécessaires :
# pip install google-generativeai
# pip install openai

gemini_client_configured = False
try:
    import google.generativeai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_client_configured = True
    else:
        add_log("GEMINI_API_KEY non définie. Gemini sera indisponible.", level="WARNING")
except Exception as e:
    add_log(f"Erreur lors de l'initialisation de Gemini API: {e}. Gemini sera indisponible.", level="ERROR")

openai_client = None
try:
    from openai import OpenAI
    if OPENAI_API_KEY:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
    else:
        add_log("OPENAI_API_KEY non définie. OpenAI sera indisponible.", level="WARNING")
except Exception as e:
    add_log(f"Erreur lors de l'initialisation de OpenAI API: {e}. OpenAI sera indisponible.", level="ERROR")

kimi_client = None  # <-- AJOUT
try:
    from openai import OpenAI as KimiOpenAI  # Ré-utiliser le client OpenAI pour Moonshot
    if KIMI_API_KEY:
        kimi_client = KimiOpenAI(
            api_key=KIMI_API_KEY,
            base_url="https://openrouter.ai/api/v1"
        )
    else:
        add_log("KIMI_API_KEY non définie. Kimi sera indisponible.", level="WARNING")
except Exception as e:
    add_log(f"Erreur lors de l'initialisation de Kimi API: {e}. Kimi sera indisponible.", level="ERROR")

#deepseek_client = None
#try:
#    # Supposons que tu as un SDK DeepSeek ou que tu feras des requêtes directes
#    # from deepseek_api_client import DeepSeekClient
#    # if DEEPSEEK_API_KEY:
#    #    deepseek_client = DeepSeekClient(api_key=DEEPSEEK_API_KEY)
#    # else:
#    #    add_log("DEEPSEEK_API_KEY non définie. DeepSeek sera indisponible.", level="WARNING")
#    pass # Placeholder pour DeepSeek
#except Exception as e:
#    add_log(f"Erreur lors de l'initialisation de DeepSeek API: {e}. DeepSeek sera indisponible.", level="ERROR")


async def generate_pyside_code(
    prompt: str,
    current_files_context: Dict[str, str] = None, # Contexte des fichiers existants
    llm_provider: str = "gemini", # Fournisseur LLM choisi
    model_name: str = "gemini-1.5-pro" # Modèle choisi
) -> Dict[str, str]:
    """
    Génère ou modifie le code PySide6 en fonction du prompt et du contexte de fichiers existants,
    en utilisant le LLM et le modèle spécifiés.
    Retourne un dictionnaire {nom_fichier: contenu_fichier}.
    """
    add_log(f"Génération du code PySide6 avec {llm_provider}/{model_name} pour le prompt : '{prompt[:100]}...'")

    # Instruction système générique pour la génération de code PySide6
    system_instruction = """
    Vous êtes un expert en programmation Python et PySide6. Votre tâche est de générer ou de modifier
    des applications PySide6 en fonction des instructions de l'utilisateur.

    **Instructions de réponse:**
    1.  Vous devez toujours retourner une réponse au format JSON.
    2.  Le JSON doit être une seule clé de niveau supérieur nommée `files`.
    3.  La valeur de `files` doit être un objet (dictionnaire) où les clés sont les noms de fichiers
        (par exemple, `main.py`, `utils.py`, `styles.py`) et les valeurs sont le contenu du fichier sous forme de chaîne de caractères.
    4.  **Important:** Si un fichier n'est pas modifié, vous n'avez PAS besoin de le retourner.
        Si un fichier est supprimé, indiquez-le en retournant `null` comme contenu pour ce fichier.
        Si un nouveau fichier est créé, incluez-le simplement.
    5.  Assurez-vous que le code est complet et fonctionnel pour chaque fichier.
    6.  Incluez toutes les importations nécessaires et le boilerplate pour PySide6.
    7.  Ne pas inclure de texte explicatif ou de markdown en dehors du bloc JSON.
    8.  Utilisez un formatage de code Python propre et idiomatique.
    9.  Soyez concis et ne générez que les fichiers nécessaires.
    10. Si le fichier est le point d’entrée, place **exactement** en première ligne (sans espace ni caractère supplémentaire) :
    # ENTRYPOINT
    11. Pour charger des ressources externes (style.qss, icônes, etc.), utilise **toujours** des chemins relatifs au script :
    with open(os.path.join(os.path.dirname(__file__), "style.qss"), "r", encoding="utf-8") as f:
        app.setStyleSheet(f.read())

    **Exemple de format de réponse (JSON valide):**
    ```json
    {
      "files": {
        "main.py": "import sys\\nfrom PySide6.QtWidgets import QApplication, QWidget, QPushButton\\n\\nclass MyApp(QWidget):\\n    def __init__(self):\\n        super().__init__()\\n        self.setWindowTitle(\"Mon App\")\\n        # ...",
        "utils.py": "def helper_function():\\n    pass"
      }
    }
    ```
    """

    user_prompt_content = f"L'utilisateur demande : '{prompt}'"

    # --- NOUVELLE LOGIQUE DE FILTRAGE DU CONTEXTE AVANT L'ENVOI AU LLM ---
    filtered_context_to_send = {}
    if current_files_context:
        for file_name, content in current_files_context.items():
            should_exclude = False
            for pattern in LLM_CONTEXT_EXCLUSIONS:
                if pattern.endswith('/'): # C'est un dossier (ex: ".venv/")
                    # Vérifier si le chemin du fichier commence par le dossier exclu
                    # ou contient le dossier exclu comme partie d'un chemin (ex: "src/.venv/file.py")
                    if file_name.startswith(pattern) or f"/{pattern}" in file_name:
                        should_exclude = True
                        break
                elif '*' in pattern: # C'est un pattern de wildcard (ex: "*.log")
                    if fnmatch.fnmatch(file_name, pattern):
                        should_exclude = True
                        break
                else: # C'est un nom de fichier exact (ex: "history.json")
                    if file_name == pattern:
                        should_exclude = True
                        break
            
            if not should_exclude:
                filtered_context_to_send[file_name] = content
        
        if not filtered_context_to_send:
            add_log("Contexte LLM: Tous les fichiers ont été exclus ou le contexte était vide après filtrage.", level="WARNING")
        else:
            add_log(f"Contexte LLM filtré: {len(filtered_context_to_send)} fichiers pertinents envoyés.", level="INFO")
            
    # Utiliser filtered_context_to_send pour construire le prompt
    if filtered_context_to_send:
        user_prompt_content += "\n\nVoici le code actuel de l'application (fichiers existants) :\n"
        for file_name, content in filtered_context_to_send.items():
            user_prompt_content += f"\n--- {file_name} ---\n"
            user_prompt_content += content
            user_prompt_content += "\n--- END OF " + file_name + " ---\n"
        user_prompt_content += "\n\nModifiez ces fichiers ou créez-en de nouveaux pour répondre à la demande de l'utilisateur. Retournez SEULEMENT les fichiers modifiés/créés/supprimés dans le format JSON spécifié."
    else:
        user_prompt_content += "\n\nCréez une nouvelle application PySide6 basée sur cette demande. Retournez les fichiers dans le format JSON spécifié."

    # --- FIN LOGIQUE DE FILTRAGE DU CONTEXTE ---


    # Logique conditionnelle pour appeler le bon LLM
    # Logique conditionnelle pour appeler le bon LLM
    if llm_provider == "gemini":
        if not gemini_client_configured:
            raise HTTPException(status_code=500, detail="Gemini API non configurée ou clé manquante.")
        
        model = genai.GenerativeModel(model_name)
        
        messages_gemini = [
            {"role": "user", "parts": [system_instruction + "\n\n" + user_prompt_content]},
        ]
        
        try:
            response = await model.generate_content_async(
                messages_gemini,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json" # Demande explicitement du JSON
                )
            )
            generated_content = response.text
            
            # Supprimer le Markdown JSON si présent
            if generated_content.startswith("```json") and generated_content.endswith("```"):
                generated_content = generated_content[7:-3].strip()

            # Parse la réponse JSON
            parsed_response = json.loads(generated_content)
            generated_files = parsed_response.get("files", {})

        except genai.types.BlockedPromptException as e:
            add_log(f"La requête Gemini LLM a été bloquée : {e}", level="ERROR")
            raise HTTPException(status_code=400, detail=f"La requête a été bloquée par le modèle AI (Gemini) : {e}")
        except Exception as e:
            add_log(f"Erreur lors de l'appel à Gemini LLM: {e}", level="ERROR")
            raise HTTPException(status_code=500, detail=f"Erreur du service LLM (Gemini): {e}")

    elif llm_provider == "openai":
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenAI API non configurée ou clé manquante.")

        messages_openai = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt_content}
        ]

        try:
            response = openai_client.chat.completions.create(
                model=model_name,
                messages=messages_openai,
                response_format={ "type": "json_object" } # Demande explicitement du JSON
            )
            generated_content = response.choices[0].message.content
            
            # Parse la réponse JSON
            parsed_response = json.loads(generated_content)
            generated_files = parsed_response.get("files", {})

        except Exception as e:
            add_log(f"Erreur lors de l'appel à OpenAI LLM: {e}", level="ERROR")
            raise HTTPException(status_code=500, detail=f"Erreur du service LLM (OpenAI): {e}")

    elif llm_provider == "kimi":
        if not kimi_client:
            raise HTTPException(status_code=500, detail="Kimi API non configurée ou clé manquante.")

        messages_kimi = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt_content}
        ]

        try:
            response = kimi_client.chat.completions.create(
                model=model_name,
                messages=messages_kimi,
                response_format={"type": "json_object"}
            )
            generated_content = response.choices[0].message.content
            parsed_response = json.loads(generated_content)
            generated_files = parsed_response.get("files", {})
        except Exception as e:
            add_log(f"Erreur lors de l'appel à Kimi LLM: {e}", level="ERROR")
            raise HTTPException(status_code=500, detail=f"Erreur du service LLM (Kimi): {e}")

    else:
        raise HTTPException(status_code=400, detail=f"Fournisseur LLM '{llm_provider}' non supporté.")

    # Filtrer les fichiers supprimés (contenu null) et s'assurer que seuls les fichiers avec du contenu sont retournés.
    final_files = {
        name: content for name, content in generated_files.items()
        if content is not None
    }

    # Pour le débogage:
    if not final_files:
        add_log("Le LLM n'a généré aucun fichier valide.", level="WARNING")
    else:
        for file_name, content in final_files.items():
            add_log(f"Fichier généré/modifié par LLM: {file_name} (taille: {len(content)} octets)")

    return final_files