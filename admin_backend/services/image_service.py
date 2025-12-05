import os
from PIL import Image
from fastapi import UploadFile
import uuid
from datetime import datetime

UPLOAD_DIR = "/app/uploads"

def process_and_save_image(file: UploadFile, subfolder: str = "products") -> str:
    os.makedirs(f"{UPLOAD_DIR}/{subfolder}", exist_ok=True)
    
    # Generate unique filename
    ext = "webp"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"{UPLOAD_DIR}/{subfolder}/{filename}"
    
    # Open image
    img = Image.open(file.file)
    
    # Convert to RGB if necessary (e.g. for PNG with transparency)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
        
    # Resize if too large (e.g. max 1920px width)
    max_width = 1920
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
    # Save as WebP
    img.save(filepath, "WEBP", quality=85)
    
    # Return full URL (user backend serves the uploads on port 8000)
    base_url = os.environ.get("UPLOADS_BASE_URL", "http://5.129.219.127:8000")
    return f"{base_url}/uploads/{subfolder}/{filename}"
