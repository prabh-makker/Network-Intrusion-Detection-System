from fastapi import APIRouter
from .endpoints import traffic, alerts

api_router = APIRouter()
api_router.include_router(traffic.router, prefix="/traffic", tags=["traffic"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
