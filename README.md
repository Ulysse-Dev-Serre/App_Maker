# Résumé des Étapes de Développement pour `app_maker`

Ce document récapitule les principales étapes et corrections effectuées pour mettre en place le backend FastAPI et le frontend React de l'application `app_maker`, permettant la génération et la prévisualisation d'applications PySide6.

## 1. Initialisation et Structure du Projet

* **Objectif :** Mettre en place un projet avec un backend Python (FastAPI) et un frontend JavaScript (React/Vite).
* **Structure :** Création de deux dossiers principaux :
    * `app_maker_backend/` : Contient le code du serveur FastAPI.
    * `app_maker_frontend/` : Contient le code de l'interface utilisateur React.
* **Environnements Virtuels :** Utilisation de `venv` (pour Python) et `npm` (pour Node.js) pour gérer les dépendances de manière isolée.

## 2. Développement du Backend (FastAPI)

Le backend est responsable de la logique de génération, de la gestion des fichiers, du lancement des applications PySide6 et de la fourniture des logs au frontend.

### a. Fichier `main.py` (Backend)

Ce fichier contient la logique principale du serveur FastAPI.

* **Initialisation :**
    * Définition de l'application FastAPI : `app = FastAPI()`.
    * Déclaration de la variable globale `pyside_app_process = None` pour gérer le processus de l'application PySide6 lancée.
    * Déclaration de `global_logs = []` pour stocker les messages de log à envoyer au frontend.

* **Configuration CORS :**
    * Ajout de la `CORSMiddleware` pour permettre au frontend (ex: `http://localhost:5173`) de communiquer avec le backend (`http://127.0.0.1:8000`).
    * `origins = ["http://localhost", "http://localhost:5173"]` a été configuré.

* **Endpoints Implémentés :**

    1.  `GET /` : Endpoint racine simple (`read_root`).
    2.  `POST /api/generate` :
        * **Rôle :** Prend un `prompt` textuel du frontend.
        * **Fonctionnement :**
            * Génère un nom de projet unique basé sur un timestamp (`pyside_app_timestamp`).
            * Crée un dossier pour le projet généré sous `generated_projects/`.
            * Crée un fichier `main.py` simulé à l'intérieur de ce dossier avec un code PySide6 basique (fenêtre, label, bouton).
            * Retourne le chemin relatif du projet et du fichier `main.py` au frontend.
            * Ajoute des messages aux `global_logs` pour suivre la progression.

    3.  `POST /api/get_file_content` :
        * **Rôle :** Prend un chemin de fichier relatif.
        * **Fonctionnement :** Lit le contenu du fichier spécifié (avec des vérifications de sécurité pour éviter le "path traversal") et le renvoie au frontend pour affichage.

    4.  `POST /api/run_app` :
        * **Rôle :** Lance l'application PySide6 générée.
        * **Fonctionnement :**
            * Utilise `global pyside_app_process` et `global_logs`.
            * **Gestion des processus existants :** Vérifie si une application PySide6 est déjà en cours d'exécution. Si oui, tente de la terminer (`.terminate()`, puis `.kill()` si nécessaire après un timeout) avant d'en lancer une nouvelle.
            * **Environnement Virtuel (venv) :**
                * Vérifie l'existence d'un `.venv` spécifique au projet généré.
                * Si non existant, le crée en exécutant `python -m venv .venv` dans le dossier du projet.
                * Détecte l'exécutable Python correct dans le venv (`bin/python` pour Linux/macOS, `Scripts/python.exe` pour Windows) en utilisant `sys.platform`. **Correction cruciale :** Ajout de `import sys` en haut du fichier pour éviter `NameError`.
            * **Installation de PySide6 :** Installe `PySide6` dans l'environnement virtuel du projet (`python -m pip install PySide6`).
            * **Lancement de l'application :** Lance le `main.py` de l'application PySide6 dans un **processus séparé et non bloquant** (`subprocess.Popen`), assurant que le backend FastAPI reste réactif.
            * Ajoute des messages aux `global_logs` sur les étapes (création venv, installation, lancement).
            * **Correction :** Positionnement correct du décorateur `@app.post("/api/run_app")` juste avant la définition de la fonction `run_app` pour que FastAPI reconnaisse la route (résolvant le `404 Not Found`).

    5.  `POST /api/stop_app` :
        * **Rôle :** Arrête l'application PySide6 en cours si elle a été lancée par le backend.
        * **Fonctionnement :** Utilise `pyside_app_process.terminate()` ou `pyside_app_process.kill()` si un processus est actif.

    6.  `GET /api/get_logs` :
        * **Rôle :** Fournit les messages stockés dans `global_logs` au frontend.
        * **Fonctionnement :** Utilisé pour le mécanisme de polling permettant d'afficher la sortie du backend en temps réel dans le terminal du frontend.

### b. Lancement du Backend

* Commande : `uvicorn main:app --reload --port 8000`
* `--reload` : Permet au serveur de se recharger automatiquement à chaque modification du code source.
* `--port 8000` : Définit le port sur lequel le backend écoute.

## 3. Développement du Frontend (React/Vite)

Le frontend fournit l'interface utilisateur, envoie les requêtes au backend et affiche les résultats.

### a. Fichier `App.tsx` (Frontend)

Ce fichier est le composant principal de l'application React.

* **États React :**
    * `prompt`, `llmResponse`, `terminalOutput`, `projectPath`, `mainPyRelativePath`, `isLoading`, `activeView`, `codeViewContent`.
    * **Nouveau :** `isPollingLogs` : Un état booléen pour contrôler si le polling des logs est actif.

* **Référence `terminalRef` :** Utilisé pour faire défiler automatiquement le terminal vers le bas.

* **`useEffect` (Scroll automatique) :** Assure que le terminal défile pour toujours montrer les dernières lignes.

* **`fetchLogs` (avec `useCallback`) :**
    * Fonction asynchrone pour récupérer les logs via `GET /api/get_logs`.
    * Utilisée pour mettre à jour `terminalOutput`.
    * Enveloppée dans `useCallback` pour optimiser les performances lorsque cette fonction est une dépendance d'autres hooks.

* **`useEffect` (Gestion du Polling) - **Correction Majeure** :**
    * Ce hook est le cœur de l'optimisation des logs.
    * Il démarre un `setInterval` pour appeler `fetchLogs` toutes les 500ms **uniquement si `isPollingLogs` est `true`**.
    * Il s'exécute immédiatement (`fetchLogs()`) au démarrage du polling pour récupérer les premiers logs sans délai.
    * Il nettoie l'intervalle (`clearInterval`) lorsque `isPollingLogs` passe à `false` ou lorsque le composant est démonté, évitant ainsi les requêtes inutiles.

* **`handleGenerateApp` :**
    * Appelé par le bouton "Générer Application PySide6".
    * Réinitialise les états pertinents (`terminalOutput`, etc.).
    * **Active le polling des logs (`setIsPollingLogs(true)`)** avant d'envoyer la requête `POST /api/generate`.
    * Traite la réponse du backend, met à jour `llmResponse`, `projectPath`, etc.
    * Appelle `POST /api/get_file_content` pour afficher le code généré dans l'interface.
    * **Désactive le polling des logs (`setIsPollingLogs(false)`)** dans le bloc `finally`, une fois la génération et la lecture du fichier terminées.

* **`handleRunApp` :**
    * Appelé par le bouton "Preview" (qui sert à lancer l'app).
    * Vérifie si un `projectPath` existe.
    * **Active le polling des logs (`setIsPollingLogs(true)`)** avant d'envoyer la requête `POST /api/run_app`.
    * Traite la réponse du backend.
    * **Désactive le polling des logs (`setIsPollingLogs(false)`)** dans le bloc `finally`, une fois que le backend a signalé que l'application a été lancée (le backend ne génère plus de logs pour cette action à ce point, l'application s'exécutant dans son propre processus).

* **Interface Utilisateur (JSX) :**
    * Champ de prompt pour l'entrée utilisateur.
    * Zone d'affichage pour la réponse du LLM.
    * Boutons "Générer Application PySide6" et "Preview".
    * Vues "Code" et "Preview" (l'application PySide6 apparaît dans une fenêtre séparée, le "Preview" dans le frontend est un placeholder).
    * Zone de terminal pour afficher les logs du backend.

### b. Lancement du Frontend

* Commande : `npm run dev` (dans le dossier `app_maker_frontend/`).
* Ouvre l'application dans le navigateur, généralement sur `http://localhost:5173/`.

## 4. Flux de Travail Amélioré

Avec ces modifications, le flux est le suivant :

1.  L'utilisateur entre un prompt et clique sur "Générer".
2.  Le frontend active le polling des logs.
3.  Le backend travaille (génération du code, création de fichiers), et ses messages sont affichés en temps réel dans le terminal du frontend grâce au polling.
4.  Une fois la génération terminée et le code de `main.py` affiché, le polling des logs s'arrête.
5.  L'utilisateur clique sur "Preview" ("Run App").
6.  Le frontend active à nouveau le polling des logs.
7.  Le backend travaille (arrêt de l'ancienne app si présente, création du venv si nécessaire, installation de PySide6 si nécessaire, lancement de la nouvelle app PySide6), et ses messages sont affichés en temps réel.
8.  Une fois que l'application PySide6 est lancée et que le backend a renvoyé la confirmation, le polling des logs s'arrête. L'application PySide6 s'exécute dans sa propre fenêtre séparée.