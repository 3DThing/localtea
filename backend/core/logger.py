import logging
import sys
import os
from logging.handlers import RotatingFileHandler

def setup_logging():
    # Define log directory and file
    # backend/core/logger.py -> backend/logs
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    log_dir = os.path.join(base_dir, "logs")

    handlers = []

    # Stream handler (always available)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    handlers.append(stream_handler)

    # File handler (best-effort: skip if dir can't be created)
    try:
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "app.log")
        file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)
    except (PermissionError, OSError):
        pass  # In containers / CI, file logging may not be available

    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=handlers
    )
    
    # Ensure uvicorn logs are also captured if they aren't propagating
    logging.getLogger("uvicorn").handlers = list(handlers)
    logging.getLogger("uvicorn.access").handlers = list(handlers)
    
    # Set specific levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    # sqlalchemy logging
    logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
