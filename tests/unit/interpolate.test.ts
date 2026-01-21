import { describe, test, expect } from 'vitest';
import { interpolate } from '../../src/core/calculators/interpolate';

describe('interpolate', () => {
  test('returns exact value at breakpoint', () => {
    const table = { 4: 0.3, 8: 1.0 };
    expect(interpolate(table, 4)).toBe(0.3);
    expect(interpolate(table, 8)).toBe(1.0);
  });

  test('interpolates between two breakpoints', () => {
    const table = { 4: 0.3, 8: 1.0 };
    // At value 6 (halfway between 4 and 8): 0.3 + (1.0 - 0.3) * 0.5 = 0.65
    expect(interpolate(table, 6)).toBeCloseTo(0.65);
  });

  test('clamps below minimum breakpoint', () => {
    const table = { 4: 0.3, 8: 1.0 };
    expect(interpolate(table, 2)).toBe(0.3);
    expect(interpolate(table, 0)).toBe(0.3);
  });

  test('clamps above maximum breakpoint', () => {
    const table = { 4: 0.3, 8: 1.0 };
    expect(interpolate(table, 12)).toBe(1.0);
    expect(interpolate(table, 100)).toBe(1.0);
  });

  test('works with multiple breakpoints', () => {
    const table = { 0: 0, 5: 0.5, 10: 1.0, 15: 0.8 };

    // Exact values
    expect(interpolate(table, 0)).toBe(0);
    expect(interpolate(table, 5)).toBe(0.5);
    expect(interpolate(table, 10)).toBe(1.0);
    expect(interpolate(table, 15)).toBe(0.8);

    // Interpolated values
    expect(interpolate(table, 2.5)).toBeCloseTo(0.25); // Halfway between 0 and 5
    expect(interpolate(table, 7.5)).toBeCloseTo(0.75); // Halfway between 5 and 10
    expect(interpolate(table, 12.5)).toBeCloseTo(0.9); // Halfway between 10 and 15
  });

  test('works with non-integer breakpoints', () => {
    const table = { 4.5: 0.3, 8.2: 1.0 };
    expect(interpolate(table, 6.35)).toBeCloseTo(0.65); // Halfway
  });

  test('works with single breakpoint (constant function)', () => {
    const table = { 5: 0.7 };
    expect(interpolate(table, 0)).toBe(0.7);
    expect(interpolate(table, 5)).toBe(0.7);
    expect(interpolate(table, 10)).toBe(0.7);
  });

  test('handles out-of-order breakpoints', () => {
    // Breakpoints provided in random order
    const table = { 10: 1.0, 4: 0.3, 8: 0.7 };

    // Should sort internally and interpolate correctly
    expect(interpolate(table, 6)).toBeCloseTo(0.5); // Halfway between 4 and 8
    expect(interpolate(table, 9)).toBeCloseTo(0.85); // Halfway between 8 and 10
  });

  test('handles negative values', () => {
    const table = { '-10': -1.0, '0': 0, '10': 1.0 };
    expect(interpolate(table, -5)).toBeCloseTo(-0.5);
    expect(interpolate(table, 5)).toBeCloseTo(0.5);
  });

  test('precise interpolation with realistic yield modifiers', () => {
    // Example from corn species: sun hours → multiplier
    const sunTable = { 4: 0.3, 6: 0.7, 8: 1.0, 10: 1.0 };

    // Test all exact points
    expect(interpolate(sunTable, 4)).toBe(0.3);
    expect(interpolate(sunTable, 6)).toBe(0.7);
    expect(interpolate(sunTable, 8)).toBe(1.0);
    expect(interpolate(sunTable, 10)).toBe(1.0);

    // Test interpolated points
    expect(interpolate(sunTable, 5)).toBeCloseTo(0.5); // Halfway between 4 and 6
    expect(interpolate(sunTable, 7)).toBeCloseTo(0.85); // Halfway between 6 and 8
    expect(interpolate(sunTable, 9)).toBeCloseTo(1.0); // Halfway between 8 and 10 (both 1.0)

    // Test clamping
    expect(interpolate(sunTable, 2)).toBe(0.3);
    expect(interpolate(sunTable, 12)).toBe(1.0);
  });

  test('edge case: empty table', () => {
    const emptyTable = {};
    // Should return 0 for empty table
    expect(interpolate(emptyTable, 5)).toBe(0);
  });

  test('edge case: value exactly at single breakpoint', () => {
    const singlePointTable = { 7: 0.8 };
    expect(interpolate(singlePointTable, 7)).toBe(0.8);
  });
});
