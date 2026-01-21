import { describe, test, expect, vi } from 'vitest';
import { retryWithBackoff, isRetryableError } from '../../src/testing/vlm/retryWithBackoff';

describe('retryWithBackoff', () => {
  test('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on failure and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await retryWithBackoff(fn, {
      initialDelayMs: 10, // Speed up tests
      maxRetries: 5,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('throws after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      retryWithBackoff(fn, {
        initialDelayMs: 10,
        maxRetries: 2,
      })
    ).rejects.toThrow('always fails');

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  test('calls onRetry callback on each retry', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    await retryWithBackoff(fn, {
      initialDelayMs: 10,
      maxRetries: 5,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(
      1,
      expect.any(Error),
      1,
      expect.any(Number)
    );
    expect(onRetry).toHaveBeenNthCalledWith(
      2,
      expect.any(Error),
      2,
      expect.any(Number)
    );
  });

  test('uses exponential backoff delays', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const onRetry = vi.fn((error, attempt, delayMs) => {
      delays.push(delayMs);
    });

    await retryWithBackoff(fn, {
      initialDelayMs: 100,
      backoffMultiplier: 2,
      maxRetries: 5,
      onRetry,
    });

    // Delays should double each time: 100, 200, 400
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(400);
  });

  test('caps delay at maxDelayMs', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const onRetry = vi.fn((error, attempt, delayMs) => {
      delays.push(delayMs);
    });

    await retryWithBackoff(fn, {
      initialDelayMs: 1000,
      backoffMultiplier: 10,
      maxDelayMs: 1500,
      maxRetries: 5,
      onRetry,
    });

    // Second delay would be 10000, but capped at 1500
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(1500); // Capped
  });

  test('handles non-Error objects', async () => {
    const fn = vi.fn().mockRejectedValue('string error');

    await expect(
      retryWithBackoff(fn, {
        initialDelayMs: 10,
        maxRetries: 1,
      })
    ).rejects.toThrow('string error');
  });
});

describe('isRetryableError', () => {
  test('identifies network errors as retryable', () => {
    expect(isRetryableError(new Error('Network error'))).toBe(true);
    expect(isRetryableError(new Error('Connection timeout'))).toBe(true);
  });

  test('identifies rate limit errors as retryable', () => {
    expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true);
    expect(isRetryableError(new Error('Too many requests'))).toBe(true);
  });

  test('identifies 5xx errors as retryable', () => {
    expect(isRetryableError(new Error('HTTP 503 Service Unavailable'))).toBe(true);
    expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
    expect(isRetryableError(new Error('504 Gateway Timeout'))).toBe(true);
  });

  test('identifies non-retryable errors', () => {
    expect(isRetryableError(new Error('Invalid input'))).toBe(false);
    expect(isRetryableError(new Error('Not found'))).toBe(false);
    expect(isRetryableError(new Error('400 Bad Request'))).toBe(false);
  });
});
