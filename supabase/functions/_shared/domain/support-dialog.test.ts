import {
  completeSupportDialog,
  createSupportDialogState,
  getNextSupportDialogAction,
  markInstallationGuideOffered,
  type SupportDialogAction,
  type SupportDialogUpdate,
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

const REMOTE_FACTS: SupportDialogUpdate = {
  assistanceType: 'remote',
  problemDescription: 'Не печатает принтер',
  hasInternet: true,
  remoteAccessStatus: 'available',
};

const ONSITE_FACTS: SupportDialogUpdate = {
  assistanceType: 'onsite',
  problemDescription: 'Компьютер не включается',
  fullName: 'Иванов Иван Иванович',
  address: 'Москва, ул. Примерная, д. 1',
  phone: '+7 999 123-45-67',
};

const ACTION_CASES: {
  name: string;
  update: SupportDialogUpdate;
  expected: SupportDialogAction;
}[] = [
  {
    name: 'asks for the problem before collecting route-specific details',
    update: { assistanceType: 'onsite' },
    expected: { type: 'ask_problem' },
  },
  {
    name: 'keeps insufficient information separate from onsite assistance',
    update: { problemDescription: 'Не работает' },
    expected: { type: 'clarify_assistance_type', reason: 'unknown' },
  },
  {
    name: 'groups unknown remote prerequisites into one action',
    update: { assistanceType: 'remote', problemDescription: 'Не печатает принтер' },
    expected: { type: 'ask_remote_setup', missing: ['hasInternet', 'remoteAccessStatus'] },
  },
  {
    name: 'does not ask again about known internet availability',
    update: { ...REMOTE_FACTS, remoteAccessStatus: 'unknown' },
    expected: { type: 'ask_remote_setup', missing: ['remoteAccessStatus'] },
  },
  {
    name: 'does not ask again about available remote software',
    update: { ...REMOTE_FACTS, hasInternet: null },
    expected: { type: 'ask_remote_setup', missing: ['hasInternet'] },
  },
  {
    name: 'does not assume internet availability when software is missing',
    update: { ...REMOTE_FACTS, hasInternet: null, remoteAccessStatus: 'missing' },
    expected: { type: 'ask_remote_setup', missing: ['hasInternet'] },
  },
  {
    name: 'offers installation instead of automatically choosing onsite assistance',
    update: { ...REMOTE_FACTS, remoteAccessStatus: 'missing' },
    expected: { type: 'offer_installation_guide' },
  },
  {
    name: 'clarifies the route when internet is unavailable',
    update: { ...REMOTE_FACTS, hasInternet: false },
    expected: { type: 'clarify_assistance_type', reason: 'remote_unavailable' },
  },
  {
    name: 'clarifies the route when installation is declined',
    update: { ...REMOTE_FACTS, remoteAccessStatus: 'declined' },
    expected: { type: 'clarify_assistance_type', reason: 'remote_unavailable' },
  },
  {
    name: 'clarifies the route when remote access cannot be prepared',
    update: { ...REMOTE_FACTS, remoteAccessStatus: 'unavailable' },
    expected: { type: 'clarify_assistance_type', reason: 'remote_unavailable' },
  },
  {
    name: 'completes remote intake without requiring onsite contacts or a software name',
    update: REMOTE_FACTS,
    expected: { type: 'complete' },
  },
  {
    name: 'groups only the missing onsite contacts',
    update: {
      assistanceType: 'onsite',
      problemDescription: 'Не включается',
      fullName: 'Иванов Иван',
    },
    expected: { type: 'ask_onsite_details', missing: ['address', 'phone'] },
  },
  {
    name: 'does not accept whitespace as collected contact information',
    update: { ...ONSITE_FACTS, phone: '   ' },
    expected: { type: 'ask_onsite_details', missing: ['phone'] },
  },
  {
    name: 'completes onsite intake without asking remote prerequisites',
    update: ONSITE_FACTS,
    expected: { type: 'complete' },
  },
];

for (const { name, update, expected } of ACTION_CASES) {
  Deno.test(name, () => {
    const state = updateSupportDialog(createSupportDialogState(), update);
    assertEquals(getNextSupportDialogAction(state), expected);
  });
}

Deno.test(
  'preserves existing facts, applies corrections and does not mutate the previous state',
  () => {
    const original = updateSupportDialog(createSupportDialogState(), ONSITE_FACTS);
    const updated = updateSupportDialog(original, { address: '  Другой адрес  ', phone: null });
    assertEquals(updated.facts.address, 'Другой адрес');
    assertEquals(updated.facts.phone, null);
    assertEquals(updated.facts.fullName, original.facts.fullName);
    assertEquals(original.facts.address, ONSITE_FACTS.address);
    assertEquals(original.facts.phone, ONSITE_FACTS.phone);
  },
);

Deno.test('preserves a negative internet answer instead of treating it as missing', () => {
  const state = updateSupportDialog(createSupportDialogState(), { hasInternet: false });
  assertEquals(
    updateSupportDialog(state, { problemDescription: 'Принтер' }).facts.hasInternet,
    false,
  );
});

Deno.test('waits for installation results without offering the same guide again', () => {
  const state = updateSupportDialog(createSupportDialogState(), {
    ...REMOTE_FACTS,
    remoteAccessStatus: 'missing',
  });
  const offered = markInstallationGuideOffered(state);
  assertEquals(state.hasOfferedInstallationGuide, false);
  assertEquals(getNextSupportDialogAction(offered), { type: 'ask_installation_result' });
  assertThrows(() => completeSupportDialog(offered));

  const installed = updateSupportDialog(offered, { remoteAccessStatus: 'available' });
  assertEquals(getNextSupportDialogAction(installed), { type: 'complete' });
});

Deno.test('does not mark a guide as offered when remote setup is unknown', () => {
  assertThrows(() => markInstallationGuideOffered(createSupportDialogState()));
});

Deno.test(
  'switches to onsite intake without losing the problem or already collected contacts',
  () => {
    const remote = updateSupportDialog(createSupportDialogState(), {
      ...REMOTE_FACTS,
      hasInternet: false,
      phone: '+7 999 123-45-67',
    });
    const onsite = updateSupportDialog(remote, { assistanceType: 'onsite' });
    assertEquals(onsite.facts.problemDescription, REMOTE_FACTS.problemDescription);
    assertEquals(getNextSupportDialogAction(onsite), {
      type: 'ask_onsite_details',
      missing: ['fullName', 'address'],
    });
  },
);

Deno.test('rejects premature completion of unknown, remote and onsite intake', () => {
  for (const update of [
    {},
    { ...REMOTE_FACTS, hasInternet: null },
    { ...ONSITE_FACTS, address: null },
  ]) {
    assertThrows(() =>
      completeSupportDialog(updateSupportDialog(createSupportDialogState(), update)),
    );
  }
});

Deno.test('completed intake stays terminal and does not restart on another update', () => {
  const state = updateSupportDialog(createSupportDialogState(), ONSITE_FACTS);
  const completed = completeSupportDialog(state);
  assertEquals(state.status, 'collecting');
  assertEquals(completed.status, 'completed');
  assertEquals(getNextSupportDialogAction(completed), { type: 'none' });
  assertEquals(updateSupportDialog(completed, REMOTE_FACTS), completed);
  assertEquals(completeSupportDialog(completed), completed);
});

Deno.test('a new dialog has fresh facts and a separate installation guide flag', () => {
  const previous = completeSupportDialog(
    updateSupportDialog(createSupportDialogState(), ONSITE_FACTS),
  );
  const next = createSupportDialogState();
  assertEquals(next.status, 'collecting');
  assertEquals(next.facts.problemDescription, null);
  assertEquals(next.facts.fullName, null);
  assertEquals(next.facts.phone, null);
  assertEquals(next.hasOfferedInstallationGuide, false);
  assertEquals(previous.status, 'completed');
});
