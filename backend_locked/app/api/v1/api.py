from fastapi import APIRouter
from .endpoints import traffic, alerts, login

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(traffic.router, prefix="/traffic", tags=["traffic"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
