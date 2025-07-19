"Ce projet est un outil interactif conçu pour générer, visualiser, exécuter et déboguer des applications de bureau PySide6 à l'aide de modèles de langage (LLM). L'utilisateur interagit principalement via des prompts textuels et des boutons d'action. Notre travail se concentre sur le développement de cet outil innovant, dont le frontend est bâti avec React 18 + TypeScript + Tailwind CSS et le backend avec FastAPI (Python 3.11)."

L’application se veut un outil où l’utilisateur peut :
- Décrire l’application PySide6 souhaitée via un prompt."

- Voir le code généré par le LLM dans un IDE simplifié."

- Lancer et arrêter l’application PySide6 générée."

- Visualiser les fichiers du projet dans une arborescence."

- Consulter l’historique de ses interactions (prompts et réponses du LLM)."

- Voir les logs d’exécution du backend et de l’application PySide6."

- Identifier et potentiellement résoudre les problèmes rencontrés par l’application générée.


## Architecture Technique de l'Outil

L'outil est une application full-stack robuste, divisée en deux parties principales qui interagissent pour offrir une expérience fluide :

* **Frontend :** Développé avec **React 18**, **TypeScript** et **Tailwind CSS**, cette interface utilisateur permet une interaction intuitive avec le LLM et la gestion des projets PySide6 générés.
* **Backend :** Construit avec **FastAPI (Python 3.11)**, il gère la logique métier, l'interaction avec le LLM, la gestion des fichiers de projet et l'exécution des applications PySide6.


## 📁 Arborescence du projet
L’application est divisée en deux parties principales :
Frontend   | React 18 + TypeScript + Tailwind CSS
Backend    | FastAPI (Python 3.11)
```text
├── app_maker_backend
│   ├── api
│   │   ├── files.py
│   │   ├── __init__.py
│   │   ├── log.py
│   │   ├── projects.py
│   │   └── runner.py
│   ├── core
│   │   ├── app_runner.py
│   │   ├── config.py
│   │   ├── __init__.py
│   │   ├── llm_service.py
│   │   ├── logging_config.py
│   │   └── project_manager.py
│   ├── generated_projects
│   │   ├── 014f8df3-3a73-4e45-84a6-fb9a800c540a
│   │   │   ├── history.json
│   │   │   └── main.py
│   │   ├── 47778153-e7f6-4426-ac73-50bbb0e143ad
│   │   │   ├── history.json
│   │   │   └── main.py
│   │   └── b3472f9b-c105-4451-bf04-5dcbed39bd7d
│   │       ├── history.json
│   │       └── main.py
│   ├── __init__.py
│   ├── logs
│   │   ├── app_maker_2025-07-18.log
│   │   ├── app_maker_2025-07-19.log
│   │   └── frontend_logs.json
│   ├── main.py
│   ├── readme.md
│   └── requirements.txt
├── app_maker_frontend
│   ├── api.ts
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   ├── src
│   │   ├── App.tsx
│   │   ├── components
│   │   │   ├── CodeEditor.tsx
│   │   │   ├── FileExplorer.tsx
│   │   │   ├── ProblemDisplay.tsx
│   │   │   ├── ProjectHistoryDisplay.tsx
│   │   │   ├── ProjectSidebar.tsx
│   │   │   ├── PromptSection.tsx
│   │   │   └── TerminalSection.tsx
│   │   ├── hooks
│   │   │   ├── useAppActions.ts
│   │   │   ├── useLlmOptions.ts
│   │   │   ├── useLogs.ts
│   │   │   ├── useProblemStatus.ts
│   │   │   └── useProjects.ts
│   │   ├── index.css
│   │   ├── lib
│   │   ├── main.tsx
│   │   ├── types
│   │   │   └── api.ts
│   │   └── vite-env.d.ts
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
└── README.md
```

## 🔌 API principale (FastAPI)

| Endpoint                            | Méthode | Description                            |
|-------------------------------------|---------|----------------------------------------|
| `GET /api/projects/`                | GET     | Lister tous les projets                |
| `POST /api/projects/`               | POST    | Créer un nouveau projet                |
| `POST /api/projects/{id}/generate`  | POST    | Générer / mettre à jour / corriger     |
| `POST /api/runner/run`              | POST    | Lancer l’application PySide6           |
| `POST /api/runner/stop`             | POST    | Arrêter l’application en cours         |
| `GET /api/projects/{id}/files`      | GET     | Liste des fichiers du projet           |
| `GET /api/projects/{id}/history`    | GET     | Historique des prompts & modifications |
| `GET /api/projects/{id}/problem_status` | GET  | Rapport de crash / erreur              |

---


## 🖥️ Interface utilisateur (React)

### 1. Sidebar
- liste des projets  
- renommer / supprimer 

### 2. PromptSection (panneau gauche)
- textarea pour le prompt  
- sélecteur de modèle LLM  
- boutons :
  - **Générer**
  - **Mettre à jour**
  - **Lancer**
  - **Arrêter**
  - **Fix Bug**


  ### 3. FileExplorer (gauche IDE)
- arborescence façon VS Code  
- icônes dossier / fichier  
- ouverture automatique dans l’éditeur

### 4. CodeEditor (droite)
- **lecture seule**  
- coloration syntaxique Python (CodeMirror)  
- scrollbar fluide

### 5. TerminalSection (bas droite)
- logs shell en temps réel  
- affichage des erreurs PySide6  
- scroll-lock / clear

---

## 🔄 Flux de vie de l'Outil

Voici comment l'outil gère les interactions de l'utilisateur :

1.  **Saisie du prompt :** L'utilisateur décrit l'application PySide6 souhaitée via le `PromptSection`. Le frontend (`App.tsx`) déclenche un appel `POST` vers `/api/projects/` sur le backend.
2.  **Création du projet :** Le backend crée un nouveau dossier de projet, configure un environnement virtuel (venv) et génère le code initial de l'application PySide6. Il retourne ensuite un `project_id` unique.
3.  **Affichage de l'état du projet :** Le frontend met à jour l'interface pour afficher les fichiers générés dans l'`FileExplorer` et l'historique des interactions dans le `ProjectHistoryDisplay`.
4.  **Exécution de l'application :** Lorsque l'utilisateur clique sur "Lancer", le backend exécute l'application PySide6 générée via `venv/bin/python main.py`.
5.  **Gestion des erreurs :** Si l'application PySide6 générée plante, un fichier `problem.json` est créé. Le bouton "Fix Bug" permet alors de relancer le LLM pour tenter une correction.
6.  **Boucle de correction :** Ce processus peut se répéter pour permettre une résolution itérative des problèmes via le LLM.

---