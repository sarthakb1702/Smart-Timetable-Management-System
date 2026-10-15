from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.auth import get_current_user, require_roles, UserContext
from app.routers.clash_check import router as clash_router
from app.routers.generation import router as generation_router
from app.routers.settings import router as settings_router
from app.routers.auth_dev import router as auth_dev_router
from app.routers.courses import router as courses_router
from app.routers.rooms import router as rooms_router
from app.routers.mdm import router as mdm_router
from app.routers.divisions import router as divisions_router
from app.routers.electives import router as electives_router
from app.routers.timetable import router as timetable_router
from app.routers.batches import router as batches_router
from app.routers.mappings import router as mappings_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("timetable-api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production backend service for the Smart Timetable Management System. "
        "Provides Google OR-Tools CP-SAT constraint generation and real-time clash validation."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

# Mount API Routers under /api/v1
app.include_router(clash_router, prefix=settings.API_V1_STR)
app.include_router(generation_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(auth_dev_router, prefix=settings.API_V1_STR)
app.include_router(courses_router, prefix=settings.API_V1_STR)
app.include_router(rooms_router, prefix=settings.API_V1_STR)
app.include_router(mdm_router, prefix=settings.API_V1_STR)
app.include_router(divisions_router, prefix=settings.API_V1_STR)
app.include_router(electives_router, prefix=settings.API_V1_STR)
app.include_router(timetable_router, prefix=settings.API_V1_STR)
app.include_router(batches_router, prefix=settings.API_V1_STR)
app.include_router(mappings_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "docs": f"{settings.API_V1_STR}/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": settings.VERSION,
    }


@app.get(f"{settings.API_V1_STR}/auth/me", tags=["Auth"])
async def get_me(user: UserContext = Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "department_id": user.department_id,
        "division_id": user.division_id,
        "batch_id": user.batch_id,
        "is_active": user.is_active,
    }


@app.get(f"{settings.API_V1_STR}/auth/admin-only", tags=["Auth"])
async def admin_only(user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator"))):
    return {"message": "Admin access granted", "user": user.email, "role": user.role}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
