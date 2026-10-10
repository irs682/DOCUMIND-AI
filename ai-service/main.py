"""Entrypoint alias to support running `uvicorn main:app` directly from the ai-service root."""
from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    from app.config.settings import settings

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.APP_ENV == "development",
    )

