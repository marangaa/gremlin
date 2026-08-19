import { type BrowserContext } from './tracker';
import { type FocusSprint, type ChattinessLevel } from '../storage';
import { type OrganismState, type OrganismId } from '../personalities/types';

export type TriggerType =
  | 'NONE'
  | 'GOAL_DIVERGENCE'
  | 'GOAL_RETURN'
  | 'TAB_THRASHING'
  | 'PROLONGED_FOCUS'
  | 'HABITUAL_DISTRACTION'
  | 'IDLE_SLEEP'
  | 'MANUAL_POKE';

export interface SituationEvaluation {
  trigger: TriggerType;
  confidence: number;
  recommendedState: OrganismState;
  reason: string;
  shouldPromptAI: boolean;
}

const DISTRACTION_DOMAINS = new Set([
  'reddit.com',
  'youtube.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'tiktok.com',
  'twitch.tv',
  'facebook.com',
  'netflix.com',
  'news.ycombinator.com',
  'buzzfeed.com',
  '9gag.com',
  'pinterest.com',
]);

const WORK_DOMAINS = new Set([
  'github.com',
  'gitlab.com',
  'stackoverflow.com',
  'notion.so',
  'docs.google.com',
  'figma.com',
  'linear.app',
  'jira.atlassian.com',
  'wxt.dev',
  'localhost',
  'developer.mozilla.org',
  'chatgpt.com',
  'claude.ai',
]);

export function isDistraction(domain: string): boolean {
  if (!domain) return false;
  return Array.from(DISTRACTION_DOMAINS).some((d) => domain.includes(d));
}

export function isWork(domain: string): boolean {
  if (!domain) return false;
  return Array.from(WORK_DOMAINS).some((d) => domain.includes(d));
}

export class HeuristicsEngine {
  private lastRemarkTime: number = 0;
  private lastDivergenceState: boolean = false;

  private getCooldownMs(chattiness: ChattinessLevel): number {
    switch (chattiness) {
      case 'chatty':
        return 60_000; // 1 min
      case 'quiet':
        return 300_000; // 5 min
      case 'balanced':
      default:
        return 150_000; // 2.5 min
    }
  }

  public evaluate(
    ctx: BrowserContext,
    sprint: FocusSprint,
    _organismId: OrganismId,
    chattiness: ChattinessLevel = 'balanced',
  ): SituationEvaluation {
    const now = Date.now();
    const hasActiveSprint = sprint.status === 'active' && Boolean(sprint.goal);
    const onDistraction = isDistraction(ctx.currentDomain);
    const onWorkSite = isWork(ctx.currentDomain);
    const cooldownMs = this.getCooldownMs(chattiness);

    // 1. Idle state
    if (ctx.isIdle) {
      return {
        trigger: 'IDLE_SLEEP',
        confidence: 0.9,
        recommendedState: 'sleeping',
        reason: 'User is idle in browser',
        shouldPromptAI: false,
      };
    }

    // 2. Goal Divergence (Active sprint + Distraction domain)
    if (hasActiveSprint && onDistraction && ctx.timeOnCurrentDomainSec >= 15) {
      const isNewDivergence = !this.lastDivergenceState;
      this.lastDivergenceState = true;

      const canRemark =
        now - this.lastRemarkTime > (isNewDivergence ? 20_000 : cooldownMs);

      return {
        trigger: 'GOAL_DIVERGENCE',
        confidence: 0.95,
        recommendedState: ctx.timeOnCurrentDomainSec > 60 ? 'annoyed' : 'suspicious',
        reason: `Distraction on ${ctx.currentDomain} during sprint: "${sprint.goal}"`,
        shouldPromptAI: canRemark,
      };
    }

    // 3. Goal Return (User returned to productive work)
    if (hasActiveSprint && this.lastDivergenceState && (onWorkSite || !onDistraction)) {
      this.lastDivergenceState = false;
      const canRemark = now - this.lastRemarkTime > 30_000;

      return {
        trigger: 'GOAL_RETURN',
        confidence: 0.85,
        recommendedState: 'celebrating',
        reason: 'User returned to sprint task',
        shouldPromptAI: canRemark,
      };
    }

    // 4. Tab Thrashing (Frantic context switching)
    if (ctx.recentTabSwitchesCount >= 4) {
      const canRemark = now - this.lastRemarkTime > cooldownMs;
      return {
        trigger: 'TAB_THRASHING',
        confidence: 0.75,
        recommendedState: 'confused',
        reason: 'Frequent rapid tab transitions',
        shouldPromptAI: canRemark,
      };
    }

    // 5. Prolonged Focus
    if (hasActiveSprint && onWorkSite && ctx.timeOnCurrentDomainSec >= 900) {
      const canRemark = now - this.lastRemarkTime > cooldownMs;
      return {
        trigger: 'PROLONGED_FOCUS',
        confidence: 0.8,
        recommendedState: 'celebrating',
        reason: '15+ minutes of continuous productive sprint',
        shouldPromptAI: canRemark,
      };
    }

    // 6. Habitual Distraction without sprint
    if (!hasActiveSprint && onDistraction && ctx.timeOnCurrentDomainSec >= 45) {
      const canRemark = now - this.lastRemarkTime > cooldownMs;
      return {
        trigger: 'HABITUAL_DISTRACTION',
        confidence: 0.7,
        recommendedState: 'peek',
        reason: `Browsing ${ctx.currentDomain}`,
        shouldPromptAI: canRemark,
      };
    }

    // Default: Ambient Observation
    return {
      trigger: 'NONE',
      confidence: 0.2,
      recommendedState: 'watching',
      reason: 'Ambient workflow flow',
      shouldPromptAI: false,
    };
  }

  public recordRemarkGiven() {
    this.lastRemarkTime = Date.now();
  }
}

export const heuristicsEngine = new HeuristicsEngine();
