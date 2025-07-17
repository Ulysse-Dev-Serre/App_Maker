# app_maker_backend/core/llm_service.py
import google.generativeai as genai
from core.config import GOOGLE_API_KEY
from core.logging_config import add_log

genai.configure(api_key=GOOGLE_API_KEY)

async def generate_pyside_code(user_prompt: str) -> str:
    """
    Appelle le modèle Gemini pour générer le code PySide6.
    """
    add_log(f"Génération du code PySide6 pour le prompt : '{user_prompt}'...")

    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        llm_request_prompt = f"""
        Génère le code Python complet d'une application PySide6 basée sur la description suivante :
        "{user_prompt}"

        Le code doit être un fichier unique nommé `main.py`.
        La structure générale doit inclure :
        - Les imports nécessaires de PySide6 (ex: `QApplication`, `QWidget`, `QPushButton`, `QLabel`, `QVBoxLayout`, `QMessageBox` si nécessaire).
        - Une classe principale pour la fenêtre de l'application, héritant de `QWidget`.
        - Un constructeur `__init__` qui initialise l'interface utilisateur.
        - Une fonction `main` pour lancer l'application, s'assurant que `app.exec()` est appelé.
        - L'application doit démarrer une fenêtre visible.
        - Utilise des layouts (ex: `QVBoxLayout`) pour organiser les widgets.

        Retourne uniquement le code Python complet, sans explication, introduction, conclusion ni texte additionnel.
        Commence directement par la première ligne de code Python (généralement un import).
        N'encadre pas le code avec des triple backticks (```python).
        """

        response = await model.generate_content_async(llm_request_prompt)
        generated_code_raw = response.text

        if generated_code_raw.startswith("```python"):
            generated_code = generated_code_raw.replace("```python", "").replace("```", "").strip()
        else:
            generated_code = generated_code_raw.strip()

        if not generated_code:
            raise ValueError("Le modèle n'a pas retourné de code PySide6 valide.")

        add_log(f"Code PySide6 généré par le LLM (premières 100 lettres): '{generated_code[:100]}...'")
        return generated_code

    except Exception as e:
        add_log(f"Erreur lors de l'appel au LLM ou de la génération du code : {e}")
        raise