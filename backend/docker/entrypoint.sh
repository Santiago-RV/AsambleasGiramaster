#!/bin/bash
set -e

SERVICE="${SERVICE:-backend}"

case "$SERVICE" in
    backend)
        exec uvicorn app.main:app --host 0.0.0.0 --port 8000
        ;;
    celery)
        exec celery -A app.celery_app worker -Q email_tasks -l info --concurrency=4
        ;;
    celery-beat)
        exec celery -A app.celery_app beat -l info --scheduler celery.beat:PersistentScheduler
        ;;
    *)
        echo "Unknown service: $SERVICE"
        echo "Valid services: backend, celery, celery-beat"
        exit 1
        ;;
esac
