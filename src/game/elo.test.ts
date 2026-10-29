import { describe, it, expect } from 'vitest';
import { eloDelta, cleanUsername } from './elo';

describe('elo rating', () => {
  it('gives 16 points between equal players', () => {
    expect(eloDelta(1000, 1000)).toBe(16);
  });

  it('pays more for beating a stronger player', () => {
    expect(eloDelta(1000, 1200)).toBe(24);
    expect(eloDelta(1200, 1000)).toBe(8);
    expect(eloDelta(1000, 1200) + eloDelta(1200, 1000)).toBe(32);
  });

  it('stays between 0 and 32', () => {
    expect(eloDelta(3000, 100)).toBe(0);
    expect(eloDelta(100, 3000)).toBe(32);
  });
});

describe('usernames', () => {
  it('trims and accepts 1–16 characters', () => {
    expect(cleanUsername('  Ali ')).toBe('Ali');
    expect(cleanUsername('a'.repeat(16))).toBe('a'.repeat(16));
    expect(cleanUsername('Élodie 🐍')).toBe('Élodie 🐍');
  });

  it('rejects empty, too long or control characters', () => {
    expect(cleanUsername('   ')).toBeNull();
    expect(cleanUsername('a'.repeat(17))).toBeNull();
    expect(cleanUsername('a\nb')).toBeNull();
  });
});
