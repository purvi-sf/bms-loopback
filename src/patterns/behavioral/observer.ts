import {DemoLogger} from '../shared/bms-types';

export const BOOK_EVENTS = {
  BOOK_CREATED: 'book:created',
  BOOK_UPDATED: 'book:updated',
  BOOK_DELETED: 'book:deleted',
  BOOK_VIEWED: 'book:viewed',
} as const;

export type BookEventType = (typeof BOOK_EVENTS)[keyof typeof BOOK_EVENTS];

const ALL_BOOK_EVENTS: readonly BookEventType[] = Object.values(BOOK_EVENTS);

export interface BookEventData {
  bookId: number;
  title?: string;
  actor?: string;
  method?: string;
  changes?: Record<string, unknown>;
}

export interface IObserver {
  readonly name: string;
  update(event: BookEventType, data: BookEventData): void;
}

export interface NotifyResult {
  notified: number;
  failures: Array<{observer: string; error: string}>;
}

// Observer -- notifies services when books change without tight coupling
export class BookEventSystem {
  private readonly observers = new Map<BookEventType, Set<IObserver>>(
    ALL_BOOK_EVENTS.map(e => [e, new Set<IObserver>()]),
  );

  subscribe(
    observer: IObserver,
    events: readonly BookEventType[] = ALL_BOOK_EVENTS,
  ): void {
    for (const event of events) this.observers.get(event)!.add(observer);
  }

  unsubscribe(
    observer: IObserver,
    events: readonly BookEventType[] = ALL_BOOK_EVENTS,
  ): void {
    for (const event of events) this.observers.get(event)!.delete(observer);
  }

  notify(event: BookEventType, data: BookEventData): NotifyResult {
    const result: NotifyResult = {notified: 0, failures: []};
    for (const observer of this.observers.get(event)!) {
      try {
        observer.update(event, data);
        result.notified++;
      } catch (err) {
        result.failures.push({
          observer: observer.name,
          error: (err as Error).message,
        });
      }
    }
    return result;
  }

  getObserverCount(event: BookEventType): number {
    return this.observers.get(event)!.size;
  }
}

export const bookEventEmitter = new BookEventSystem();

export class EmailNotificationObserver implements IObserver {
  readonly name = 'EmailNotification';
  readonly sent: Array<{to: string; subject: string}> = [];

  constructor(
    private readonly recipients: string[],
    private readonly log: DemoLogger = console.log,
  ) {}

  update(event: BookEventType, data: BookEventData): void {
    const subjects: Partial<Record<BookEventType, string>> = {
      'book:created': `New book added: ${data.title ?? `#${data.bookId}`}`,
      'book:deleted': `Book removed: ${data.title ?? `#${data.bookId}`}`,
    };
    const subject = subjects[event];
    if (!subject) return;
    for (const to of this.recipients) {
      this.sent.push({to, subject});
      this.log(`  [Email] to ${to}: "${subject}"`);
    }
  }
}

export class AnalyticsObserver implements IObserver {
  readonly name = 'Analytics';
  private readonly counts = new Map<BookEventType, number>();
  private readonly views = new Map<number, number>();

  update(event: BookEventType, data: BookEventData): void {
    this.counts.set(event, (this.counts.get(event) ?? 0) + 1);
    if (event === 'book:viewed') {
      this.views.set(data.bookId, (this.views.get(data.bookId) ?? 0) + 1);
    }
  }

  getCount(event: BookEventType): number {
    return this.counts.get(event) ?? 0;
  }

  getCounts(): Record<BookEventType, number> {
    return Object.fromEntries(
      ALL_BOOK_EVENTS.map(e => [e, this.getCount(e)]),
    ) as Record<BookEventType, number>;
  }

  getViews(bookId: number): number {
    return this.views.get(bookId) ?? 0;
  }
}

export interface AuditEntry {
  timestamp: string;
  event: BookEventType;
  bookId: number;
  actor: string;
  details?: Record<string, unknown>;
}

export class AuditLogObserver implements IObserver {
  readonly name = 'AuditLog';
  private readonly trail: AuditEntry[] = [];

  constructor(private readonly log: DemoLogger = console.log) {}

  update(event: BookEventType, data: BookEventData): void {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event,
      bookId: data.bookId,
      actor: data.actor ?? 'system',
      details: data.changes,
    };
    this.trail.push(entry);
    this.log(
      `  [Audit] ${entry.timestamp} ${entry.actor} ${event} #${entry.bookId}`,
    );
  }

  getTrail(): readonly AuditEntry[] {
    return this.trail;
  }
}

export function demoObserver(log: DemoLogger = console.log): void {
  const events = new BookEventSystem();
  const email = new EmailNotificationObserver(['readers@bms.example.com'], log);
  const analytics = new AnalyticsObserver();
  const audit = new AuditLogObserver(log);

  events.subscribe(email, ['book:created', 'book:deleted']);
  events.subscribe(analytics);
  events.subscribe(audit);

  log('notify book:created');
  events.notify('book:created', {bookId: 1, title: 'Dune', actor: 'admin'});
  log('notify book:viewed x2');
  events.notify('book:viewed', {bookId: 1});
  events.notify('book:viewed', {bookId: 1});
  log('notify book:updated');
  events.notify('book:updated', {
    bookId: 1,
    actor: 'editor',
    changes: {pageCount: 700},
  });

  log('Unsubscribe the audit log, then notify book:deleted');
  events.unsubscribe(audit);
  events.notify('book:deleted', {bookId: 1, title: 'Dune', actor: 'admin'});

  log(
    `Analytics counts: ${JSON.stringify(analytics.getCounts())}; views of #1: ${analytics.getViews(1)}`,
  );
  log(
    `Emails sent: ${email.sent.length}; audit entries: ${audit.getTrail().length}`,
  );
}
