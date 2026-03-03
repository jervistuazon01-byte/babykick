export type MovementEntry = {
  count: number;
  note?: string;
};

export type MovementData = Record<string, MovementEntry>;

export const STORAGE_KEY = 'baby_movements_v2';
export const LEGACY_STORAGE_KEY = 'baby_movements_v1';

export const NOTE_MAX_LENGTH = 280;

export const sanitizeMovementCount = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value);
};

export const sanitizeMovementNote = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().slice(0, NOTE_MAX_LENGTH);
  return trimmed || undefined;
};

const sanitizeMovementEntry = (value: unknown): MovementEntry | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const maybeEntry = value as Partial<MovementEntry>;
  const count = sanitizeMovementCount(maybeEntry.count);
  if (count === null) {
    return null;
  }

  const note = sanitizeMovementNote(maybeEntry.note);

  if (count <= 0 && !note) {
    return null;
  }

  return note ? { count, note } : { count };
};

const sanitizeMovementData = (value: unknown): { data: MovementData; changed: boolean } => {
  if (!value || typeof value !== 'object') {
    return { data: {}, changed: false };
  }

  const data: MovementData = {};
  let changed = false;

  for (const [key, rawValue] of Object.entries(value)) {
    if (!key.trim()) {
      changed = true;
      continue;
    }

    const normalizedRawValue = typeof rawValue === 'number' ? { count: rawValue } : rawValue;
    if (normalizedRawValue !== rawValue) {
      changed = true;
    }

    const sanitizedEntry = sanitizeMovementEntry(normalizedRawValue);
    if (!sanitizedEntry) {
      changed = true;
      continue;
    }

    data[key] = sanitizedEntry;

    if (
      typeof rawValue !== 'object' ||
      rawValue === null ||
      !('count' in rawValue) ||
      sanitizedEntry.count !== (rawValue as { count?: number }).count ||
      sanitizedEntry.note !== (rawValue as { note?: string }).note
    ) {
      changed = true;
    }
  }

  return { data, changed };
};

export const loadMovementDataFromStorage = (storage: Storage): {
  data: MovementData;
  shouldPersist: boolean;
} => {
  const saved = storage.getItem(STORAGE_KEY);
  const legacySaved = storage.getItem(LEGACY_STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const sanitized = sanitizeMovementData(parsed);
      return { data: sanitized.data, shouldPersist: sanitized.changed };
    } catch (error) {
      console.error('Failed to parse saved movements v2', error);
      // Do not overwrite existing data on parse failures; try legacy fallback instead.
    }
  }

  if (legacySaved) {
    try {
      const parsedLegacy = JSON.parse(legacySaved);
      const sanitizedLegacy = sanitizeMovementData(parsedLegacy);
      return { data: sanitizedLegacy.data, shouldPersist: true };
    } catch (error) {
      console.error('Failed to migrate legacy movements', error);
      return { data: {}, shouldPersist: false };
    }
  }

  return { data: {}, shouldPersist: false };
};
