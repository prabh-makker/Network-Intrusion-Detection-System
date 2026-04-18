print('Starting import', flush=True)
from app.db.base_class import Base
print('Base imported', flush=True)
from app.db.session import engine
print('Engine imported', flush=True)
from app.models import models
print('Models imported', flush=True)
from app.api.v1.api import api_router
print('API Router imported', flush=True)
import app.main
print('Main imported', flush=True)
