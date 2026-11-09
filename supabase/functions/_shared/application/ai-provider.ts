import type { SupportDialogFacts, SupportDialogUpdate } from '../domain/support-dialog.ts';

export interface AiConversationMessage {
  role: 'client' | 'bot';
  text: string;
}

export interface AnalyzeSupportDialogInput {
  facts: Readonly<SupportDialogFacts>;
  // Chronological messages from this dialog only, including the latest client message once.
  history: readonly AiConversationMessage[];
}

export interface SupportDialogAnalysis {
  // Only facts explicitly supported by the client's messages; no invented contact details.
  // Omit unchanged fields. Use null to clear a corrected fact, not to mean "not mentioned".
  update: SupportDialogUpdate;
  // A single intake question, used only when the domain asks to clarify the assistance type.
  // Never technical troubleshooting or a claim that an engineer has received a request.
  clarificationQuestion: string | null;
}

// Adapters validate untrusted provider responses at runtime before returning this contract.
// Providers cannot complete a dialog, mark a guide as sent, or perform external actions.
export interface AiProvider {
  analyzeSupportDialog(input: AnalyzeSupportDialogInput): Promise<SupportDialogAnalysis>;
}
