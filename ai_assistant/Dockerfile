FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY ai_assistant/requirements.txt /app/ai_assistant/requirements.txt
RUN pip install --no-cache-dir -r /app/ai_assistant/requirements.txt

# Copy backend (shared models, db, config)
COPY backend/ /app/backend/
COPY admin_backend/ /app/admin_backend/
COPY ai_assistant/ /app/ai_assistant/

# Default command
CMD ["uvicorn", "ai_assistant.main:app", "--host", "0.0.0.0", "--port", "8004", "--reload"]
