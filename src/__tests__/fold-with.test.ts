import { describe, it, expect } from 'vitest';
import { foldWithDefault, createPipeHandlers, createUnion } from '../unions';

type Notification =
  | { type: 'push'; urgent: boolean; message: string }
  | { type: 'email'; subject: string }
  | { type: 'sms'; from: string };

type Animal =
  | { kind: 'dog'; name: string }
  | { kind: 'cat'; lives: number }
  | { kind: 'bird'; canFly: boolean };

const notifications: Notification[] = [
  { type: 'push', urgent: true, message: 'Alert' },
  { type: 'email', subject: 'Hello' },
  { type: 'push', urgent: false, message: 'FYI' },
  { type: 'sms', from: '+1234' },
  { type: 'push', urgent: true, message: 'Critical' },
];

describe('foldWithDefault — standalone', () => {
  it('partial handling: specified variant runs handler, others hit Default', () => {
    const defaultHits: string[] = [];
    const urgentCount = foldWithDefault(
      notifications,
      0,
    )({
      push: (acc, { urgent }) => acc + (urgent ? 1 : 0),
      Default: (acc, item) => {
        defaultHits.push(item.type);
        return acc;
      },
    });
    expect(urgentCount).toBe(2);
    expect(defaultHits).toEqual(['email', 'sms']);
  });

  it('Default fallback: all unspecified variants route to Default', () => {
    const seen: string[] = [];
    foldWithDefault(
      notifications,
      0,
    )({
      Default: (acc, item) => {
        seen.push(item.type);
        return acc;
      },
    });
    expect(seen).toEqual(['push', 'email', 'push', 'sms', 'push']);
  });

  it('empty collection returns initial unchanged', () => {
    const result = foldWithDefault(
      [] as Notification[],
      42,
    )({
      Default: (acc) => acc + 1,
    });
    expect(result).toBe(42);
  });

  it('pass-through: Default returning acc leaves accumulator unchanged', () => {
    const result = foldWithDefault(
      notifications,
      0,
    )({
      Default: (acc) => acc,
    });
    expect(result).toBe(0);
  });

  it('processes items in order', () => {
    const items: Notification[] = [
      { type: 'push', urgent: true, message: 'A' },
      { type: 'email', subject: 'B' },
      { type: 'sms', from: 'C' },
    ];
    const order = foldWithDefault(
      items,
      '',
    )({
      push: (acc) => acc + 'P',
      Default: (acc, item) => acc + item.type[0].toUpperCase(),
    });
    expect(order).toBe('PES');
  });

  it('Default receives full union item for inspection', () => {
    const seenTypes: string[] = [];
    foldWithDefault(
      notifications,
      0,
    )({
      push: (acc) => acc,
      Default: (acc, item) => {
        seenTypes.push(item.type);
        return acc;
      },
    });
    expect(seenTypes).toEqual(['email', 'sms']);
  });

  it('variant handler has strongly-typed data access', () => {
    const subjects: string[] = [];
    foldWithDefault(
      notifications,
      0,
    )({
      email: (acc, item) => {
        subjects.push(item.subject);
        return acc;
      },
      Default: (acc) => acc,
    });
    expect(subjects).toEqual(['Hello']);
  });

  it('throws on non-union item', () => {
    expect(() =>
      foldWithDefault(
        [null as any],
        0,
      )({
        Default: (acc) => acc,
      }),
    ).toThrow('Not a union');
  });
});

describe('foldWithDefault — custom discriminant', () => {
  const animals: Animal[] = [
    { kind: 'dog', name: 'Rex' },
    { kind: 'cat', lives: 9 },
    { kind: 'bird', canFly: true },
  ];

  it('works with a custom discriminant', () => {
    const result = foldWithDefault(
      animals,
      '',
      'kind',
    )({
      dog: (acc, { name }) => acc + name,
      Default: (acc, item) => acc + item.kind,
    });
    expect(result).toBe('Rexcatbird');
  });
});

describe('foldWithDefault — createPipeHandlers', () => {
  const notifOps = createPipeHandlers<Notification, 'type'>('type');

  it('partial handling: specified variant runs handler, others hit Default', () => {
    const items: Notification[] = [
      { type: 'push', urgent: true, message: 'Alert' },
      { type: 'email', subject: 'Hello' },
      { type: 'sms', from: '+1' },
    ];
    const result = notifOps.foldWithDefault(items, 0)({
      push: (acc, { urgent }) => acc + (urgent ? 1 : 0),
      Default: (acc) => acc,
    });
    expect(result).toBe(1);
  });

  it('Default-only: all items routed to Default', () => {
    const items: Notification[] = [
      { type: 'push', urgent: false, message: 'x' },
      { type: 'email', subject: 'y' },
    ];
    const seen: string[] = [];
    notifOps.foldWithDefault(items, 0)({
      Default: (acc, item) => { seen.push(item.type); return acc; },
    });
    expect(seen).toEqual(['push', 'email']);
  });
});

describe('foldWithDefault — createUnion', () => {
  const Notif = createUnion('type', {
    push: (urgent: boolean, message: string) => ({ urgent, message }),
    email: (subject: string) => ({ subject }),
    sms: (from: string) => ({ from }),
  });

  it('works via bound factory method', () => {
    const items = [Notif.push(true, 'A'), Notif.email('B'), Notif.push(false, 'C')];
    const result = Notif.foldWithDefault(items, 0)({
      push: (acc, { urgent }) => acc + (urgent ? 1 : 0),
      Default: (acc) => acc,
    });
    expect(result).toBe(1);
  });
});
