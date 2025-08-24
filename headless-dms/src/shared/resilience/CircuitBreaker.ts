/**
 * Circuit Breaker Implementation
 * 
 * Implements the circuit breaker pattern for resilience:
 * - Prevents cascading failures
 * - Provides fast failure responses
 * - Enables automatic recovery
 * - Collects metrics for monitoring
 */

import { Result } from '@carbonteq/fp';
import { AppError } from '@carbonteq/hexapp';
import { 
  CircuitBreakerState, 
  CircuitBreakerStateManager,
  type CircuitBreakerStateData 
} from './CircuitBreakerState.js';
import { 
  CircuitBreakerConfigManager, 
  type CircuitBreakerConfig 
} from './CircuitBreakerConfig.js';

/**
 * Circuit Breaker Error Types
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitBreakerState,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }

  static openCircuit(metadata?: Record<string, unknown>): CircuitBreakerError {
    return new CircuitBreakerError(
      'Circuit breaker is open - service unavailable',
      CircuitBreakerState.OPEN,
      metadata
    );
  }

  static halfOpenLimitReached(metadata?: Record<string, unknown>): CircuitBreakerError {
    return new CircuitBreakerError(
      'Half-open circuit breaker limit reached',
      CircuitBreakerState.HALF_OPEN,
      metadata
    );
  }
}

/**
 * Circuit Breaker Metrics
 * Collected when metrics are enabled
 */
export interface CircuitBreakerMetrics {
  readonly name: string;
  readonly currentState: CircuitBreakerState;
  readonly failureCount: number;
  readonly totalRequestCount: number;
  readonly successRate: number;
  readonly failureRate: number;
  readonly lastFailureTime?: Date;
  readonly lastStateChangeTime: Date;
  readonly consecutiveSuccessCount: number;
  readonly isEnabled: boolean;
  readonly config: CircuitBreakerConfig;
}

/**
 * Circuit Breaker Options
 * For executing operations with the circuit breaker
 */
export interface CircuitBreakerOptions {
  readonly operationName?: string;
  readonly timeoutMs?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Circuit Breaker Implementation
 * Main class that orchestrates the circuit breaker pattern
 */
export class CircuitBreaker {
  private readonly stateManager: CircuitBreakerStateManager;
  private readonly configManager: CircuitBreakerConfigManager;
  private readonly name: string;
  private halfOpenCallCount: number = 0;

  constructor(
    configManager: CircuitBreakerConfigManager = new CircuitBreakerConfigManager(),
    maxHistorySize?: number
  ) {
    this.configManager = configManager;
    this.name = configManager.getName();
    this.stateManager = new CircuitBreakerStateManager(
      maxHistorySize || configManager.get('MAX_HISTORY_SIZE')
    );
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: CircuitBreakerOptions = {}
  ): Promise<Result<T, CircuitBreakerError | AppError>> {
    // Check if circuit breaker is enabled
    if (!this.configManager.isEnabled()) {
      return this.executeOperation(operation);
    }

    try {
      // Check circuit breaker state before execution
      const stateCheck = this.checkState(options);
      if (stateCheck.isErr()) {
        return Result.Err(stateCheck.unwrapErr());
      }

      // Execute the operation
      const result = await this.executeOperation(operation);
      
      // Record success and potentially close circuit
      this.recordSuccess();
      this.attemptCloseCircuit();
      
      return result;
      
    } catch (error) {
      // Record failure and potentially open circuit
      this.recordFailure();
      this.attemptOpenCircuit(options);
      
      // Return the original error wrapped in Result
      if (error instanceof AppError) {
        return Result.Err(error);
      }
      
      return Result.Err(AppError.Generic(error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Execute an operation that returns Result<T, E>
   */
  async executeWithResult<T, E extends Error>(
    operation: () => Promise<Result<T, E>>,
    options: CircuitBreakerOptions = {}
  ): Promise<Result<T, CircuitBreakerError | E>> {
    // Check if circuit breaker is enabled
    if (!this.configManager.isEnabled()) {
      return operation();
    }

    try {
      // Check circuit breaker state before execution
      const stateCheck = this.checkState(options);
      if (stateCheck.isErr()) {
        return Result.Err(stateCheck.unwrapErr());
      }

      // Execute the operation
      const result = await operation();
      
      if (result.isOk()) {
        // Record success and potentially close circuit
        this.recordSuccess();
        this.attemptCloseCircuit();
      } else {
        // Record failure and potentially open circuit
        this.recordFailure();
        this.attemptOpenCircuit(options);
      }
      
      return result;
      
    } catch (error) {
      // Record failure and potentially open circuit
      this.recordFailure();
      this.attemptOpenCircuit(options);
      
      // Re-throw the error as it's unexpected
      throw error;
    }
  }

  /**
   * Check if the circuit breaker allows execution
   */
  private checkState(options: CircuitBreakerOptions): Result<void, CircuitBreakerError> {
    const currentState = this.stateManager.getCurrentState().currentState;
    
    switch (currentState) {
      case CircuitBreakerState.CLOSED:
        return Result.Ok(undefined);
        
      case CircuitBreakerState.OPEN:
        // Check if timeout has elapsed for potential half-open transition
        if (this.shouldAttemptHalfOpen()) {
          this.transitionToHalfOpen(options);
          return Result.Ok(undefined);
        }
        return Result.Err(CircuitBreakerError.openCircuit(options.metadata));
        
      case CircuitBreakerState.HALF_OPEN:
        // Check if we've reached the limit for half-open calls
        if (this.halfOpenCallCount >= this.configManager.get('HALF_OPEN_MAX_CALLS')) {
          return Result.Err(CircuitBreakerError.halfOpenLimitReached(options.metadata));
        }
        this.halfOpenCallCount++;
        return Result.Ok(undefined);
        
      default:
        return Result.Err(CircuitBreakerError.openCircuit(options.metadata));
    }
  }

  /**
   * Execute the actual operation
   */
  private async executeOperation<T>(operation: () => Promise<T>): Promise<Result<T, AppError>> {
    try {
      const result = await operation();
      return Result.Ok(result);
    } catch (error) {
      if (error instanceof AppError) {
        return Result.Err(error);
      }
      return Result.Err(AppError.Generic(error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Check if enough time has passed to attempt half-open transition
   */
  private shouldAttemptHalfOpen(): boolean {
    return this.stateManager.hasTimeoutElapsed(this.configManager.get('TIMEOUT_MS'));
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(options: CircuitBreakerOptions): void {
    this.stateManager.transitionTo(
      CircuitBreakerState.HALF_OPEN,
      'Timeout elapsed, attempting recovery',
      options.metadata
    );
    this.halfOpenCallCount = 0;
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(): void {
    this.stateManager.recordSuccess();
  }

  /**
   * Record a failed operation
   */
  private recordFailure(): void {
    this.stateManager.recordFailure();
  }

  /**
   * Attempt to open the circuit if failure threshold is reached
   */
  private attemptOpenCircuit(options: CircuitBreakerOptions): void {
    const currentState = this.stateManager.getCurrentState();
    
    if (currentState.currentState === CircuitBreakerState.CLOSED &&
        currentState.failureCount >= this.configManager.get('FAILURE_THRESHOLD')) {
      
      this.stateManager.transitionTo(
        CircuitBreakerState.OPEN,
        `Failure threshold (${this.configManager.get('FAILURE_THRESHOLD')}) reached`,
        { ...options.metadata, failureCount: currentState.failureCount }
      );
    }
  }

  /**
   * Attempt to close the circuit if success threshold is reached
   */
  private attemptCloseCircuit(): void {
    const currentState = this.stateManager.getCurrentState();
    
    if (currentState.currentState === CircuitBreakerState.HALF_OPEN &&
        this.stateManager.hasEnoughConsecutiveSuccesses(this.configManager.get('SUCCESS_THRESHOLD'))) {
      
      this.stateManager.transitionTo(
        CircuitBreakerState.CLOSED,
        `Success threshold (${this.configManager.get('SUCCESS_THRESHOLD')}) reached`,
        { consecutiveSuccessCount: currentState.consecutiveSuccessCount }
      );
      
      this.stateManager.resetFailureCount();
      this.halfOpenCallCount = 0;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerStateData {
    return this.stateManager.getCurrentState();
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const state = this.stateManager.getCurrentState();
    const config = this.configManager.getConfig();
    
    return {
      name: this.name,
      currentState: state.currentState,
      failureCount: state.failureCount,
      totalRequestCount: state.totalRequestCount,
      successRate: this.stateManager.getSuccessRate(),
      failureRate: this.stateManager.getFailureRate(),
      lastFailureTime: state.lastFailureTime,
      lastStateChangeTime: state.lastStateChangeTime,
      consecutiveSuccessCount: state.consecutiveSuccessCount,
      isEnabled: this.configManager.isEnabled(),
      config
    };
  }

  /**
   * Get state transition history
   */
  getStateHistory() {
    return this.stateManager.getStateHistory();
  }

  /**
   * Manually force circuit breaker to open state
   */
  forceOpen(reason: string = 'Manually forced open', metadata?: Record<string, unknown>): void {
    this.stateManager.transitionTo(CircuitBreakerState.OPEN, reason, metadata);
  }

  /**
   * Manually force circuit breaker to closed state
   */
  forceClose(reason: string = 'Manually forced closed', metadata?: Record<string, unknown>): void {
    this.stateManager.transitionTo(CircuitBreakerState.CLOSED, reason, metadata);
    this.stateManager.resetFailureCount();
    this.halfOpenCallCount = 0;
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(reason: string = 'Reset to initial state', metadata?: Record<string, unknown>): void {
    this.stateManager.transitionTo(CircuitBreakerState.CLOSED, reason, metadata);
    this.stateManager.resetFailureCount();
    this.halfOpenCallCount = 0;
  }

  /**
   * Check if circuit breaker is enabled
   */
  isEnabled(): boolean {
    return this.configManager.isEnabled();
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }
}
