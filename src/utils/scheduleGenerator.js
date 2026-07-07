// src/utils/scheduleGenerator.js
//
// Rotation generator for the Schedule feature.
// See: PropJournal — Trading Schedule & Alert System — Master Prompt, Section 3 & 3B.
//
// RULES (from spec):
// - 3 trading days/week, always including Friday.
// - No 3 trading days in a row.
// - No 2-day gap between trading days.
// - Under those constraints, only 3 weekly patterns are valid.
// - Cycle = 4 weeks. Weeks 1-3 use all 3 valid patterns, shuffled. Week 4
//   repeats one pattern, chosen at random (not fixed to any slot).
// - Secondary account (if paired) trades all non-Friday weekdays primary skips.

export const VALID_PATTERNS = [
    ['mon', 'wed', 'fri'],
    ['tue', 'wed', 'fri'],
    ['tue', 'thu', 'fri'],
  ]
  
  const ALL_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
  
  // Fisher-Yates shuffle — returns a new array, does not mutate input.
  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  
  function randomPattern() {
    return VALID_PATTERNS[Math.floor(Math.random() * VALID_PATTERNS.length)]
  }
  
  /**
   * Derive secondary account's trading days for a week, given primary's days.
   * Secondary trades all weekdays primary skips, EXCLUDING Friday (secondary
   * never trades Friday, regardless of whether primary does).
   */
  export function deriveSecondaryDays(primaryDays) {
    return ALL_WEEKDAYS.filter(
      (day) => day !== 'fri' && !primaryDays.includes(day)
    )
  }
  
  /**
   * Generate one new 4-week cycle.
   * Weeks 1-3: the 3 valid patterns in randomized order (each used exactly once).
   * Week 4: one randomly chosen pattern, repeated (independent random choice —
   * not tied to any of the weeks 1-3 slots).
   *
   * @param {boolean} withSecondary - whether to compute secondary_days per week
   * @returns {{ weeks: Array<{ primary_days: string[], secondary_days: string[] }> }}
   */
  export function generateCycle(withSecondary = false) {
    const weeks1to3 = shuffle(VALID_PATTERNS)
    const week4Pattern = randomPattern()
    const patterns = [...weeks1to3, week4Pattern]
  
    const weeks = patterns.map((primary_days) => ({
      primary_days,
      secondary_days: withSecondary ? deriveSecondaryDays(primary_days) : [],
    }))
  
    return { weeks }
  }
  
  /**
   * Validate a single week's pattern against the two hard constraints.
   * Exposed mainly for tests / sanity checks — generateCycle() only ever
   * produces patterns from VALID_PATTERNS, so this shouldn't be needed in
   * normal operation.
   */
  export function isValidWeekPattern(days) {
    if (!days.includes('fri')) return false
    const idxs = days.map((d) => ALL_WEEKDAYS.indexOf(d)).sort((a, b) => a - b)
  
    // No 3 in a row.
    for (let i = 0; i < idxs.length - 2; i++) {
      if (idxs[i + 1] === idxs[i] + 1 && idxs[i + 2] === idxs[i] + 2) return false
    }
  
    // No 2-day gap between consecutive trading days (gap of size 2, e.g. Mon -> Thu).
    for (let i = 0; i < idxs.length - 1; i++) {
      if (idxs[i + 1] - idxs[i] > 2) return false
    }
  
    return true
  }