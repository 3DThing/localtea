import logging
import sys
import os
from logging.handlers import RotatingFileHandler

def setup_logging():
    # Define log directory and file
    # backend/core/logger.py -> backend/logs
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    log_dir = os.path.join(base_dir, "logs")
    
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    log_file = os.path.join(log_dir, "app.log")

    # Create formatters
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    # Create handlers
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)

    file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
    file_handler.setFormatter(formatter)

    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[stream_handler, file_handler]
    )
    
    # Ensure uvicorn logs are also captured if they aren't propagating
    logging.getLogger("uvicorn").handlers = [stream_handler, file_handler]
    logging.getLogger("uvicorn.access").handlers = [stream_handler, file_handler]
    
    # Set specific levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    # sqlalchemy logging
    logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
