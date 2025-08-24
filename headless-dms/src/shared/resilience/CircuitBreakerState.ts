/**
 * Circuit Breaker State Management
 * 
 * Manages the three states of a circuit breaker:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 */

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

/**
 * Circuit Breaker State Data
 * Contains the current state and associated metadata
 */
export interface CircuitBreakerStateData {
  readonly currentState: CircuitBreakerState;
  readonly failureCount: number;
  readonly lastFailureTime?: Date;
  readonly lastStateChangeTime: Date;
  readonly consecutiveSuccessCount: number;
  readonly totalRequestCount: number;
}

/**
 * Circuit Breaker State Transition
 * Represents a state change with metadata
 */
export interface CircuitBreakerStateTransition {
  readonly fromState: CircuitBreakerState;
  readonly toState: CircuitBreakerState;
  readonly timestamp: Date;
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Circuit Breaker State Manager
 * Handles state transitions and state data management
 */
export class CircuitBreakerStateManager {
  private stateData: CircuitBreakerStateData;
  private stateHistory: CircuitBreakerStateTransition[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
    this.stateData = {
      currentState: CircuitBreakerState.CLOSED,
      failureCount: 0,
      lastStateChangeTime: new Date(),
      consecutiveSuccessCount: 0,
      totalRequestCount: 0
    };
  }

  /**
   * Get current state data
   */
  getCurrentState(): CircuitBreakerStateData {
    return { ...this.stateData };
  }

  /**
   * Get state transition history
   */
  getStateHistory(): readonly CircuitBreakerStateTransition[] {
    return [...this.stateHistory];
  }

  /**
   * Transition to a new state
   */
  transitionTo(
    newState: CircuitBreakerState, 
    reason: string, 
    metadata?: Record<string, unknown>
  ): void {
    if (newState === this.stateData.currentState) {
      return; // No transition needed
    }

    const transition: CircuitBreakerStateTransition = {
      fromState: this.stateData.currentState,
      toState: newState,
      timestamp: new Date(),
      reason,
      metadata
    };

    // Update state data
    this.stateData = {
      ...this.stateData,
      currentState: newState,
      lastStateChangeTime: new Date()
    };

    // Add to history
    this.stateHistory.push(transition);
    
    // Maintain history size limit
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.stateData = {
      ...this.stateData,
      consecutiveSuccessCount: this.stateData.consecutiveSuccessCount + 1,
      totalRequestCount: this.stateData.totalRequestCount + 1
    };
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.stateData = {
      ...this.stateData,
      failureCount: this.stateData.failureCount + 1,
      consecutiveSuccessCount: 0,
      totalRequestCount: this.stateData.totalRequestCount + 1,
      lastFailureTime: new Date()
    };
  }

  /**
   * Reset failure count (used when transitioning to CLOSED)
   */
  resetFailureCount(): void {
    this.stateData = {
      ...this.stateData,
      failureCount: 0,
      consecutiveSuccessCount: 0
    };
  }

  /**
   * Check if enough time has passed since last failure for timeout-based recovery
   */
  hasTimeoutElapsed(timeoutMs: number): boolean {
    if (!this.stateData.lastFailureTime) {
      return true;
    }
    
    const elapsed = Date.now() - this.stateData.lastFailureTime.getTime();
    return elapsed >= timeoutMs;
  }

  /**
   * Check if enough consecutive successes have occurred for half-open to closed transition
   */
  hasEnoughConsecutiveSuccesses(requiredCount: number): boolean {
    return this.stateData.consecutiveSuccessCount >= requiredCount;
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.stateData.totalRequestCount === 0) {
      return 100;
    }
    
    const successCount = this.stateData.totalRequestCount - this.stateData.failureCount;
    return (successCount / this.stateData.totalRequestCount) * 100;
  }

  /**
   * Get failure rate percentage
   */
  getFailureRate(): number {
    if (this.stateData.totalRequestCount === 0) {
      return 0;
    }
    
    return (this.stateData.failureCount / this.stateData.totalRequestCount) * 100;
  }
}
