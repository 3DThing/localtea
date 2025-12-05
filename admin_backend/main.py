from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import os
import mimetypes
from backend.core.config import settings
from admin_backend.api.v1 import auth, users, catalog, orders, dashboard, blog

# Добавляем MIME type для WebP
mimetypes.add_type("image/webp", ".webp")

app = FastAPI(
    title="LocalTea Admin API",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://127.0.0.1:3000", 
        "http://127.0.0.1:3001",
        "http://5.129.219.127:3000",
        "http://5.129.219.127:3001",
        "https://admin.localtea.ru",
        "https://apiadmin.localtea.ru",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn.error")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        err_copy = dict(error)
        # Convert bytes to string if present
        if isinstance(err_copy.get('input'), bytes):
            err_copy['input'] = err_copy['input'].decode('utf-8', errors='replace')
        errors.append(err_copy)
    logger.error(f"Validation error: {errors}")
    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(catalog.router, prefix="/api/v1/catalog", tags=["catalog"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["orders"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(blog.router, prefix="/api/v1/blog", tags=["blog"])

# Serve uploaded files
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")



@app.get("/")
async def root():
    return {"message": "Welcome to LocalTea Admin API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
