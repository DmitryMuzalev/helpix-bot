import { createSupportDialogState, type SupportDialogState } from '../domain/support-dialog.ts';

export interface SupportCase {
  id: number;
  clientId: number;
  state: SupportDialogState;
}

export interface SupportCaseRepository {
  findActiveByClientId(clientId: number): Promise<SupportCase | null>;
  createIfNoneActive(clientId: number, state: SupportDialogState): Promise<SupportCase | null>;
  update(id: number, state: SupportDialogState): Promise<boolean>;
}

export class InvalidSupportCaseInput extends Error {}

export class SupportCaseNotFound extends Error {
  constructor() {
    super('Support case not found');
  }
}

export class SupportCaseCreationFailed extends Error {
  constructor() {
    super('Unable to create or load an active support case');
  }
}

function validateId(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InvalidSupportCaseInput(`${name} must be a positive safe integer`);
  }
  return value;
}

export async function getOrCreateActiveSupportCase(
  clientId: number,
  repository: SupportCaseRepository,
): Promise<SupportCase> {
  const validClientId = validateId(clientId, 'clientId');
  const existing = await repository.findActiveByClientId(validClientId);
  if (existing) return existing;

  const created = await repository.createIfNoneActive(validClientId, createSupportDialogState());
  if (created) return created;

  // A concurrent message may have created the client's active case first.
  const concurrent = await repository.findActiveByClientId(validClientId);
  if (concurrent) return concurrent;
  throw new SupportCaseCreationFailed();
}

export async function saveSupportCase(
  supportCase: SupportCase,
  repository: SupportCaseRepository,
): Promise<void> {
  const id = validateId(supportCase.id, 'supportCase.id');
  if (!(await repository.update(id, supportCase.state))) throw new SupportCaseNotFound();
}
