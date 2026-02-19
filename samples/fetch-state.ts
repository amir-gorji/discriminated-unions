/**
 * Async Data Fetching — Discriminated Union State Machine
 *
 * Models the full lifecycle of an async operation as a discriminated union
 * with four states: idle → loading → success | failure.
 *
 * Demonstrates:
 *   - Defining a parameterised state union with Model<>
 *   - match() for exhaustive view rendering / status derivation
 *   - map() for state transitions that only touch one variant
 *   - matchWithDefault() for "I only care about this one case"
 *   - createPipeHandlers for reusable, pipe-friendly handlers
 */

import {
  match,
  map,
  matchWithDefault,
  createPipeHandlers,
  isUnion,
} from 'dismatch';
import type { Model } from 'dismatch';

// ── Domain types ──────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
}

/**
 * Four-state async model. `stale` on success lets us distinguish a fresh
 * result from one being re-fetched in the background.
 */
type FetchState<T> =
  | Model<'idle'>
  | Model<'loading'>
  | Model<'success', { data: T; stale: boolean }>
  | Model<'failure', { error: string; retries: number }>;

// ── State transitions (pure functions, no side effects) ───────────────────────

/** Start a fresh fetch — always moves to loading. */
function startFetch<T>(state: FetchState<T>): FetchState<T> {
  return match(state)({
    idle:    () => ({ type: 'loading' } as const),
    loading: () => state,                                    // already in-flight
    success: ({ data }) => ({ type: 'success', data, stale: true } as const), // background refresh
    failure: () => ({ type: 'loading' } as const),
  });
}

/** Record a successful response. */
function onSuccess<T>(data: T): FetchState<T> {
  return { type: 'success', data, stale: false };
}

/** Record a failure, incrementing the retry counter. */
function onFailure<T>(state: FetchState<T>, error: string): FetchState<T> {
  // map() handler parameters are typed as the variant's Data (without the discriminant key).
  // Include type: 'failure' as const in the return to reconstruct the full variant.
  return map(state)({
    failure: ({ retries }) => ({ type: 'failure' as const, error, retries: retries + 1 }),
  });
}

// ── Derived values ─────────────────────────────────────────────────────────────

/** Is there an in-flight request (including stale background refresh)? */
function isLoading<T>(state: FetchState<T>): boolean {
  return match(state)({
    idle:    () => false,
    loading: () => true,
    success: ({ stale }) => stale,
    failure: () => false,
  });
}

/** Unwrap data, or return a fallback. */
function dataOr<T>(state: FetchState<T>, fallback: T): T {
  return matchWithDefault(state)({
    success: ({ data }) => data,
    Default: () => fallback,
  });
}

/** Human-readable status for logging / UI headers. */
function statusLabel<T>(state: FetchState<T>): string {
  return match(state)({
    idle:    () => 'Not started',
    loading: () => 'Loading…',
    success: ({ stale }) => stale ? 'Refreshing…' : 'Up to date',
    failure: ({ error, retries }) => `Failed (attempt ${retries}): ${error}`,
  });
}

// ── createPipeHandlers — reusable, pipe-friendly handlers ──────────────────────

/**
 * Bind handlers to FetchState<User[]> once. The returned functions have the
 * shape `(state: FetchState<User[]>) => Result`, so they can be passed directly
 * to Array.map, pipe utilities, or stored as module-level constants.
 */
const userFetchOps = createPipeHandlers<FetchState<User[]>, 'type'>('type');

const getUserCount = userFetchOps.match({
  idle:    () => 0,
  loading: () => 0,
  success: ({ data }) => data.length,
  failure: () => 0,
});

const getStatusMessage = userFetchOps.match({
  idle:    () => 'Waiting for data',
  loading: () => 'Fetching users…',
  success: ({ data, stale }) =>
    `${data.length} users loaded${stale ? ' (refreshing)' : ''}`,
  failure: ({ error }) => `Could not load users: ${error}`,
});

// ── Simulation ─────────────────────────────────────────────────────────────────

let state: FetchState<User[]> = { type: 'idle' };

console.log(statusLabel(state));            // 'Not started'
console.log(isLoading(state));              // false

state = startFetch(state);
console.log(statusLabel(state));            // 'Loading…'
console.log(isLoading(state));              // true

state = onSuccess<User[]>([
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob',   email: 'bob@example.com' },
]);
console.log(statusLabel(state));            // 'Up to date'
console.log(getUserCount(state));           // 2
console.log(getStatusMessage(state));       // '2 users loaded'

state = startFetch(state);                  // background refresh → stale
console.log(isLoading(state));              // true (stale = true)
console.log(getStatusMessage(state));       // '2 users loaded (refreshing)'

// ── Runtime boundary: validate external data before matching ──────────────────

function processApiResponse(raw: unknown): string {
  if (!isUnion(raw)) {
    return 'Invalid response format';
  }
  // We know it's a valid union — hand off to our typed handlers
  return matchWithDefault(raw as FetchState<User[]>)({
    success: ({ data }) => `Received ${data.length} records`,
    failure: ({ error }) => `Server error: ${error}`,
    Default: () => 'Unexpected state',
  });
}
