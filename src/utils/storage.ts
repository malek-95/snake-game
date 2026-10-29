/**
 * localStorage that never throws: storage can be blocked (private mode, sandboxed iframe),
 * full, or hold data from an older version. Callers always get a usable value back.
 */
export const loadJSON = <T>(key: string, fallback: T, isValid: (v: unknown) => boolean = () => true): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Returns false when the value could not be saved (storage full or blocked). */
export const saveJSON = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
