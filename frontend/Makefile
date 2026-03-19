# Variables
RUN = pnpm
PROJECT_NAME = giramaster-frontend
PORT = 3000

# COlores para output
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Comando por defecto (se ejecuta con solo 'make')
.DEFAULT_GOAL := help

## PHONY indica que no son archivos reales
.PHONY: install dev prod test clean docker-build docker-run docker-run-detached docker-stop docker-logs docker-clean

## Ayuda
help:
	@echo "$(GREEN)Comandos disponibles:$(NC)"
	@echo "  $(YELLOW)make install$(NC)    - Instalar dependencias"
	@echo "  $(YELLOW)make dev$(NC)        - Ejecutar servidor de desarrollo"
	@echo "  $(YELLOW)make prod$(NC)       - Ejecutar servidor de producción"
	@echo "  $(YELLOW)make lint$(NC)       - Verificar código"
	@echo "  $(YELLOW)make test$(NC)       - Ejecutar tests"
	@echo "  $(YELLOW)make clean$(NC)      - Limpiar archivos temporales"
	@echo "  $(YELLOW)make docker-build$(NC)   - Construir imagen Docker"
	@echo "  $(YELLOW)make docker-run$(NC)    - Ejecutar contenedor Docker (consola, puerto 3000)"
	@echo "  $(YELLOW)make docker-run-detached$(NC) - Ejecutar contenedor en segundo plano (puerto 3000)"
	@echo "  $(YELLOW)make docker-stop$(NC)   - Detener y eliminar contenedor"
	@echo "  $(YELLOW)make docker-logs$(NC)   - Ver logs del contenedor"
	@echo "  $(YELLOW)make docker-clean$(NC)  - Limpiar imágenes Docker"

install:
	@echo "$(YELLOW)📦 Instalando dependencias...$(NC)"
	$(RUN) install
	@echo "$(GREEN)Dependencias instaladas$(NC)"

dev:
	@echo "$(GREEN)🚀 Iniciando servidor de desarrollo...$(NC)"
	$(RUN) dev

prod:
	@echo "$(YELLOW)🚀 Iniciando servidor de producción...$(NC)"
	$(RUN) build

test:
	@echo "$(GREEN)🧪 Ejecutando tests...$(NC)"
	$(RUN) test

lint:
	@echo "$(GREEN)🔍 Verificando código...$(NC)"
	$(RUN) lint
	@echo "$(GREEN)Código verificado$(NC)"

clean:
	@echo "$(YELLOW)🧹 Limpiando archivos temporales...$(NC)"
	$(RUN) clean
	rm -rf dist/
	rm -rf .vite/
	rm -rf node_modules/
	@echo "$(GREEN)Archivos temporales limpiados$(NC)"

## Docker
docker-build:
	@echo "$(GREEN)🐳 Construyendo imagen Docker...$(NC)"
	docker build -t $(PROJECT_NAME) .

docker-run:
	@echo "$(GREEN)🐳 Ejecutando contenedor Docker en puerto $(PORT)...$(NC)"
	docker run -p $(PORT):80 $(PROJECT_NAME)

docker-run-detached:
	@echo "$(GREEN)🐳 Ejecutando contenedor Docker en segundo plano en puerto $(PORT)...$(NC)"
	docker run -d --name $(PROJECT_NAME) -p $(PORT):80 $(PROJECT_NAME)
	@echo "$(GREEN)✅ Contenedor iniciado en http://localhost:$(PORT)$(NC)"
	@echo "$(GREEN)Ver logs: docker logs -f $(PROJECT_NAME)$(NC)"

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