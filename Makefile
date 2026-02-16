.PHONY: db-migrate db-migrate-new db-migrate-upgrade db-migrate-current db-migrate-downgrade

# Create a new migration with message: make db-migrate-new m="add foo"
db-migrate-new:
	./scripts/db-migrate.sh new "$(m)"

# Apply migrations
db-migrate-upgrade:
	./scripts/db-migrate.sh upgrade

# Show current alembic version
db-migrate-current:
	./scripts/db-migrate.sh current

# Downgrade: make db-migrate-downgrade rev=-1
db-migrate-downgrade:
	./scripts/db-migrate.sh downgrade $(rev)

# Convenience alias
db-migrate: db-migrate-upgrade

# Backup / Restore convenience
.PHONY: db-backup db-restore

# Create backup: make db-backup f=optional_filename.dump
db-backup:
	./scripts/db-backup.sh $(f)

# Restore backup: make db-restore f=path/to/dump.dump db=name
db-restore:
	./scripts/db-restore.sh $(f) $(db)

# Full backup (DB + uploads)
.PHONY: fullbackup
fullbackup:
	python3 scripts/restore.py -fullbackup

# Restore: make restore sql=path/to/dump file=path/to/archive
.PHONY: restore
restore:
	python3 scripts/restore.py $(if $(sql),-sql $(sql)) $(if $(file),-file $(file))

# Deploy (production)
.PHONY: deploy
deploy:
	bash scripts/deploy.sh

# Production: build & up
.PHONY: prod-up prod-down prod-build
prod-build:
	docker compose -f docker-compose.prod.yml build --parallel

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

# Create superuser
create-superuser:
	python3 scripts/create_superuser.py

