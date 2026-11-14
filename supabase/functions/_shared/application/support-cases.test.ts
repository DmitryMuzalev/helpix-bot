import {
  getOrCreateActiveSupportCase,
  InvalidSupportCaseInput,
  saveSupportCase,
  type SupportCase,
  SupportCaseCreationFailed,
  SupportCaseNotFound,
  type SupportCaseRepository,
} from './support-cases.ts';
import { createSupportDialogState, updateSupportDialog } from '../domain/support-dialog.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertRejects(
  action: () => Promise<unknown>,
  errorType: new (...args: never[]) => Error,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof errorType) return;
    throw error;
  }
  throw new Error(`Expected ${errorType.name}`);
}

function storedCase(id = 10, clientId = 20): SupportCase {
  return { id, clientId, state: createSupportDialogState() };
}

function createRepository(overrides: Partial<SupportCaseRepository> = {}): SupportCaseRepository {
  return {
    async findActiveByClientId() {
      return null;
    },
    async createIfNoneActive(clientId, state) {
      return { id: 10, clientId, state };
    },
    async update() {
      return true;
    },
    ...overrides,
  };
}

Deno.test('returns an existing active case without creating another one', async () => {
  const existing = storedCase();
  let hasCreated = false;
  const repository = createRepository({
    async findActiveByClientId() {
      return existing;
    },
    async createIfNoneActive() {
      hasCreated = true;
      return null;
    },
  });

  assert((await getOrCreateActiveSupportCase(20, repository)) === existing, 'Case was replaced');
  assert(!hasCreated, 'A second active case was created');
});

Deno.test('creates a new active case with a fresh dialog state', async () => {
  let receivedState = null;
  const repository = createRepository({
    async createIfNoneActive(clientId, state) {
      receivedState = state;
      return { id: 10, clientId, state };
    },
  });

  const supportCase = await getOrCreateActiveSupportCase(20, repository);
  assert(supportCase.clientId === 20, 'Case belongs to another client');
  assert(supportCase.state.status === 'diagnosing', 'Case did not start in diagnosis');
  assert(receivedState === supportCase.state, 'Created state was replaced');
});

Deno.test('loads a case created concurrently after a unique conflict', async () => {
  const concurrent = storedCase();
  let lookupCount = 0;
  const repository = createRepository({
    async findActiveByClientId() {
      lookupCount += 1;
      return lookupCount === 1 ? null : concurrent;
    },
    async createIfNoneActive() {
      return null;
    },
  });

  assert(
    (await getOrCreateActiveSupportCase(20, repository)) === concurrent,
    'Concurrent case was not loaded',
  );
  assert(lookupCount === 2, 'Active case was not reloaded exactly once');
});

Deno.test('reports a failed create when no concurrent case can be loaded', async () => {
  const repository = createRepository({
    async createIfNoneActive() {
      return null;
    },
  });
  await assertRejects(
    () => getOrCreateActiveSupportCase(20, repository),
    SupportCaseCreationFailed,
  );
});

Deno.test('saves the selected case state and reports a missing row', async () => {
  const state = updateSupportDialog(createSupportDialogState(), {
    problemDescription: 'Не включается компьютер',
  });
  let updatedId = 0;
  let updatedState = null;
  const repository = createRepository({
    async update(id, nextState) {
      updatedId = id;
      updatedState = nextState;
      return true;
    },
  });

  await saveSupportCase({ id: 10, clientId: 20, state }, repository);
  assert(updatedId === 10 && updatedState === state, 'Unexpected case was saved');

  await assertRejects(
    () => saveSupportCase(storedCase(), createRepository({ update: async () => false })),
    SupportCaseNotFound,
  );
});

Deno.test('rejects invalid identifiers before accessing storage', async () => {
  let hasAccessedStorage = false;
  const fail = async () => {
    hasAccessedStorage = true;
    throw new Error('Unexpected storage access');
  };
  const repository: SupportCaseRepository = {
    findActiveByClientId: fail,
    createIfNoneActive: fail,
    update: fail,
  };

  for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assertRejects(
      () => getOrCreateActiveSupportCase(id, repository),
      InvalidSupportCaseInput,
    );
    await assertRejects(
      () => saveSupportCase({ ...storedCase(), id }, repository),
      InvalidSupportCaseInput,
    );
  }
  assert(!hasAccessedStorage, 'Invalid identifiers reached storage');
});
