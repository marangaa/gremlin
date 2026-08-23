import type { InterventionKind, SessionEpisode } from '@gremlin/shared';
import { episodeLogStorage } from '../storage';

/** Maximum number of episodes retained in the log; oldest entries are dropped. */
const MAX_EPISODES = 300;

function generateEpisodeId(): string {
  const rand4 = (Math.random().toString(36) + '0000').slice(2, 6);
  return `ep_${Date.now()}_${rand4}`;
}

/**
 * Records an episode at the head of the log, capping the log at 300 entries.
 * Generates an id when the input omits one.
 */
export async function recordEpisode(
  ep: Omit<SessionEpisode, 'id' | 'ts'> & { id?: string; ts?: number },
): Promise<SessionEpisode> {
  const episode: SessionEpisode = { ts: Date.now(), ...ep, id: ep.id ?? generateEpisodeId() };
  const log = await episodeLogStorage.getValue();
  await episodeLogStorage.setValue([episode, ...log].slice(0, MAX_EPISODES));
  return episode;
}

/**
 * Opens an intervention episode, starting a new intervention→outcome pair.
 */
export async function openIntervention(input: {
  kind: InterventionKind;
  level: number;
  remark?: string;
  domain?: string;
  goalTitle?: string;
}): Promise<SessionEpisode> {
  const detail = `Intervention ${input.kind} (level ${input.level})${
    input.remark ? `: "${input.remark}"` : ''
  }${input.domain ? ` on ${input.domain}` : ''}`;
  return recordEpisode({
    ts: Date.now(),
    type: 'intervention',
    domain: input.domain,
    goalTitle: input.goalTitle,
    detail,
    intervention: { kind: input.kind, level: input.level, remark: input.remark },
  });
}

/**
 * Closes the most recent intervention still awaiting an outcome by inserting a
 * following 'outcome' episode that references it via its detail text.
 * @returns Number of outcomes closed (0 when no open intervention exists).
 */
export async function closeOpenOutcomes(outcome: {
  returnedWithinMin?: number;
  effective?: boolean;
}): Promise<number> {
  const log = await episodeLogStorage.getValue();
  const isOpen = (iv: SessionEpisode): boolean =>
    !log.some((e) => e.type === 'outcome' && e.detail.includes(iv.id));
  const idx = log.findIndex((e) => e.type === 'intervention' && isOpen(e));
  if (idx === -1) {
    return 0;
  }
  const open = log.at(idx);
  if (!open) {
    return 0;
  }
  const outcomeEp: SessionEpisode = {
    id: generateEpisodeId(),
    ts: Date.now(),
    type: 'outcome',
    domain: open.domain,
    goalTitle: open.goalTitle,
    detail: `Outcome for intervention ${open.id} (${open.intervention?.kind ?? 'unknown'}): ${
      typeof outcome.returnedWithinMin === 'number'
        ? `returned within ${outcome.returnedWithinMin} min`
        : 'no return observed'
    }; effective: ${outcome.effective ? 'yes' : 'no'}`,
    outcome: { ...outcome },
  };
  log.splice(idx, 0, outcomeEp);
  await episodeLogStorage.setValue(log.slice(0, MAX_EPISODES));
  return 1;
}

/**
 * Returns the most recent `n` episodes, newest first.
 */
export async function getRecentEpisodes(n = 50): Promise<SessionEpisode[]> {
  const log = await episodeLogStorage.getValue();
  return log.slice(0, n);
}

/**
 * Returns all episodes recorded since local midnight today, newest first.
 */
export async function getTodaysEpisodes(): Promise<SessionEpisode[]> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const log = await episodeLogStorage.getValue();
  return log.filter((e) => e.ts >= midnight.getTime());
}
