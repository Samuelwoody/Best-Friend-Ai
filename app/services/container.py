from app.services.agent_identity_service import AgentIdentityService
from app.services.agent_service import AgentService
from app.services.auth_service import AuthService
from app.services.conversation_service import ConversationService
from app.services.memory_service import MemoryService
from app.services.user_service import UserService


class ServiceContainer:
    def __init__(self) -> None:
        self.user_service = UserService()
        self.auth_service = AuthService(self.user_service)
        self.agent_service = AgentService()
        self.agent_identity_service = AgentIdentityService()
        self.conversation_service = ConversationService()
        self.memory_service = MemoryService()


container = ServiceContainer()
