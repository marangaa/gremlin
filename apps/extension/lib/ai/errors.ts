export type AgentActionCode =
  | 'CONFIGURE_API_KEY'
  | 'SELECT_MODEL'
  | 'CHECK_ENDPOINT'
  | 'RETRY_WITH_BACKOFF'
  | 'REFINE_GOAL_INPUT';

export abstract class AgentBaseError extends Error {
  public abstract readonly code: string;
  public abstract readonly actionCode: AgentActionCode;
  public abstract readonly remediation: string;
  public readonly timestamp: number = Date.now();

  constructor(
    message: string,
    public readonly agentName: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      agentName: this.agentName,
      message: this.message,
      actionCode: this.actionCode,
      remediation: this.remediation,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Thrown when the model provider or API key is unconfigured or misconfigured.
 */
export class AgentConfigurationError extends AgentBaseError {
  public override readonly name = 'AgentConfigurationError';
  public override readonly code = 'AGENT_CONFIGURATION_MISSING';
  public override readonly actionCode: AgentActionCode = 'CONFIGURE_API_KEY';
  public override readonly remediation =
    'Provide a valid API key or local endpoint in Model Settings to activate autonomous AI reasoning.';
}

/**
 * Thrown when the upstream model provider returns rate limit, auth failure, or 5xx.
 */
export class ModelProviderError extends AgentBaseError {
  public override readonly name = 'ModelProviderError';
  public override readonly code = 'MODEL_PROVIDER_FAILURE';
  public override readonly actionCode: AgentActionCode;
  public override readonly remediation: string;

  constructor(
    message: string,
    agentName: string,
    public readonly statusCode?: number,
    originalError?: unknown,
  ) {
    super(message, agentName, originalError);
    if (statusCode === 429) {
      this.actionCode = 'RETRY_WITH_BACKOFF';
      this.remediation = 'Model provider quota exceeded or rate-limited. Wait a moment or upgrade your tier.';
    } else if (statusCode === 401 || statusCode === 403) {
      this.actionCode = 'CONFIGURE_API_KEY';
      this.remediation = 'Invalid or expired API key. Please verify your credentials in Model Settings.';
    } else {
      this.actionCode = 'SELECT_MODEL';
      this.remediation = 'Upstream model request failed. Verify model provider status or switch models.';
    }
  }
}

/**
 * Thrown when input context fails domain validation (e.g. empty sprint, blank input).
 */
export class ContextValidationError extends AgentBaseError {
  public override readonly name = 'ContextValidationError';
  public override readonly code = 'INVALID_AGENT_CONTEXT';
  public override readonly actionCode: AgentActionCode = 'REFINE_GOAL_INPUT';
  public override readonly remediation =
    'Input context is empty or invalid. Provide a clear focus intention.';
}

/**
 * Functional Result union for clean, typed agent execution.
 */
export interface AgentUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export type AgentResult<T> =
  | { success: true; data: T; executionTimeMs: number; usage?: AgentUsage }
  | { success: false; error: AgentBaseError; executionTimeMs: number };
