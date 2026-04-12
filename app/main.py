from fastapi import FastAPI

from app.api.routes import api_router

app = FastAPI(title="Best Friend AI Backend", version="1.0.0")
app.include_router(api_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
