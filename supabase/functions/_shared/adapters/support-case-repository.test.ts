import { createClient } from '@supabase/supabase-js';
import { createSupportDialogState, updateSupportDialog } from '../domain/support-dialog.ts';
import { createSupportCaseRepository } from './support-case-repository.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function createRepository(fetch: typeof globalThis.fetch) {
  const db = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch },
  });
  return createSupportCaseRepository(db);
}

const SUPPORT_CASE_ROW = {
  id: 10,
  client_id: 20,
  status: 'checking_remote',
  assistance_type: 'unknown',
  problem_description: 'Не включается компьютер',
  can_device_start: true,
  has_internet: true,
  has_remote_consent: null,
  remote_access_status: 'unknown',
  remote_access_program: null,
  has_offered_installation_guide: false,
  full_name: 'Иван Иванов',
  phone: '+79991234567',
  address: null,
  preferred_time: null,
} as const;

Deno.test('loads the single active case and maps database names to the domain', async () => {
  const repository = createRepository(async (input, init) => {
    const url = new URL(String(input));
    assert(url.pathname === '/rest/v1/support_cases', 'Unexpected table');
    assert(init?.method === 'GET', 'Unexpected method');
    assert(url.searchParams.get('client_id') === 'eq.20', 'Missing client filter');
    assert(
      url.searchParams.get('status') === 'not.in.(resolved,cancelled)',
      'Closed cases were not excluded',
    );
    assert(url.searchParams.get('limit') === '1', 'Query can load multiple active cases');
    assert(url.searchParams.get('select')?.includes('preferred_time'), 'Fields were omitted');
    return Response.json([SUPPORT_CASE_ROW]);
  });

  const supportCase = await repository.findActiveByClientId(20);
  assert(supportCase?.id === 10 && supportCase.clientId === 20, 'Case identity was lost');
  assert(supportCase.state.status === 'checking_remote', 'Status was not mapped');
  assert(supportCase.state.facts.canDeviceStart === true, 'Boolean fact was not mapped');
  assert(supportCase.state.facts.fullName === 'Иван Иванов', 'Contact was not mapped');
});

Deno.test('returns null when the client has no active case', async () => {
  const repository = createRepository(async () => Response.json([]));
  assert((await repository.findActiveByClientId(20)) === null, 'Missing case was returned');
});

Deno.test('creates a case with every domain field and maps the returned row', async () => {
  const state = updateSupportDialog(createSupportDialogState(), {
    problemDescription: 'Не включается компьютер',
    fullName: 'Иван Иванов',
    phone: '+79991234567',
  });
  const expectedMutation = {
    client_id: 20,
    status: 'diagnosing',
    assistance_type: 'unknown',
    problem_description: 'Не включается компьютер',
    can_device_start: null,
    has_internet: null,
    has_remote_consent: null,
    remote_access_status: 'unknown',
    remote_access_program: null,
    has_offered_installation_guide: false,
    full_name: 'Иван Иванов',
    phone: '+79991234567',
    address: null,
    preferred_time: null,
  };
  const repository = createRepository(async (input, init) => {
    const url = new URL(String(input));
    assert(
      url.pathname === '/rest/v1/support_cases' && init?.method === 'POST',
      'Unexpected create',
    );
    assertEquals(JSON.parse(String(init.body)), expectedMutation, 'Unexpected inserted fields');
    return Response.json({ id: 10, ...expectedMutation }, { status: 201 });
  });

  const created = await repository.createIfNoneActive(20, state);
  assert(created?.id === 10 && created.clientId === 20, 'Created identity was lost');
  assert(
    created?.state.facts.problemDescription === state.facts.problemDescription,
    'State was lost',
  );
});

Deno.test('returns null only for a concurrent active-case conflict', async () => {
  const conflict = createRepository(async () =>
    Response.json(
      { code: '23505', message: 'duplicate key', details: null, hint: null },
      { status: 409 },
    ),
  );
  assert(
    (await conflict.createIfNoneActive(20, createSupportDialogState())) === null,
    'Unique conflict was not reported',
  );

  const failure = createRepository(async () =>
    Response.json(
      { code: '42501', message: 'permission denied', details: null, hint: null },
      { status: 403 },
    ),
  );
  let hasThrown = false;
  try {
    await failure.createIfNoneActive(20, createSupportDialogState());
  } catch {
    hasThrown = true;
  }
  assert(hasThrown, 'Non-conflict database error was swallowed');
});

Deno.test('updates every state field for only the selected case', async () => {
  const state = updateSupportDialog(createSupportDialogState(), {
    problemDescription: 'Не работает интернет',
    canDeviceStart: true,
    hasInternet: false,
  });
  const repository = createRepository(async (input, init) => {
    const url = new URL(String(input));
    assert(
      url.pathname === '/rest/v1/support_cases' && init?.method === 'PATCH',
      'Unexpected update',
    );
    assert(url.searchParams.get('id') === 'eq.10', 'Update may affect another case');
    const body = JSON.parse(String(init.body));
    assert(body.problem_description === 'Не работает интернет', 'Problem was omitted');
    assert(body.can_device_start === true && body.has_internet === false, 'Facts were omitted');
    assert(!('client_id' in body) && !('id' in body), 'Identity can be overwritten');
    assert(url.searchParams.get('select') === 'id', 'Updated ID was not requested');
    return Response.json({ id: 10 });
  });

  assert(await repository.update(10, state), 'Updated case was reported missing');
});

Deno.test('reports zero updated rows as a missing case', async () => {
  const repository = createRepository(async () => Response.json([]));
  assert(
    !(await repository.update(10, createSupportDialogState())),
    'Missing case was reported as updated',
  );
});
