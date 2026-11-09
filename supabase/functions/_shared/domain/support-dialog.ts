export type AssistanceType = 'unknown' | 'remote' | 'onsite';
export type SupportDialogStatus = 'collecting' | 'completed';

// Missing software can be installed; a refusal or failed installation needs a new route.
export type RemoteAccessStatus = 'unknown' | 'available' | 'missing' | 'declined' | 'unavailable';

export interface SupportDialogFacts {
  assistanceType: AssistanceType;
  problemDescription: string | null;
  hasInternet: boolean | null;
  remoteAccessStatus: RemoteAccessStatus;
  remoteAccessProgram: string | null;
  fullName: string | null;
  address: string | null;
  phone: string | null;
}

export interface SupportDialogState {
  status: SupportDialogStatus;
  facts: SupportDialogFacts;
  hasOfferedInstallationGuide: boolean;
}

// Omitted fields preserve existing facts; null explicitly clears a fact.
export type SupportDialogUpdate = Partial<SupportDialogFacts>;
export type OnsiteDetail = 'fullName' | 'address' | 'phone';
export type RemoteSetupDetail = 'hasInternet' | 'remoteAccessStatus';

export type SupportDialogAction =
  | { type: 'ask_problem' }
  | { type: 'clarify_assistance_type'; reason: 'unknown' | 'remote_unavailable' }
  | { type: 'ask_remote_setup'; missing: RemoteSetupDetail[] }
  | { type: 'offer_installation_guide' }
  | { type: 'ask_installation_result' }
  | { type: 'ask_onsite_details'; missing: OnsiteDetail[] }
  | { type: 'complete' }
  | { type: 'none' };

export function createSupportDialogState(): SupportDialogState {
  return {
    status: 'collecting',
    facts: {
      assistanceType: 'unknown',
      problemDescription: null,
      hasInternet: null,
      remoteAccessStatus: 'unknown',
      remoteAccessProgram: null,
      fullName: null,
      address: null,
      phone: null,
    },
    hasOfferedInstallationGuide: false,
  };
}

function normalizeText(value: string | null): string | null {
  return value?.trim() || null;
}

export function updateSupportDialog(
  state: SupportDialogState,
  update: SupportDialogUpdate,
): SupportDialogState {
  if (state.status === 'completed') return state;

  const facts = { ...state.facts };
  if (update.assistanceType !== undefined) facts.assistanceType = update.assistanceType;
  if (update.hasInternet !== undefined) facts.hasInternet = update.hasInternet;
  if (update.remoteAccessStatus !== undefined) facts.remoteAccessStatus = update.remoteAccessStatus;

  const textFields = [
    'problemDescription',
    'remoteAccessProgram',
    'fullName',
    'address',
    'phone',
  ] as const;
  for (const field of textFields) {
    if (update[field] !== undefined) facts[field] = normalizeText(update[field]);
  }

  return { ...state, facts };
}

export function getNextSupportDialogAction(state: SupportDialogState): SupportDialogAction {
  if (state.status === 'completed') return { type: 'none' };

  const facts = state.facts;
  if (!facts.problemDescription?.trim()) return { type: 'ask_problem' };
  if (facts.assistanceType === 'unknown') {
    return { type: 'clarify_assistance_type', reason: 'unknown' };
  }

  if (facts.assistanceType === 'onsite') {
    const missing = (['fullName', 'address', 'phone'] as const).filter(
      (field) => !facts[field]?.trim(),
    );
    return missing.length > 0 ? { type: 'ask_onsite_details', missing } : { type: 'complete' };
  }

  if (
    facts.hasInternet === false ||
    facts.remoteAccessStatus === 'declined' ||
    facts.remoteAccessStatus === 'unavailable'
  ) {
    return { type: 'clarify_assistance_type', reason: 'remote_unavailable' };
  }

  const missing: RemoteSetupDetail[] = [];
  if (facts.hasInternet === null) missing.push('hasInternet');
  if (facts.remoteAccessStatus === 'unknown') missing.push('remoteAccessStatus');
  if (missing.length > 0) return { type: 'ask_remote_setup', missing };

  if (facts.remoteAccessStatus === 'missing') {
    return {
      type: state.hasOfferedInstallationGuide
        ? 'ask_installation_result'
        : 'offer_installation_guide',
    };
  }

  return { type: 'complete' };
}

// Call only after the configured installation guide has been sent successfully.
export function markInstallationGuideOffered(state: SupportDialogState): SupportDialogState {
  if (getNextSupportDialogAction(state).type !== 'offer_installation_guide') {
    throw new Error('An installation guide is not the next dialog action');
  }
  return { ...state, hasOfferedInstallationGuide: true };
}

// Call after sending the final summary. Completion here means intake, not issue resolution.
export function completeSupportDialog(state: SupportDialogState): SupportDialogState {
  if (state.status === 'completed') return state;
  if (getNextSupportDialogAction(state).type !== 'complete') {
    throw new Error('Required support information is missing');
  }
  return { ...state, status: 'completed' };
}
