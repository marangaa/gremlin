import { defineExtensionMessaging } from '@webext-core/messaging';
import { type OrganismState } from '../personalities/types';

export interface ProtocolMap {
  triggerReaction(data: {
    state: OrganismState;
    message?: string;
    intensity?: number;
    triggerEffect?: boolean;
  }): void;
  startSprint(data: { goal: string; targetMinutes: number }): Promise<void>;
  stopSprint(): Promise<void>;
  pokeOrganism(): Promise<{ triggered: boolean; message?: string; state?: OrganismState }>;
  clearActivityLog(): Promise<void>;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
