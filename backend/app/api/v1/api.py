from fastapi import APIRouter
from .endpoints import traffic, alerts, login, models, recommendations, retrain, analytics, remediation, actions, settings

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(traffic.router, prefix="/traffic", tags=["traffic"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(recommendations.router, prefix="/ml/recommendations", tags=["recommendations"])
api_router.include_router(retrain.router, prefix="/retrain", tags=["retrain"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(remediation.router, prefix="/remediation", tags=["remediation"])
api_router.include_router(actions.router, prefix="/actions", tags=["actions"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
