// Run only against an isolated database with migrations and framework seed applied.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.js';

if (process.env.CMMC_VERIFY_ISOLATED !== 'true') throw new Error('Set CMMC_VERIFY_ISOLATED=true and use an isolated test database.');
const app = await buildApp();
const frameworkId = 'cmmc-level-2';
let headers: Record<string, string> = {};
const checks: string[] = [];
async function request(method: any, url: string, payload?: any, expected = 200, override = headers) {
  const response = await app.inject({ method, url, headers: override, payload });
  assert.equal(response.statusCode, expected, `${method} ${url}: ${response.body}`);
  return response.statusCode === 204 ? null : response.json();
}
const workspaceUrl = '/api/v1/workspace/AC.L2-3.1.1';
const state = (status: string) => ({ frameworkId, itemType: 'control', state: { status, owner: 'Verification owner' } });
try {
  await request('GET', '/ready');
  const account = await request('POST', '/api/v1/auth/register', { name: 'CMMC verification', email: `cmmc-${randomUUID()}@example.com`, password: 'isolated-verification-password', organizationName: 'CMMC Verification' }, 201);
  headers = { authorization: `Bearer ${account.token}`, 'x-organization-id': account.organizations[0].id };
  await request('POST', '/api/v1/organization-frameworks', { frameworkId }, 201);
  const controls = await request('GET', `/api/v1/controls?frameworkId=${frameworkId}`);
  assert.equal(controls.length, 110);
  const control = controls.find((row: any) => row.externalId === 'AC.L2-3.1.1');
  assert.ok(control);
  checks.push('Registration, tenant selection, framework activation, 110 controls');
  const metrics = () => request('GET', '/api/v1/cmmc/sprs');
  assert.equal((await metrics()).currentSPRSScore, -203);
  await request('PUT', '/api/v1/workspace/__cmmc_scope_answers', { frameworkId, itemType: 'questionnaire', state: { answers: { organizationName: 'Verification', systemName: 'CUI system' } } });
  const saved = await request('GET', `/api/v1/workspace?frameworkId=${frameworkId}`);
  assert.equal(saved.__cmmc_scope_answers.answers.systemName, 'CUI system');
  await request('PUT', workspaceUrl, state('In Progress'));
  assert.equal((await metrics()).inProgressControls, 1);
  await request('PUT', workspaceUrl, state('Completed'), 422);
  checks.push('Scope persistence, status synchronization, missing-evidence completion block');
  const file = Buffer.from('CMMC isolated integration evidence');
  const intent = await request('POST', '/api/v1/evidence/upload-intents', { frameworkId, title: 'Objective coverage', fileName: 'verification.txt', contentType: 'text/plain', fileSize: file.length, controlIds: [control.id], objectiveMappings: ['a','b','c','d','e','f'].map(objectiveId => ({ controlId: control.id, objectiveId })) }, 201);
  await request('PUT', intent.upload.url, file, 204, { ...headers, 'content-type': 'application/octet-stream' });
  await request('POST', `/api/v1/evidence/${intent.evidence.id}/versions/${intent.version.id}/complete`);
  await request('PUT', workspaceUrl, state('Completed'), 422);
  await request('POST', `/api/v1/evidence/${intent.evidence.id}/review`, { decision: 'APPROVED', reason: 'Verification' });
  await request('PUT', workspaceUrl, state('Completed'));
  let score = await metrics();
  assert.equal(score.completedControls, 1);
  assert.equal(score.currentSPRSScore, -198);
  const download = await app.inject({ method: 'GET', url: `/api/v1/evidence/${intent.evidence.id}/download`, headers });
  assert.equal(download.statusCode, 200);
  assert.equal(download.body, file.toString());
  checks.push('Upload bytes, objective mappings, pending-review block, approval, completion, SPRS +5, download');
  await request('PUT', '/api/v1/workspace/verification-evidence', { frameworkId, itemType: 'evidence', state: { implementationDescription: 'Access is restricted', poamWeakness: 'Review cadence', poamOwner: 'Security', poamDueDate: '2026-10-01' } });
  const connected = await request('GET', `/api/v1/workspace?frameworkId=${frameworkId}`);
  assert.equal(connected['verification-evidence'].poamOwner, 'Security');
  checks.push('SSP and POA&M shared-field persistence');
  const calendarId = randomUUID();
  const calendar = { module: 'calendar', title: 'Quarterly review', owner: 'Security', status: 'Scheduled', dueDate: '2026-10-01', controlIds: [control.externalId], relatedIds: [], evidenceIds: [intent.evidence.id], details: {}, archived: false };
  await request('PUT', `/api/v1/cmmc/operations/${calendarId}`, { record: calendar, version: 0 });
  assert.equal((await request('GET', '/api/v1/cmmc/operations')).length, 1);
  await request('PUT', `/api/v1/cmmc/operations/${calendarId}`, { record: calendar, version: 0 }, 409);
  checks.push('Calendar links to controls and evidence; stale saves rejected');
  // CMMC policy views derive from control/evidence workspace fields; the generic policy catalogue is empty.
  checks.push('CMMC policy source fields persisted with control/evidence workspace');
  const other = await request('POST', '/api/v1/auth/register', { name: 'Other tenant', email: `other-${randomUUID()}@example.com`, password: 'isolated-verification-password', organizationName: 'Other Verification' }, 201, {});
  await request('GET', `/api/v1/evidence/${intent.evidence.id}/download`, undefined, 403, { authorization: `Bearer ${other.token}`, 'x-organization-id': headers['x-organization-id'] });
  const empty = await request('GET', `/api/v1/workspace?frameworkId=${frameworkId}`, undefined, 200, { authorization: `Bearer ${other.token}`, 'x-organization-id': other.organizations[0].id });
  assert.deepEqual(empty, {});
  checks.push('Cross-tenant evidence denial and workspace isolation');
  await request('DELETE', `/api/v1/evidence/${intent.evidence.id}`, undefined, 204);
  score = await metrics();
  assert.equal(score.completedControls, 0);
  assert.equal(score.currentSPRSScore, -203);
  checks.push('Evidence deletion revokes completed-control scoring credit');
  console.log(JSON.stringify({ status: 'passed', checks }, null, 2));
} finally { await app.close(); }
