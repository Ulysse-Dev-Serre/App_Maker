# app_maker_backend/core/logging_config.py

import logging
import os
from datetime import datetime

# Assurez-vous que le répertoire des logs existe
LOGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs')
os.makedirs(LOGS_DIR, exist_ok=True)

# Configuration de base du logger
# Le nom du fichier de log peut inclure la date pour une meilleure organisation
log_file_name = datetime.now().strftime("app_maker_%Y-%m-%d.log")
log_file_path = os.path.join(LOGS_DIR, log_file_name)

# Créer un formateur qui inclut l'heure, le niveau et le message
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

# Configurer le logger principal
# Le niveau global peut être INFO, DEBUG, WARNING, ERROR, CRITICAL
logger = logging.getLogger('app_maker_logger')
logger.setLevel(logging.INFO) # Niveau par défaut pour la console et le fichier

# Empêche la propagation aux handlers racines, évitant les logs en double sur la console
logger.propagate = False

# Handler pour la console
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# Handler pour le fichier
file_handler = logging.FileHandler(log_file_path, encoding='utf-8')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

def add_log(message: str, level: str = "INFO"):
    """
    Ajoute un message au système de log.

    Args:
        message (str): Le message à loguer.
        level (str): Le niveau de log (INFO, WARNING, ERROR, DEBUG, CRITICAL).
                     Par défaut, INFO.
    """
    level = level.upper()

    if level == "DEBUG":
        logger.debug(message)
    elif level == "INFO":
        logger.info(message)
    elif level == "WARNING":
        logger.warning(message)
    elif level == "ERROR":
        logger.error(message)
    elif level == "CRITICAL":
        logger.critical(message)
    else:
        logger.info(f"Niveau de log inconnu '{level}'. Logué comme INFO: {message}")


# NOUVELLE FONCTION À AJOUTER POUR RÉSOUDRE L'IMPORTERROR
def get_all_logs() -> str:
    """
    Lit et retourne tout le contenu du fichier de log actuel.
    """
    try:
        with open(log_file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Aucun fichier de log trouvé."
    except Exception as e:
        return f"Erreur lors de la lecture du fichier de log : {e}"