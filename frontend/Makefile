# Variables
RUN = npm run

# COlores para output
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Comando por defecto (se ejecuta con solo 'make')
.DEFAULT_GOAL := help

## PHONY indica que no son archivos reales
.PHONY: install dev prod test clean

## Ayuda
help:
	@echo "$(GREEN)Comandos disponibles:$(NC)"
	@echo "  $(YELLOW)make install$(NC)    - Instalar dependencias"
	@echo "  $(YELLOW)make dev$(NC)        - Ejecutar servidor de desarrollo"
	@echo "  $(YELLOW)make prod$(NC)       - Ejecutar servidor de producción"
	@echo "  $(YELLOW)make lint$(NC)       - Verificar código"
	@echo "  $(YELLOW)make test$(NC)       - Ejecutar tests"
	@echo "  $(YELLOW)make clean$(NC)      - Limpiar archivos temporales"

install:
	@echo "$(YELLOW)📦 Instalando dependencias...$(NC)"
	$(RUN) install
	@echo "$(GREEN)✅ Dependencias instaladas$(NC)"

dev:
	@echo "$(GREEN)🚀 Iniciando servidor de desarrollo...$(NC)"
	$(RUN) dev

prod:
	@echo "$(YELLOW)🚀 Iniciando servidor de producción...$(NC)"
	$(RUN) build
	$(RUN) preview

test:
	@echo "$(GREEN)🧪 Ejecutando tests...$(NC)"
	$(RUN) test

lint:
	@echo "$(GREEN)🔍 Verificando código...$(NC)"
	$(RUN) lint
	@echo "$(GREEN)✅ Código verificado$(NC)"

clean:
	@echo "$(YELLOW)🧹 Limpiando archivos temporales...$(NC)"
	$(RUN) clean
	rm -rf dist/
	rm -rf .vite/
	rm -rf node_modules/
	@echo "$(GREEN)✅ Archivos temporales limpiados$(NC)"