import assert from 'node:assert/strict';
import test from 'node:test';
import { BiographyEngineService } from './biographyService.js';
import { OrchestratorService } from './orchestratorService.js';
import { sampleBiographyInput } from './fixtures/biographyFixture.js';

test('generates and stores structured biography for an agent', async () => {
  const service = new BiographyEngineService();
  const biography = await service.generateInitialBiography(sampleBiographyInput);

  assert.equal(biography.agentId, sampleBiographyInput.agentId);
  assert.equal(biography.items.length, 7);
  assert.ok(biography.items.every((item) => item.eventSummary.length >= 12));
  assert.ok(biography.items.every((item) => item.emotionalImprint.length >= 12));
  assert.ok(biography.items.every((item) => item.currentBehavioralEffect.length >= 12));
  assert.ok(biography.items.every((item) => item.salience >= 0 && item.salience <= 1));
  assert.ok(biography.items.every((item) => item.narrativeAccessibility >= 0 && item.narrativeAccessibility <= 1));
});

test('supports revision and attachment for future memory/media linkage', async () => {
  const service = new BiographyEngineService();
  const biography = await service.generateInitialBiography(sampleBiographyInput);
  const firstItem = biography.items[0];

  const revised = await service.reviseBiographyItem(sampleBiographyInput.agentId, firstItem.id, {
    salience: 0.95,
    currentBehavioralEffect: `${firstItem.currentBehavioralEffect} Uses ritualized check-ins during user stress spikes.`
  });

  assert.equal(revised.version, 2);

  const attached = await service.attachBiographyItem(sampleBiographyInput.agentId, firstItem.id, {
    targetType: 'memory',
    targetId: 'memory-episode-001',
    relation: 'reinforces-pattern'
  });

  assert.equal(attached.version, 3);
  assert.equal(attached.attachments.length, 1);
  assert.equal(attached.attachments[0]?.targetType, 'memory');
});

test('exposes orchestration query surface', async () => {
  const biographyService = new BiographyEngineService();
  await biographyService.generateInitialBiography(sampleBiographyInput);

  const orchestrator = new OrchestratorService(biographyService);
  const biographyContext = await orchestrator.getAgentBiographyContext(sampleBiographyInput.agentId);

  assert.ok(biographyContext);
  assert.equal(biographyContext?.agentId, sampleBiographyInput.agentId);
  assert.ok((biographyContext?.salientSummaries.length ?? 0) > 0);
});
