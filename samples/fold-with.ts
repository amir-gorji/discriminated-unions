/**
 * foldWithDefault — Partial Collection Aggregation
 *
 * Demonstrates foldWithDefault for accumulating over a mixed notification feed
 * where only some variants affect the accumulator and the rest fall through
 * to Default.
 *
 * Demonstrates:
 *   - foldWithDefault() counting only urgent push notifications
 *   - foldWithDefault() building a structured summary from a subset of variants
 *   - Default receiving the full union item for inspection
 */

import { foldWithDefault } from 'dismatch';

// ── Types ──────────────────────────────────────────────────────────────────────

type Notification =
  | { type: 'push'; app: string; title: string; urgent: boolean }
  | { type: 'email'; from: string; subject: string }
  | { type: 'sms'; from: string; body: string };

// ── Sample feed ────────────────────────────────────────────────────────────────

const feed: Notification[] = [
  { type: 'push', app: 'PagerDuty', title: '🚨 Prod alert', urgent: true },
  { type: 'email', from: 'boss@corp.com', subject: 'Q4 review' },
  { type: 'push', app: 'GitHub', title: 'PR #42 merged', urgent: false },
  { type: 'sms', from: '+1-555-0100', body: 'Code is ready' },
  { type: 'push', app: 'PagerDuty', title: '🚨 DB disk 90%', urgent: true },
  { type: 'email', from: 'news@co', subject: 'Weekly digest' },
];

// ── Example 1: count urgent push notifications ─────────────────────────────────
// Only 'push' variants affect the accumulator; email and sms fall through to Default.

const urgentCount = foldWithDefault(
  feed,
  0,
)({
  push: (acc, { urgent }) => acc + (urgent ? 1 : 0),
  Default: (acc) => acc,
});

console.log(`Urgent push count: ${urgentCount}`); // 2

// ── Example 2: build a structured summary ─────────────────────────────────────
// Collect push titles and count skipped variants separately.

type Summary = {
  pushTitles: string[];
  skipped: number;
};

const summary = foldWithDefault(feed, {
  pushTitles: [] as string[],
  skipped: 0,
})({
  push: (acc, { title }) => ({
    ...acc,
    pushTitles: [...acc.pushTitles, title],
  }),
  Default: (acc) => ({ ...acc, skipped: acc.skipped + 1 }),
});

console.log(`Push titles: ${summary.pushTitles.join(', ')}`);
// Push titles: 🚨 Prod alert, PR #42 merged, 🚨 DB disk 90%
console.log(`Skipped (email + sms): ${summary.skipped}`); // 3

// ── Example 3: Default inspects the full item to branch on variant ─────────────

const log = foldWithDefault(
  feed,
  [] as string[],
)({
  push: (acc, { app, title }) => [...acc, `[PUSH] ${app}: ${title}`],
  Default: (acc, item) => {
    if (item.type === 'email') return [...acc, `[EMAIL] ${item.subject}`];
    return acc;
  },
});

console.log('\nFiltered log:');
log.forEach((line) => console.log(line));
