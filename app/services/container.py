from app.services.agent_service import AgentService
from app.services.auth_service import AuthService
from app.services.conversation_service import ConversationService
from app.services.memory_service import MemoryService
from app.services.orchestrator_service import OrchestratorService
from app.services.user_service import UserService


class ServiceContainer:
    def __init__(self) -> None:
        self.user_service = UserService()
        self.auth_service = AuthService(self.user_service)
        self.agent_service = AgentService()
        self.conversation_service = ConversationService()
        self.memory_service = MemoryService()
        self.orchestrator_service = OrchestratorService(
            conversation_service=self.conversation_service,
            memory_service=self.memory_service,
            agent_service=self.agent_service,
        )


container = ServiceContainer()
