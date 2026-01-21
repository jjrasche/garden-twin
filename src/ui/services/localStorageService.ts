import type { Garden, Plan } from '@core/types';

const STORAGE_KEYS = {
  GARDEN: 'garden-twin:garden',
  PLAN: 'garden-twin:plan',
  LAST_SAVED: 'garden-twin:last-saved',
} as const;

export class QuotaExceededError extends Error {
  constructor() {
    super('localStorage quota exceeded');
    this.name = 'QuotaExceededError';
  }
}

export function saveGarden(garden: Garden): void {
  try {
    const json = JSON.stringify(garden);
    localStorage.setItem(STORAGE_KEYS.GARDEN, json);
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    ) {
      throw new QuotaExceededError();
    }
    throw error;
  }
}

export function loadGarden(): Garden | null {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.GARDEN);
    if (!json) return null;

    return JSON.parse(json);
  } catch (error) {
    console.error('Error loading garden from localStorage:', error);
    return null;
  }
}

export function savePlan(plan: Plan): void {
  try {
    const json = JSON.stringify(plan);
    localStorage.setItem(STORAGE_KEYS.PLAN, json);
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    ) {
      throw new QuotaExceededError();
    }
    throw error;
  }
}

export function loadPlan(): Plan | null {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.PLAN);
    if (!json) return null;

    return JSON.parse(json);
  } catch (error) {
    console.error('Error loading plan from localStorage:', error);
    return null;
  }
}

export function getLastSaved(): Date | null {
  try {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
    if (!timestamp) return null;

    return new Date(timestamp);
  } catch (error) {
    console.error('Error getting last saved timestamp:', error);
    return null;
  }
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEYS.GARDEN);
  localStorage.removeItem(STORAGE_KEYS.PLAN);
  localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);
}

export function estimateStorageSize(): number {
  let total = 0;
  for (const key of Object.values(STORAGE_KEYS)) {
    const value = localStorage.getItem(key);
    if (value) {
      // Estimate: 2 bytes per character (UTF-16)
      total += value.length * 2;
    }
  }
  return total;
}

export function exportToJSON(): string {
  const garden = loadGarden();
  const plan = loadPlan();
  const lastSaved = getLastSaved();

  return JSON.stringify(
    {
      garden,
      plan,
      lastSaved: lastSaved?.toISOString(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importFromJSON(json: string): void {
  try {
    const data = JSON.parse(json);

    if (data.garden) {
      saveGarden(data.garden);
    }

    if (data.plan) {
      savePlan(data.plan);
    }
  } catch (error) {
    console.error('Error importing from JSON:', error);
    throw new Error('Invalid JSON format');
  }
}
