# DOMAIN_MODEL.md — Core Domain Entities

## 1) Modeling Principles

- Multi-tenant by default.
- Strong identity and auditability for all mutating actions.
- Separation between operational state and analytical projections.
- Event-ready design for eventual consistency across services.

## 2) Core Entities

## User
Represents an end-user of Best Friend AI.

Attributes (suggested):
- user_id (UUID, immutable)
- tenant_id
- external_auth_id
- display_name
- locale, timezone
- status (active, suspended, deleted)
- created_at, updated_at

Relations:
- User has many Conversations.
- User has many Memories.
- User can own multiple Agents (personalized assistants/profiles).

## Agent
Represents a configurable AI persona/runtime profile attached to a user or tenant.

Attributes:
- agent_id
- tenant_id
- owner_user_id (nullable for system agents)
- name
- persona_profile
- policy_profile_id
- model_routing_profile_id
- created_at, updated_at

Relations:
- Agent participates in Conversations.
- Agent uses ToolPermissions and PolicyProfiles.

## Conversation
Represents a logical thread of interaction.

Attributes:
- conversation_id
- tenant_id
- user_id
- agent_id
- title
- state (active, archived, deleted)
- started_at, last_activity_at

Relations:
- Conversation has many Messages.
- Conversation references Memories via retrieval sessions.

## Message
Represents one exchange item inside a Conversation.

Attributes:
- message_id
- conversation_id
- role (user, agent, system, tool)
- content
- content_type
- token_usage
- safety_labels
- created_at

Relations:
- Message may produce ToolCalls.
- Message may create/update Memory entries.

## Memory
Represents persisted user/agent context (episodic, semantic, preference, or factual).

Attributes:
- memory_id
- tenant_id
- user_id
- agent_id (optional)
- memory_type (episodic, semantic, preference, profile)
- source_message_id
- content
- embedding_ref
- confidence_score
- privacy_level
- created_at, updated_at, expires_at

Relations:
- Memory can be linked to Conversations and Messages.
- Memory subject to RetentionPolicy and RedactionRequest.

## Tool
Represents an executable capability available to the AI runtime.

Attributes:
- tool_id
- name
- version
- owner_service
- risk_level
- input_schema
- output_schema
- enabled

Relations:
- Tool is constrained by ToolPermission.
- Tool invocation produces ToolExecution records.

## ToolPermission
Defines which agents/users can invoke which tools under which constraints.

Attributes:
- permission_id
- tenant_id
- principal_type (user, agent, role)
- principal_id
- tool_id
- scope
- allow/deny
- created_at

## ToolExecution
Audit record for tool invocation.

Attributes:
- execution_id
- conversation_id
- message_id
- tool_id
- request_payload
- response_payload
- status
- latency_ms
- policy_decision
- created_at

## PolicyProfile
Defines moderation/safety/compliance behavior.

Attributes:
- policy_profile_id
- tenant_id
- name
- policy_version
- thresholds
- escalation_rules
- created_at, updated_at

## RetrievalSession
Captures contextual retrieval operations per response.

Attributes:
- retrieval_session_id
- conversation_id
- query
- retrieved_memory_ids
- ranking_strategy
- created_at

## Subscription
Represents billing entitlements and plan constraints.

Attributes:
- subscription_id
- tenant_id
- user_id
- plan_id
- status
- quota_limits
- renewal_at

## AuditEvent
Immutable event log for compliance and forensics.

Attributes:
- audit_event_id
- tenant_id
- actor_type
- actor_id
- action
- target_type
- target_id
- metadata
- occurred_at



## AgentIdentity
Represents the persisted audiovisual identity envelope for an agent.

Attributes:
- identity_id
- agent_id
- contract_version (v1)
- image_profile (style, palette, prompt, seed, negative_prompt, aspect_ratio)
- voice_profile (voice_name, timbre, pace, pitch, expressiveness, stability, speaking_style_prompt)
- generated_at

Relations:
- AgentIdentity belongs to Agent.
- AgentIdentity is consumed by MediaGenerationPlan for downstream rendering runtimes.

## MediaGenerationPlan
Represents executable, versioned tasks that prepare downstream image and voice generation jobs.

Attributes:
- plan_id
- agent_id
- contract_version (v1)
- tasks[] (image and voice task payloads)
- prepared_at

Relations:
- MediaGenerationPlan is derived from AgentIdentity.
- MediaGenerationPlan is consumed by media workers/orchestrators.

## LabScenario
Represents a predefined interpersonal challenge used by Human Complexity Lab.

Attributes:
- scenario_id
- title
- context
- objective
- prompt
- difficulty (introductory, intermediate, advanced)
- tags[]

Relations:
- LabScenario has many LabSessions.

## LabSession
Represents an active or completed simulation run for one participant and scenario.

Attributes:
- session_id
- scenario_id
- participant_id (optional)
- status (active, completed)
- started_at
- completed_at (nullable)

Relations:
- LabSession belongs to LabScenario.
- LabSession has many LabSessionEvents.
- LabSession generates one LabSessionResult on completion.

## LabSessionEvent
Represents one participant reflection/response captured during a lab session.

Attributes:
- event_id
- session_id
- response_text
- emotional_state (optional)
- confidence (0..1, optional)
- created_at

Relations:
- LabSessionEvent belongs to LabSession.

## LabSessionResult
Represents post-session computed metrics used by results views.

Attributes:
- session_id
- scenario_id
- event_count
- average_confidence (nullable)
- summary
- completed_at

## 3) Relationship Summary

- User 1..* Conversation
- Conversation 1..* Message
- User 1..* Memory
- Agent 1..* Conversation
- Message 0..* ToolExecution
- Tool 1..* ToolExecution
- Agent/User *..* Tool via ToolPermission
- PolicyProfile 1..* Agent
- Conversation 0..* RetrievalSession
- All mutable entities -> AuditEvent trail
- LabScenario 1..* LabSession
- LabSession 1..* LabSessionEvent
- LabSession 1..1 LabSessionResult

## 4) Data Lifecycle Considerations

- Soft-delete operational entities first; hard-delete via retention workflows.
- Memory and conversation deletion must propagate to indexes/embeddings.
- AuditEvent is append-only and immutable.
