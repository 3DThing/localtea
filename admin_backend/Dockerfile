FROM python:3.10-slim

# Create user
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -s /bin/false -m appuser

WORKDIR /app

# Install dependencies
COPY requirements.txt .
COPY admin_backend/requirements.txt ./admin_requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r admin_requirements.txt

# Copy the entire project to access backend/models
COPY . .

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads/products /app/uploads/categories /app/uploads/blog && \
    chown -R appuser:appuser /app/uploads

# Set PYTHONPATH to include the root directory so we can import 'backend'
ENV PYTHONPATH=/app

# Switch to non-root user
USER 10001

CMD ["uvicorn", "admin_backend.main:app", "--host", "0.0.0.0", "--port", "8001"]
