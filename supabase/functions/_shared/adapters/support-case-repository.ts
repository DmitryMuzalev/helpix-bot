import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupportCase, SupportCaseRepository } from '../application/support-cases.ts';
import type {
  AssistanceType,
  RemoteAccessStatus,
  SupportCaseStatus,
  SupportDialogState,
} from '../domain/support-dialog.ts';

interface SupportCaseRow {
  id: number;
  client_id: number;
  status: SupportCaseStatus;
  assistance_type: AssistanceType;
  problem_description: string | null;
  can_device_start: boolean | null;
  has_internet: boolean | null;
  has_remote_consent: boolean | null;
  remote_access_status: RemoteAccessStatus;
  remote_access_program: string | null;
  has_offered_installation_guide: boolean;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  preferred_time: string | null;
}

type SupportCaseMutation = Omit<SupportCaseRow, 'id' | 'client_id'>;

const SUPPORT_CASE_COLUMNS = [
  'id',
  'client_id',
  'status',
  'assistance_type',
  'problem_description',
  'can_device_start',
  'has_internet',
  'has_remote_consent',
  'remote_access_status',
  'remote_access_program',
  'has_offered_installation_guide',
  'full_name',
  'phone',
  'address',
  'preferred_time',
].join(',');

function toSupportCase(row: SupportCaseRow): SupportCase {
  return {
    id: row.id,
    clientId: row.client_id,
    state: {
      status: row.status,
      facts: {
        assistanceType: row.assistance_type,
        problemDescription: row.problem_description,
        canDeviceStart: row.can_device_start,
        hasInternet: row.has_internet,
        hasRemoteConsent: row.has_remote_consent,
        remoteAccessStatus: row.remote_access_status,
        remoteAccessProgram: row.remote_access_program,
        fullName: row.full_name,
        phone: row.phone,
        address: row.address,
        preferredTime: row.preferred_time,
      },
      hasOfferedInstallationGuide: row.has_offered_installation_guide,
    },
  };
}

function toMutation(state: SupportDialogState): SupportCaseMutation {
  return {
    status: state.status,
    assistance_type: state.facts.assistanceType,
    problem_description: state.facts.problemDescription,
    can_device_start: state.facts.canDeviceStart,
    has_internet: state.facts.hasInternet,
    has_remote_consent: state.facts.hasRemoteConsent,
    remote_access_status: state.facts.remoteAccessStatus,
    remote_access_program: state.facts.remoteAccessProgram,
    has_offered_installation_guide: state.hasOfferedInstallationGuide,
    full_name: state.facts.fullName,
    phone: state.facts.phone,
    address: state.facts.address,
    preferred_time: state.facts.preferredTime,
  };
}

export function createSupportCaseRepository(db: SupabaseClient): SupportCaseRepository {
  return {
    async findActiveByClientId(clientId) {
      const { data, error } = await db
        .from('support_cases')
        .select(SUPPORT_CASE_COLUMNS)
        .eq('client_id', clientId)
        .not('status', 'in', '(resolved,cancelled)')
        .limit(1)
        .maybeSingle<SupportCaseRow>();
      if (error) throw error;
      return data ? toSupportCase(data) : null;
    },

    async createIfNoneActive(clientId, state) {
      const { data, error } = await db
        .from('support_cases')
        .insert({ client_id: clientId, ...toMutation(state) })
        .select(SUPPORT_CASE_COLUMNS)
        .single<SupportCaseRow>();
      if (error?.code === '23505') return null;
      if (error) throw error;
      return toSupportCase(data);
    },

    async update(id, state) {
      const { data, error } = await db
        .from('support_cases')
        .update(toMutation(state))
        .eq('id', id)
        .select('id')
        .maybeSingle<{ id: number }>();
      if (error) throw error;
      return data !== null;
    },
  };
}
