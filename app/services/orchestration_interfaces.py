from __future__ import annotations

from typing import Protocol

from app.models.orchestration_schemas import (
    OrchestrationContext,
    OrchestrationInputPayload,
    SubsystemOutput,
)


class MemoryEngine(Protocol):
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        ...


class BiographyEngine(Protocol):
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        ...


class AffectiveEngine(Protocol):
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        ...


class IntentionalCore(Protocol):
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        ...


class CounterbalanceEngine(Protocol):
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        ...


class DestinyEngine(Protocol):
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        ...


class CommunicationIntelligenceHook(Protocol):
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        ...
