/**
 * Retry function with exponential backoff
 *
 * Handles transient failures in VLM API calls with increasing delays
 * between retries.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 5,
  initialDelayMs: 1000,      // 1 second
  maxDelayMs: 30000,         // 30 seconds
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Retry an async operation with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of successful execution
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if we've exhausted attempts
      if (attempt === opts.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delayMs = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelayMs
      );

      // Call retry callback
      opts.onRetry(lastError, attempt + 1, delayMs);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError || new Error('Retry failed with no error');
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (e.g., network errors, rate limits)
 */
export function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /rate limit/i,
    /too many requests/i,
    /503/,
    /502/,
    /504/,
  ];

  const message = error.message.toLowerCase();
  return retryablePatterns.some(pattern => pattern.test(message));
}

/**
 * Retry only if error is retryable
 */
export async function retryIfRetryable<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    ...options,
    onRetry: (error, attempt, delayMs) => {
      if (!isRetryableError(error)) {
        throw error; // Don't retry non-retryable errors
      }
      options.onRetry?.(error, attempt, delayMs);
    },
  });
}
