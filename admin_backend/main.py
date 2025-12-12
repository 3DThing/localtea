from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import os
import mimetypes
from backend.core.config import settings
from admin_backend.api.v1 import auth, users, catalog, orders, dashboard, blog, moderation, promo_codes, inventory, refunds, finance

# Добавляем MIME type для WebP
mimetypes.add_type("image/webp", ".webp")

app = FastAPI(
    title="LocalTea Admin API",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS обрабатывается в Nginx

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
app.include_router(moderation.router, prefix="/api/v1/moderation", tags=["moderation"])
app.include_router(promo_codes.router, prefix="/api/v1/promo-codes", tags=["promo-codes"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["inventory"])
app.include_router(refunds.router, prefix="/api/v1/refunds", tags=["refunds"])
app.include_router(finance.router, prefix="/api/v1/finance", tags=["finance"])

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
