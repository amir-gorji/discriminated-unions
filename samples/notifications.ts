/**
 * Notification Centre
 *
 * A realistic notification system that combines multiple dismatch functions
 * to manage a heterogeneous collection of notification variants.
 *
 * Demonstrates:
 *   - match() for rendering and deriving values
 *   - matchWithDefault() for partial handling (e.g. a quick-action toolbar)
 *   - map() for targeted in-place mutations (mark one type as read)
 *   - mapAll() for full normalisation across all variants
 *   - is() for type-safe filtering and narrowing
 *   - createPipeHandlers for reusable, array-friendly operations
 */

import { match, matchWithDefault, map, mapAll, is, createPipeHandlers } from 'dismatch';
import type { Model } from 'dismatch';

// ── Types ──────────────────────────────────────────────────────────────────────

type Notification =
  | Model<'email', { from: string; subject: string; read: boolean; starred: boolean }>
  | Model<'sms',   { from: string; body: string;    read: boolean }>
  | Model<'push',  { app: string;  title: string;   read: boolean; urgent: boolean }>;

// ── Helpers ────────────────────────────────────────────────────────────────────

const notifOps = createPipeHandlers<Notification, 'type'>('type');

/** Single-line preview text shown in the notification list. */
const getPreview = notifOps.match({
  email: ({ from, subject }) => `📧 ${from}: ${subject}`,
  sms:   ({ from, body })    => `💬 ${from}: ${body.slice(0, 60)}`,
  push:  ({ app, title })    => `🔔 ${app}: ${title}`,
});

/** Importance score — urgent push notes bubble to the top. */
const getPriority = notifOps.match({
  email: ({ starred }) => starred ? 2 : 1,
  sms:   ()            => 1,
  push:  ({ urgent })  => urgent ? 3 : 1,
});

/** Is this notification unread? */
const isUnread = notifOps.match({
  email: ({ read }) => !read,
  sms:   ({ read }) => !read,
  push:  ({ read }) => !read,
});

/** Mark a notification as read — each variant carries `read` so we handle all. */
const markRead = notifOps.mapAll({
  email: (n) => ({ ...n, read: true }),
  sms:   (n) => ({ ...n, read: true }),
  push:  (n) => ({ ...n, read: true }),
});

/**
 * Quick-action label for a toolbar button.
 * Only emails have a "Star" action — everything else gets "Dismiss".
 */
const getAction = notifOps.matchWithDefault({
  email: ({ starred }) => starred ? 'Unstar' : 'Star',
  Default: () => 'Dismiss',
});

// ── Notification store (plain array, no framework required) ───────────────────

class NotificationStore {
  private items: Notification[] = [];

  add(notification: Notification): void {
    this.items.push(notification);
  }

  /** All notifications sorted by priority (highest first). */
  get sorted(): Notification[] {
    return [...this.items].sort((a, b) => getPriority(b) - getPriority(a));
  }

  /** Unread count — no boilerplate, handlers slot straight into filter. */
  get unreadCount(): number {
    return this.items.filter(isUnread).length;
  }

  /** All email notifications, typed as the email variant. */
  get emails() {
    return this.items.filter((n) => is(n, 'email'));
    //                              ^? { type: 'email'; from: string; ... }[]
  }

  /** Urgent push notifications only. */
  get urgentPushes() {
    return this.items
      .filter((n) => is(n, 'push'))
      .filter(({ urgent }) => urgent);
  }

  /** Mark every notification as read. */
  markAllRead(): void {
    this.items = this.items.map(markRead);
  }

  /**
   * Mark only SMS notifications as read — emails and push pass through
   * unchanged (same object reference), no unnecessary allocations.
   */
  markSmsRead(): void {
    this.items = this.items.map((n) =>
      map(n)({
        sms: (sms) => ({ ...sms, read: true }),
      }),
    );
  }

  /** Render a plain-text summary of every notification. */
  renderList(): string[] {
    return this.sorted.map((n) => {
      const unread = isUnread(n) ? '● ' : '  ';
      const action = getAction(n);
      return `${unread}${getPreview(n)}  [${action}]`;
    });
  }

  /** Detailed view — exhaustive, so adding a new variant is a compile error here. */
  renderDetail(n: Notification): string {
    return match(n)({
      email: ({ from, subject, starred, read }) =>
        `Email from ${from}\nSubject: ${subject}\nStarred: ${starred} | Read: ${read}`,
      sms: ({ from, body, read }) =>
        `SMS from ${from}\n${body}\nRead: ${read}`,
      push: ({ app, title, urgent, read }) =>
        `Push from ${app}\n${title}\nUrgent: ${urgent} | Read: ${read}`,
    });
  }
}

// ── Simulation ─────────────────────────────────────────────────────────────────

const store = new NotificationStore();

store.add({ type: 'email', from: 'boss@corp.com', subject: 'Q4 review',  read: false, starred: true });
store.add({ type: 'sms',   from: '+1-555-0100',   body:    'Your code is ready for pickup.', read: false });
store.add({ type: 'push',  app: 'GitHub',         title:   'PR #42 merged', read: true, urgent: false });
store.add({ type: 'push',  app: 'PagerDuty',      title:   '🚨 Prod alert: high error rate', read: false, urgent: true });
store.add({ type: 'email', from: 'news@digest.io', subject: 'Weekly digest', read: true, starred: false });

console.log(`Unread: ${store.unreadCount}`);  // 3
console.log(`Emails: ${store.emails.length}`); // 2
console.log(`Urgent: ${store.urgentPushes.length}`); // 1

console.log('\n--- Notification list (sorted by priority) ---');
store.renderList().forEach((line) => console.log(line));

store.markSmsRead();
console.log(`\nAfter marking SMS read — unread: ${store.unreadCount}`); // 2

store.markAllRead();
console.log(`After marking all read  — unread: ${store.unreadCount}`); // 0
