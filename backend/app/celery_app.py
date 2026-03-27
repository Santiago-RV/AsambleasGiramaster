from celery import Celery
from app.core.config import settings

celery_app = Celery(
    'giramaster',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['app.tasks.email_tasks']
)

# Configuración de Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Bogota',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hora máximo por tarea
    task_soft_time_limit=3000,  # 50 minutos soft limit
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=3600,  # Resultados expiran en 1 hora
    redis_max_connections=10,
)

# Tareas periódicas (si las hay)
celery_app.conf.beat_schedule = {}

# Autodiscovery de tareas
celery_app.autodiscover_tasks(['app.tasks'])
