import {
  cancelSupportCase,
  createSupportDialogState,
  editSupportCaseContacts,
  getNextSupportDialogAction,
  markInstallationGuideOffered,
  recordSolutionResult,
  recordSolutionSearch,
  submitSupportCase,
  type SupportDialogState,
  updateSupportDialog,
} from './support-dialog.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertThrows(action: () => unknown): void {
  try {
    action();
  } catch {
    return;
  }
  throw new Error('Expected the operation to be rejected');
}

function createCheckingRemoteState(): SupportDialogState {
  const described = updateSupportDialog(createSupportDialogState(), {
    problemDescription: 'Не печатает принтер',
  });
  return recordSolutionSearch(described, false);
}

function createRemoteContactState(): SupportDialogState {
  return updateSupportDialog(createCheckingRemoteState(), {
    canDeviceStart: true,
    hasInternet: true,
    hasRemoteConsent: true,
    remoteAccessStatus: 'available',
  });
}

function createOnsiteContactState(): SupportDialogState {
  return updateSupportDialog(createCheckingRemoteState(), { canDeviceStart: false });
}

Deno.test('asks for a problem before searching for a solution', () => {
  const state = createSupportDialogState();
  assertEquals(getNextSupportDialogAction(state), { type: 'ask_problem' });
  assertThrows(() => recordSolutionSearch(state, true));

  const described = updateSupportDialog(state, { problemDescription: '  Не включается  ' });
  assertEquals(described.facts.problemDescription, 'Не включается');
  assertEquals(getNextSupportDialogAction(described), { type: 'find_solution' });
});

Deno.test('waits for the user to report whether the proposed solution worked', () => {
  const described = updateSupportDialog(createSupportDialogState(), {
    problemDescription: 'Не работает принтер',
  });
  const waiting = recordSolutionSearch(described, true);
  assertEquals(waiting.status, 'waiting_solution_result');
  assertEquals(getNextSupportDialogAction(waiting), { type: 'ask_solution_result' });
  assertEquals(recordSolutionResult(waiting, true).status, 'resolved');
  assertEquals(recordSolutionResult(waiting, false).status, 'checking_remote');
});

Deno.test('goes directly to remote readiness when no solution was found', () => {
  const state = createCheckingRemoteState();
  assertEquals(state.status, 'checking_remote');
  assertEquals(getNextSupportDialogAction(state), {
    type: 'ask_remote_setup',
    missing: ['canDeviceStart', 'hasInternet', 'hasRemoteConsent', 'remoteAccessStatus'],
  });
});

Deno.test('selects remote help when every remote prerequisite is satisfied', () => {
  const state = createRemoteContactState();
  assertEquals(state.status, 'collecting_contacts');
  assertEquals(state.facts.assistanceType, 'remote');
  assertEquals(getNextSupportDialogAction(state), {
    type: 'ask_contact_details',
    assistanceType: 'remote',
    missing: ['fullName', 'phone', 'preferredTime'],
  });
});

for (const [name, update] of [
  ['the device cannot start', { canDeviceStart: false }],
  ['internet is unavailable', { hasInternet: false }],
  ['the user declines remote access', { hasRemoteConsent: false }],
  ['remote software is declined', { remoteAccessStatus: 'declined' as const }],
  ['remote software cannot be prepared', { remoteAccessStatus: 'unavailable' as const }],
] as const) {
  Deno.test(`selects onsite help when ${name}`, () => {
    const state = updateSupportDialog(createCheckingRemoteState(), update);
    assertEquals(state.status, 'collecting_contacts');
    assertEquals(state.facts.assistanceType, 'onsite');
    assertEquals(getNextSupportDialogAction(state), {
      type: 'ask_contact_details',
      assistanceType: 'onsite',
      missing: ['fullName', 'phone', 'address', 'preferredTime'],
    });
  });
}

Deno.test('offers an installation guide once and waits for its result', () => {
  const state = updateSupportDialog(createCheckingRemoteState(), {
    canDeviceStart: true,
    hasInternet: true,
    hasRemoteConsent: true,
    remoteAccessStatus: 'missing',
  });
  assertEquals(getNextSupportDialogAction(state), { type: 'offer_installation_guide' });

  const offered = markInstallationGuideOffered(state);
  assertEquals(getNextSupportDialogAction(offered), { type: 'ask_installation_result' });
  assertThrows(() => markInstallationGuideOffered(offered));

  const installed = updateSupportDialog(offered, { remoteAccessStatus: 'available' });
  assertEquals(installed.status, 'collecting_contacts');
  assertEquals(installed.facts.assistanceType, 'remote');

  const failed = updateSupportDialog(offered, { remoteAccessStatus: 'unavailable' });
  assertEquals(failed.status, 'collecting_contacts');
  assertEquals(failed.facts.assistanceType, 'onsite');
});

Deno.test('reuses remote contacts and requires an address only for onsite help', () => {
  const remote = updateSupportDialog(createRemoteContactState(), {
    fullName: '  Иван Иванов  ',
    phone: '  +79991234567  ',
    preferredTime: '  После 18:00  ',
  });
  assertEquals(remote.status, 'awaiting_confirmation');
  assertEquals(remote.facts.fullName, 'Иван Иванов');
  assertEquals(getNextSupportDialogAction(remote), { type: 'confirm_submission' });

  const onsite = updateSupportDialog(createOnsiteContactState(), {
    fullName: remote.facts.fullName,
    phone: remote.facts.phone,
    preferredTime: remote.facts.preferredTime,
  });
  assertEquals(onsite.status, 'collecting_contacts');
  assertEquals(getNextSupportDialogAction(onsite), {
    type: 'ask_contact_details',
    assistanceType: 'onsite',
    missing: ['address'],
  });
  assertEquals(
    updateSupportDialog(onsite, { address: 'Москва, ул. Примерная, д. 1' }).status,
    'awaiting_confirmation',
  );
});

Deno.test('allows contact editing before submission and submits only a confirmed case', () => {
  const ready = updateSupportDialog(createRemoteContactState(), {
    fullName: 'Иван Иванов',
    phone: '+79991234567',
    preferredTime: 'После 18:00',
  });
  assertThrows(() => submitSupportCase(createRemoteContactState()));

  const editing = editSupportCaseContacts(ready);
  assertEquals(editing.status, 'collecting_contacts');
  const changed = updateSupportDialog(editing, { phone: '+79997654321' });
  assertEquals(changed.status, 'awaiting_confirmation');
  assertEquals(submitSupportCase(changed).status, 'submitted');
});

Deno.test('cancelled, resolved and submitted cases are terminal', () => {
  const described = updateSupportDialog(createSupportDialogState(), {
    problemDescription: 'Не работает',
  });
  const resolved = recordSolutionResult(recordSolutionSearch(described, true), true);
  const cancelled = cancelSupportCase(described);
  const submitted = submitSupportCase(
    updateSupportDialog(createRemoteContactState(), {
      fullName: 'Иван Иванов',
      phone: '+79991234567',
      preferredTime: 'После 18:00',
    }),
  );

  for (const state of [resolved, cancelled, submitted]) {
    assertEquals(getNextSupportDialogAction(state), { type: 'none' });
    assertEquals(updateSupportDialog(state, { phone: '+70000000000' }), state);
    assertEquals(cancelSupportCase(state), state);
  }
});
