# Variables
PYTHON = .venv/bin/python
PIP = .venv/bin/pip
PROJECT_NAME = giramaster-backend

# Colores para output 
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Comando por defecto (se ejecuta con solo 'make')
.DEFAULT_GOAL := help

# PHONY indica que no son archivos reales
.PHONY: help install dev celery celery-beat prod test clean docker-build docker-run docker-run-detached docker-stop docker-logs docker-clean migrate

## Ayuda
help:
	@echo "$(GREEN)Comandos disponibles:$(NC)"
	@echo "  $(YELLOW)make install$(NC)    - Instalar dependencias"
	@echo "  $(YELLOW)make dev$(NC)        - Ejecutar servidor de desarrollo"
	@echo "  $(YELLOW)make celery$(NC)     - Ejecutar Celery worker"
	@echo "  $(YELLOW)make celery-beat$(NC) - Ejecutar Celery beat"
	@echo "  $(YELLOW)make test$(NC)       - Ejecutar tests"
	@echo "  $(YELLOW)make migrate$(NC)    - Ejecutar migraciones"
	@echo "  $(YELLOW)make clean$(NC)      - Limpiar archivos temporales"
	@echo "  $(YELLOW)make docker-build$(NC)   - Construir imagen Docker"
	@echo "  $(YELLOW)make docker-run$(NC)    - Ejecutar contenedor Docker (consola)"
	@echo "  $(YELLOW)make docker-run-detached$(NC) - Ejecutar contenedor en segundo plano"
	@echo "  $(YELLOW)make docker-stop$(NC)   - Detener y eliminar contenedor"
	@echo "  $(YELLOW)make docker-logs$(NC)   - Ver logs del contenedor"
	@echo "  $(YELLOW)make docker-clean$(NC)  - Limpiar imágenes Docker"

## Instalación
install:
	@echo "$(GREEN)📦 Instalando dependencias...$(NC)"
	$(PIP) install -r requirements.txt
	@echo "$(GREEN)Dependencias instaladas$(NC)"

## Desarrollo
dev:
	@echo "$(GREEN)🚀 Iniciando servidor de desarrollo...$(NC)"
	$(PYTHON) -m app.main

## Celery
celery:
	@echo "$(GREEN)📨 Iniciando Celery worker...$(NC)"
	$(PYTHON) -m celery -A app.celery_app worker -Q email_tasks -l info --concurrency=4

celery-beat:
	@echo "$(GREEN)⏰ Iniciando Celery beat...$(NC)"
	$(PYTHON) -m celery -A app.celery_app beat -l info --scheduler celery.beat:PersistentScheduler

## Base de datos
migrate:
	@echo "$(GREEN)🔄 Ejecutando migraciones...$(NC)"
	alembic upgrade head

# Crear nueva migración
migration:
	@echo "$(GREEN)📝 Creando nueva migración...$(NC)"
	@read -p "Nombre de la migración: " name; \
	alembic revision --autogenerate -m "$$name"

# Rollback de migración
rollback:
	@echo "$(YELLOW) Rollback de última migración...$(NC)"
	alembic downgrade -1

## Testing
test:
	@echo "$(GREEN)🧪 Ejecutando tests...$(NC)"
	pytest -v

test-cov:
	@echo "$(GREEN)🧪 Ejecutando tests con cobertura...$(NC)"
	pytest --cov=app --cov-report=html

## Linting y formato
lint:
	@echo "$(GREEN)🔍 Verificando código...$(NC)"
	flake8 app/
	black --check app/

format:
	@echo "$(GREEN)✨ Formateando código...$(NC)"
	black app/
	isort app/

## Docker
docker-build:
	@echo "$(GREEN)🐳 Construyendo imagen Docker...$(NC)"
	docker build --no-cache -t $(PROJECT_NAME) .

docker-run:
	@echo "$(GREEN)🐳 Ejecutando contenedor Docker...$(NC)"
	docker run -p 8000:8000 --env-file .env.production $(PROJECT_NAME)

docker-run-detached:
	@echo "$(GREEN)🐳 Ejecutando contenedor Docker en segundo plano...$(NC)"
	docker run -d --name $(PROJECT_NAME) -p 8000:8000 --env-file .env.production $(PROJECT_NAME)
	@echo "$(GREEN)✅ Contenedor iniciado. Ver logs: docker logs -f $(PROJECT_NAME)$(NC)"

docker-stop:
	@echo "$(YELLOW)⏹️  Deteniendo contenedor Docker...$(NC)"
	docker stop $(PROJECT_NAME)
	docker rm $(PROJECT_NAME)

docker-logs:
	@echo "$(GREEN)📋 Mostrando logs del contenedor...$(NC)"
	docker logs -f $(PROJECT_NAME)

docker-clean:
	@echo "$(YELLOW)🧹 Limpiando imágenes Docker...$(NC)"
	docker system prune -f

## Limpieza
clean:
	@echo "$(YELLOW)🧹 Limpiando archivos temporales...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name ".coverage" -delete
	rm -rf htmlcov/
	rm -rf .pytest_cache/
	@echo "$(GREEN)Limpieza completada$(NC)"

## Utilidades
shell:
	@echo "$(GREEN)🐚 Abriendo shell interactivo...$(NC)"
	$(PYTHON) -m IPython

requirements:
	@echo "$(YELLOW)📋 Actualizando requirements.txt...$(NC)"
	pip freeze > requirements.txt
	@echo "$(GREEN)requirements.txt actualizado$(NC)"

check-env:
	@echo "$(GREEN)🔍 Verificando variables de entorno...$(NC)"
	@$(PYTHON) -c "from app.core.config import get_settings; s=get_settings(); print(s.json(indent=2))"

## Configuración inicial del proyecto
setup: install migrate
	@echo "$(GREEN)Proyecto configurado$(NC)"

## Para desarrollo diario
refresh: clean install migrate dev
	@echo "$(GREEN)🔄 Proyecto actualizado y ejecutándose$(NC)"