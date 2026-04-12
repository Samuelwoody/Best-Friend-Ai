from fastapi import APIRouter

from app.api.routes import agents, auth, chat, memory, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(agents.router)
api_router.include_router(chat.router)
api_router.include_router(memory.router)
