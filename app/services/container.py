from app.models.orchestration_schemas import FeatureFlags
from app.services.agent_identity_service import AgentIdentityService
from app.services.agent_service import AgentService
from app.services.auth_service import AuthService
from app.services.conversation_service import ConversationService
from app.services.interaction_analysis_service import InteractionAnalysisService
from app.services.inner_multiplicity_service import InnerMultiplicityService
from app.services.memory_service import MemoryService
from app.services.orchestrator_service import OrchestratorService
from app.services.orchestrator_subsystems import (
    AffectiveSubsystem,
    BiographySubsystem,
    CommunicationIntelligenceSubsystem,
    CounterbalanceSubsystem,
    DestinySubsystem,
    IntentionalCoreSubsystem,
    MemorySubsystem,
)
from app.services.user_service import UserService


class ServiceContainer:
    def __init__(self) -> None:
        self.user_service = UserService()
        self.auth_service = AuthService(self.user_service)
        self.agent_service = AgentService()
        self.agent_identity_service = AgentIdentityService()
        self.conversation_service = ConversationService()
        self.memory_service = MemoryService()
        self.inner_multiplicity_service = InnerMultiplicityService()
        self.interaction_analysis_service = InteractionAnalysisService(self.conversation_service)
        self.orchestrator_service = OrchestratorService(
            conversation_service=self.conversation_service,
            memory_service=self.memory_service,
            agent_service=self.agent_service,
            memory_engine=MemorySubsystem(),
            biography_engine=BiographySubsystem(),
            affective_engine=AffectiveSubsystem(),
            intentional_core=IntentionalCoreSubsystem(),
            counterbalance_engine=CounterbalanceSubsystem(),
            destiny_engine=DestinySubsystem(),
            communication_hook=CommunicationIntelligenceSubsystem(),
            inner_multiplicity_service=self.inner_multiplicity_service,
            feature_flags=FeatureFlags(),
        )


container = ServiceContainer()
