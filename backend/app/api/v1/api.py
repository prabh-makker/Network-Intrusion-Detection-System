from fastapi import APIRouter
from .endpoints import traffic

api_router = APIRouter()
api_router.include_router(traffic.router, prefix="/traffic", tags=["traffic"])
