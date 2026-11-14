export type AssistanceType = 'unknown' | 'remote' | 'onsite';
export type SupportCaseStatus =
  | 'diagnosing'
  | 'waiting_solution_result'
  | 'checking_remote'
  | 'collecting_contacts'
  | 'awaiting_confirmation'
  | 'submitted'
  | 'resolved'
  | 'cancelled';

// Missing software can be installed; a refusal or failed installation requires onsite help.
export type RemoteAccessStatus = 'unknown' | 'available' | 'missing' | 'declined' | 'unavailable';

export interface SupportDialogFacts {
  assistanceType: AssistanceType;
  problemDescription: string | null;
  canDeviceStart: boolean | null;
  hasInternet: boolean | null;
  hasRemoteConsent: boolean | null;
  remoteAccessStatus: RemoteAccessStatus;
  remoteAccessProgram: string | null;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  preferredTime: string | null;
}

export interface SupportDialogState {
  status: SupportCaseStatus;
  facts: SupportDialogFacts;
  hasOfferedInstallationGuide: boolean;
}

// Omitted fields preserve existing facts; null explicitly clears a fact.
export type SupportDialogUpdate = Partial<Omit<SupportDialogFacts, 'assistanceType'>>;
export type RemoteSetupDetail =
  'canDeviceStart' | 'hasInternet' | 'hasRemoteConsent' | 'remoteAccessStatus';
export type ContactDetail = 'fullName' | 'phone' | 'address' | 'preferredTime';

export type SupportDialogAction =
  | { type: 'ask_problem' }
  | { type: 'find_solution' }
  | { type: 'ask_solution_result' }
  | { type: 'ask_remote_setup'; missing: RemoteSetupDetail[] }
  | { type: 'offer_installation_guide' }
  | { type: 'ask_installation_result' }
  | {
      type: 'ask_contact_details';
      assistanceType: Exclude<AssistanceType, 'unknown'>;
      missing: ContactDetail[];
    }
  | { type: 'confirm_submission' }
  | { type: 'none' };

export function createSupportDialogState(): SupportDialogState {
  return {
    status: 'diagnosing',
    facts: {
      assistanceType: 'unknown',
      problemDescription: null,
      canDeviceStart: null,
      hasInternet: null,
      hasRemoteConsent: null,
      remoteAccessStatus: 'unknown',
      remoteAccessProgram: null,
      fullName: null,
      phone: null,
      address: null,
      preferredTime: null,
    },
    hasOfferedInstallationGuide: false,
  };
}

function normalizeText(value: string | null): string | null {
  return value?.trim() || null;
}

function isTerminal(status: SupportCaseStatus): boolean {
  return status === 'submitted' || status === 'resolved' || status === 'cancelled';
}

function getMissingContactDetails(facts: SupportDialogFacts): ContactDetail[] {
  const required: ContactDetail[] =
    facts.assistanceType === 'onsite'
      ? ['fullName', 'phone', 'address', 'preferredTime']
      : ['fullName', 'phone', 'preferredTime'];
  return required.filter((field) => !facts[field]?.trim());
}

function determineAssistanceType(facts: SupportDialogFacts): AssistanceType {
  if (
    facts.canDeviceStart === false ||
    facts.hasInternet === false ||
    facts.hasRemoteConsent === false ||
    facts.remoteAccessStatus === 'declined' ||
    facts.remoteAccessStatus === 'unavailable'
  ) {
    return 'onsite';
  }

  if (
    facts.canDeviceStart === true &&
    facts.hasInternet === true &&
    facts.hasRemoteConsent === true &&
    facts.remoteAccessStatus === 'available'
  ) {
    return 'remote';
  }

  return 'unknown';
}

function advanceSupportDialog(state: SupportDialogState): SupportDialogState {
  if (state.status === 'checking_remote') {
    const assistanceType = determineAssistanceType(state.facts);
    if (assistanceType !== 'unknown') {
      return advanceSupportDialog({
        ...state,
        status: 'collecting_contacts',
        facts: { ...state.facts, assistanceType },
      });
    }
  }

  if (
    state.status === 'collecting_contacts' &&
    state.facts.assistanceType !== 'unknown' &&
    getMissingContactDetails(state.facts).length === 0
  ) {
    return { ...state, status: 'awaiting_confirmation' };
  }

  return state;
}

export function updateSupportDialog(
  state: SupportDialogState,
  update: SupportDialogUpdate,
): SupportDialogState {
  if (isTerminal(state.status)) return state;

  const facts = { ...state.facts };
  if (update.canDeviceStart !== undefined) facts.canDeviceStart = update.canDeviceStart;
  if (update.hasInternet !== undefined) facts.hasInternet = update.hasInternet;
  if (update.hasRemoteConsent !== undefined) facts.hasRemoteConsent = update.hasRemoteConsent;
  if (update.remoteAccessStatus !== undefined) facts.remoteAccessStatus = update.remoteAccessStatus;

  const textFields = [
    'problemDescription',
    'remoteAccessProgram',
    'fullName',
    'phone',
    'address',
    'preferredTime',
  ] as const;
  for (const field of textFields) {
    if (update[field] !== undefined) facts[field] = normalizeText(update[field]);
  }

  return advanceSupportDialog({ ...state, facts });
}

export function recordSolutionSearch(
  state: SupportDialogState,
  hasSolution: boolean,
): SupportDialogState {
  if (state.status !== 'diagnosing' || !state.facts.problemDescription) {
    throw new Error('A described problem is required before searching for a solution');
  }
  return advanceSupportDialog({
    ...state,
    status: hasSolution ? 'waiting_solution_result' : 'checking_remote',
  });
}

export function recordSolutionResult(
  state: SupportDialogState,
  isResolved: boolean,
): SupportDialogState {
  if (state.status !== 'waiting_solution_result') {
    throw new Error('No proposed solution is awaiting a result');
  }
  return advanceSupportDialog({
    ...state,
    status: isResolved ? 'resolved' : 'checking_remote',
  });
}

export function getNextSupportDialogAction(state: SupportDialogState): SupportDialogAction {
  if (state.status === 'diagnosing') {
    return state.facts.problemDescription ? { type: 'find_solution' } : { type: 'ask_problem' };
  }
  if (state.status === 'waiting_solution_result') return { type: 'ask_solution_result' };

  if (state.status === 'checking_remote') {
    const missing: RemoteSetupDetail[] = [];
    if (state.facts.canDeviceStart === null) missing.push('canDeviceStart');
    if (state.facts.hasInternet === null) missing.push('hasInternet');
    if (state.facts.hasRemoteConsent === null) missing.push('hasRemoteConsent');
    if (state.facts.remoteAccessStatus === 'unknown') missing.push('remoteAccessStatus');
    if (missing.length > 0) return { type: 'ask_remote_setup', missing };

    if (state.facts.remoteAccessStatus === 'missing') {
      return {
        type: state.hasOfferedInstallationGuide
          ? 'ask_installation_result'
          : 'offer_installation_guide',
      };
    }
  }

  if (state.status === 'collecting_contacts' && state.facts.assistanceType !== 'unknown') {
    return {
      type: 'ask_contact_details',
      assistanceType: state.facts.assistanceType,
      missing: getMissingContactDetails(state.facts),
    };
  }

  if (state.status === 'awaiting_confirmation') return { type: 'confirm_submission' };
  return { type: 'none' };
}

// Call only after the configured installation guide has been sent successfully.
export function markInstallationGuideOffered(state: SupportDialogState): SupportDialogState {
  if (getNextSupportDialogAction(state).type !== 'offer_installation_guide') {
    throw new Error('An installation guide is not the next dialog action');
  }
  return { ...state, hasOfferedInstallationGuide: true };
}

export function editSupportCaseContacts(state: SupportDialogState): SupportDialogState {
  if (state.status !== 'awaiting_confirmation') {
    throw new Error('The support case is not awaiting confirmation');
  }
  return { ...state, status: 'collecting_contacts' };
}

export function submitSupportCase(state: SupportDialogState): SupportDialogState {
  if (state.status !== 'awaiting_confirmation') {
    throw new Error('The support case is not ready for submission');
  }
  return { ...state, status: 'submitted' };
}

export function cancelSupportCase(state: SupportDialogState): SupportDialogState {
  if (isTerminal(state.status)) return state;
  return { ...state, status: 'cancelled' };
}
