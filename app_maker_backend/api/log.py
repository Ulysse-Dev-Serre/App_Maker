# app_maker_backend/api/logs.py
from fastapi import APIRouter
from core.logging_config import get_all_logs

router = APIRouter(
    prefix="/api",
    tags=["Logs"],
)

@router.get("/get_logs")
async def get_logs_route():
    """
    Retourne les logs collectés par le backend pour le frontend.
    """
    return {"logs": get_all_logs()}