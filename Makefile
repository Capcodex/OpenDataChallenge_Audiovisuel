# Raccourcis vers les commandes Docker Compose (CdC technique § 5.4).
COMPOSE = docker compose
RUN = $(COMPOSE) run --rm pipeline

.PHONY: build pipeline ingest check test test-unit lint format shell clean-interim fichiers-locaux \
	exploration dev site site-stop test-site test-e2e lint-site neo4j neo4j-stop reproductibilite

# macOS : si le projet est dans un dossier synchronisé avec iCloud Drive, macOS peut retirer les
# fichiers du disque (« dataless ») ; Docker ne peut alors plus les lire (Errno 35).
fichiers-locaux:
	@if [ "$$(uname)" = "Darwin" ] && [ -n "$$(find . -path ./data/raw -prune -o -type f -flags +dataless -print -quit 2>/dev/null)" ]; then \
		echo "Des fichiers du projet ne sont que dans iCloud (dataless) : Docker ne peut pas les lire."; \
		echo "Les rapatrier :  find . -type f -flags +dataless -exec brctl download {} \\;"; \
		echo "Solution durable : déplacer le projet hors de Documents/Bureau synchronisés (voir docs/walkthrough.md)."; \
		exit 1; \
	fi

build: fichiers-locaux            ## Construire l'image du pipeline
	$(COMPOSE) build pipeline

pipeline: fichiers-locaux         ## Exécuter tout le pipeline
	$(RUN)

ingest: fichiers-locaux           ## Télécharger et vérifier les sources uniquement
	$(RUN) python -m pipeline run --only ingest

check: fichiers-locaux            ## Contrôles de données sur les sorties
	$(RUN) python -m pipeline check

test: fichiers-locaux             ## Tous les tests (unitaires + données)
	$(RUN) pytest

test-unit: fichiers-locaux        ## Tests unitaires seulement
	$(RUN) pytest -m "not data"

lint: fichiers-locaux             ## Vérification du style
	$(RUN) ruff check pipeline tests

# compose.yaml monte le code en lecture seule : on lance l'image directement, code monté en écriture.
format:           ## Formatage du code
	docker run --rm -v "$(CURDIR)/pipeline:/app/pipeline" -v "$(CURDIR)/tests:/app/tests" \
		-v "$(CURDIR)/docs:/app/docs" graphe-medias-pipeline:dev \
		sh -c "ruff format pipeline tests && ruff check --fix pipeline tests"

exploration: fichiers-locaux      ## Rapports d'exploration : seuils, familles, aperçu de la carte (docs/exploration/)
	$(COMPOSE) run --rm -v ./docs:/app/docs pipeline sh -c \
		"python docs/exploration/seuils.py && python docs/exploration/familles.py \
		&& python docs/exploration/carte.py"

shell: fichiers-locaux            ## Shell dans le conteneur
	$(RUN) bash

# Site web (sprint 2 : squelette ; la carte arrive au sprint 5).
dev: fichiers-locaux              ## Site en développement : http://localhost:5173
	$(COMPOSE) up --build site-dev

site: fichiers-locaux             ## Site de production (nginx) : http://localhost:8080
	$(COMPOSE) up --build --wait site

site-stop:                        ## Arrêter les services du site
	$(COMPOSE) down

test-site: fichiers-locaux        ## Tests Vitest du site
	$(COMPOSE) run --rm site-dev npm test

test-e2e: fichiers-locaux         ## Playwright, axe-core et Lighthouse contre l'image de production
	$(COMPOSE) --profile test build site e2e
	$(COMPOSE) --profile test run --rm e2e && $(COMPOSE) --profile test run --rm e2e npm run lighthouse; \
		code=$$?; $(COMPOSE) --profile test down; exit $$code

lint-site: fichiers-locaux        ## ESLint, Prettier et contrôle du vocabulaire (RG-20)
	$(COMPOSE) run --rm -v ./docs:/app/docs:ro -v ./README.md:/app/README.md:ro \
		-v ./CONTRIBUTING.md:/app/CONTRIBUTING.md:ro site-dev sh -c "npm run lint && \
		npm run vocabulaire -- src/i18n/fr.ts ../docs/methode.md ../docs/donnees.md \
		../docs/recette.md ../README.md ../CONTRIBUTING.md"

reproductibilite: fichiers-locaux  ## Deux exécutions forcées doivent donner des fichiers identiques
	sh scripts/reproductibilite.sh

# Base graphe d'analyse (profil « analyse ») : NEO4J_PASSWORD dans .env.
neo4j: fichiers-locaux            ## Lancer Neo4j, charger le graphe, vérifier les requêtes d'exemple
	@test -f .env || { echo "Créer .env à partir de .env.example (NEO4J_PASSWORD)"; exit 1; }
	$(COMPOSE) --profile analyse up -d --wait neo4j
	$(COMPOSE) run --rm -v ./docs:/app/docs:ro pipeline python -m pipeline export-neo4j --verifier
	@echo "Neo4j : http://localhost:7474 (utilisateur neo4j)"

neo4j-stop:                       ## Arrêter Neo4j (les données restent dans le volume neo4j-data)
	$(COMPOSE) --profile analyse stop neo4j

clean-interim:    ## Supprimer les fichiers intermédiaires (force un recalcul complet)
	rm -rf data/interim data/output data/.etat_pipeline.json
