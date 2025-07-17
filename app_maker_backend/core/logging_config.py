# app_maker_backend/core/logging_config.py

# Variable globale pour stocker les logs (pour la simulation de polling)
global_logs = []

def add_log(message: str):
    """Ajoute un message aux logs globaux et l'imprime."""
    print(message)
    global_logs.append(message)

def clear_logs():
    """Efface tous les logs."""
    global global_logs
    global_logs = []

def get_all_logs():
    """Retourne tous les logs."""
    return global_logs