import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWidgetOrder, normalizeEnabled, buildWidgetSavePayload, resolveWidgetConfig,
  WIDGET_CHANNEL_IDS, WIDGET_DEFAULTS, DEFAULT_POPUP_TITLE, DEFAULT_POPUP_DESCRIPTION,
} from '../src/lib/supportWidget';

// ── normalizeWidgetOrder ───────────────────────────────────────────────────────

test('normalizeWidgetOrder accepts any complete permutation, defaults otherwise', () => {
  assert.deepEqual(normalizeWidgetOrder('ai,zalo,messenger,telegram'), ['ai', 'zalo', 'messenger', 'telegram']);
  assert.deepEqual(normalizeWidgetOrder('telegram,messenger,zalo,ai'), ['telegram', 'messenger', 'zalo', 'ai']);
  assert.deepEqual(normalizeWidgetOrder(undefined), [...WIDGET_CHANNEL_IDS]);
  assert.deepEqual(normalizeWidgetOrder(''), [...WIDGET_CHANNEL_IDS]);
  assert.deepEqual(normalizeWidgetOrder('ai,zalo,messenger'), [...WIDGET_CHANNEL_IDS]); // missing id
  assert.deepEqual(normalizeWidgetOrder('ai,ai,zalo,messenger'), [...WIDGET_CHANNEL_IDS]); // duplicate
  assert.deepEqual(normalizeWidgetOrder('ai,zalo,messenger,discord'), [...WIDGET_CHANNEL_IDS]); // unknown id
  // @ts-expect-error — exercising the runtime guard for a non-string value a caller could still pass at runtime
  assert.deepEqual(normalizeWidgetOrder(1234), [...WIDGET_CHANNEL_IDS]);
});

// ── normalizeEnabled ───────────────────────────────────────────────────────────

test("normalizeEnabled: only the literal 'false' means off", () => {
  assert.equal(normalizeEnabled('false'), 'false');
  assert.equal(normalizeEnabled('true'), 'true');
  assert.equal(normalizeEnabled(undefined), 'true'); // never touched the toggle — same default resolveWidgetConfig reads
  assert.equal(normalizeEnabled(''), 'true'); // legacy empty-string rows already in StoreSetting
  assert.equal(normalizeEnabled('maybe'), 'true');
});

// ── buildWidgetSavePayload — this is what regressed for widget.order AND widget.ai.enabled ──

test('buildWidgetSavePayload on a completely untouched form (first-ever Save) never sends an empty/undefined value', () => {
  const payload = buildWidgetSavePayload({});
  assert.equal(payload['widget.popup.title'], DEFAULT_POPUP_TITLE);
  assert.equal(payload['widget.popup.description'], DEFAULT_POPUP_DESCRIPTION);
  assert.equal(payload['widget.order'], WIDGET_CHANNEL_IDS.join(','));
  assert.equal(payload['widget.ai.enabled'], 'true'); // the exact field that regressed: must never be ''
  for (const id of WIDGET_CHANNEL_IDS) {
    assert.equal(payload[`widget.${id}.name`], WIDGET_DEFAULTS[id].name);
    assert.equal(payload[`widget.${id}.description`], WIDGET_DEFAULTS[id].description);
  }
  for (const id of ['zalo', 'messenger', 'telegram']) {
    assert.equal(payload[`social.${id}.enabled`], 'true');
    assert.equal(payload[`social.${id}.url`], '');
  }
  for (const value of Object.values(payload)) {
    assert.notEqual(value, undefined);
    assert.notEqual(value, null);
  }
});

test('Chatbot AI currently ON, untouched → Save keeps it true', () => {
  const payload = buildWidgetSavePayload({ 'widget.ai.enabled': 'true' });
  assert.equal(payload['widget.ai.enabled'], 'true');
});

test('Chatbot AI currently OFF, untouched → Save keeps it false (does not silently re-enable)', () => {
  const payload = buildWidgetSavePayload({ 'widget.ai.enabled': 'false' });
  assert.equal(payload['widget.ai.enabled'], 'false');
});

test('toggle ON → OFF → Save sends false', () => {
  let values: Record<string, string> = { 'widget.ai.enabled': 'true' };
  values = { ...values, 'widget.ai.enabled': 'false' }; // simulates one click
  assert.equal(buildWidgetSavePayload(values)['widget.ai.enabled'], 'false');
});

test('toggle OFF → ON → Save sends true', () => {
  let values: Record<string, string> = { 'widget.ai.enabled': 'false' };
  values = { ...values, 'widget.ai.enabled': 'true' };
  assert.equal(buildWidgetSavePayload(values)['widget.ai.enabled'], 'true');
});

test('widget.ai.enabled missing from StoreSetting entirely resolves to the same default the UI shows (true), not false', () => {
  const settings = { 'widget.popup.title': 'Custom title' }; // no widget.ai.enabled key at all
  const resolved = resolveWidgetConfig(settings);
  assert.equal(resolved.channels.ai.enabled, true);
  const payload = buildWidgetSavePayload(settings);
  assert.equal(payload['widget.ai.enabled'], 'true');
});

test('reorder + toggle Chatbot AI off in the same Save both land correctly, independently', () => {
  const payload = buildWidgetSavePayload({
    'widget.order': 'zalo,telegram,ai,messenger',
    'widget.ai.enabled': 'false',
  });
  assert.equal(payload['widget.order'], 'zalo,telegram,ai,messenger');
  assert.equal(payload['widget.ai.enabled'], 'false');
});

test('an invalid field elsewhere does not change what buildWidgetSavePayload produces for widget.ai.enabled — the caller/backend rejects the bad field, this function just normalizes', () => {
  // buildWidgetSavePayload itself never throws — validation is a separate step
  // (validateWidgetName/validateWidgetDescription, run by the caller before
  // sending). This test documents that boundary so the two don't get conflated.
  const payload = buildWidgetSavePayload({ 'widget.popup.title': 'x'.repeat(200), 'widget.ai.enabled': 'true' });
  assert.equal(payload['widget.ai.enabled'], 'true');
  assert.equal(payload['widget.popup.title'].length, 200); // the oversized value passes through unvalidated here by design
});

test('Cancel-then-Save round trip: normalizing the same saved snapshot twice is idempotent', () => {
  const saved = { 'widget.ai.enabled': 'false', 'social.zalo.enabled': 'true', 'widget.order': 'telegram,ai,zalo,messenger' };
  const afterCancel = buildWidgetSavePayload(saved); // what Cancel restores into form state
  const afterSave = buildWidgetSavePayload(afterCancel); // what a subsequent Save would send
  assert.deepEqual(afterCancel, afterSave);
  assert.equal(afterSave['widget.ai.enabled'], 'false');
});

test('Reload-then-Save: re-resolving settings fetched fresh from the API, then saving again, is a no-op on widget.ai.enabled', () => {
  const fetchedFromApi = { 'widget.ai.enabled': 'false', 'social.messenger.enabled': 'false' };
  const payload = buildWidgetSavePayload(fetchedFromApi);
  assert.equal(payload['widget.ai.enabled'], 'false');
  assert.equal(payload['social.messenger.enabled'], 'false');
});
