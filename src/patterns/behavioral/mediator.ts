import {BookRecord, DemoLogger, NewBookRecord} from '../shared/bms-types';

export type MediatorEvent = 'book:created' | 'book:deleted';

export interface IMediator {
  notify(sender: BaseComponent, event: MediatorEvent, data: BookRecord): void;
}

export abstract class BaseComponent {
  protected mediator?: IMediator;

  setMediator(mediator: IMediator): void {
    this.mediator = mediator;
  }
}

export class BookService extends BaseComponent {
  private readonly books = new Map<number, BookRecord>();
  private nextId = 1;

  createBook(data: NewBookRecord): BookRecord {
    const book: BookRecord = {
      ...data,
      id: this.nextId++,
      addedAt: data.addedAt ?? new Date(),
    };
    this.books.set(book.id, book);
    this.mediator?.notify(this, 'book:created', book);
    return book;
  }

  deleteBook(id: number): boolean {
    const book = this.books.get(id);
    if (!book) return false;
    this.books.delete(id);
    this.mediator?.notify(this, 'book:deleted', book);
    return true;
  }
}

export class AuthorService extends BaseComponent {
  private readonly bookCounts = new Map<string, number>();

  changeBookCount(authorName: string, delta: number): number {
    const count = Math.max(0, (this.bookCounts.get(authorName) ?? 0) + delta);
    this.bookCounts.set(authorName, count);
    return count;
  }

  getBookCount(authorName: string): number {
    return this.bookCounts.get(authorName) ?? 0;
  }
}

export class NotificationService extends BaseComponent {
  readonly alerts: string[] = [];

  constructor(private readonly log: DemoLogger = console.log) {
    super();
  }

  sendAlert(message: string): void {
    this.alerts.push(message);
    this.log(`  [Notification] ${message}`);
  }
}

export class SearchIndexService extends BaseComponent {
  private readonly index = new Map<string, Set<number>>();

  indexBook(book: BookRecord): void {
    for (const term of tokenize(
      `${book.title} ${book.authorName} ${book.genre}`,
    )) {
      if (!this.index.has(term)) this.index.set(term, new Set());
      this.index.get(term)!.add(book.id);
    }
  }

  removeBook(bookId: number): void {
    for (const [term, ids] of this.index) {
      ids.delete(bookId);
      if (ids.size === 0) this.index.delete(term);
    }
  }

  search(query: string): number[] {
    const terms = tokenize(query);
    if (terms.length === 0) return [];
    const [first, ...rest] = terms.map(
      t => this.index.get(t) ?? new Set<number>(),
    );
    return [...first].filter(id => rest.every(set => set.has(id)));
  }
}

// Mediator -- coordinates author, notification and search services when a book changes
export class BookSystemMediator implements IMediator {
  constructor(
    private readonly bookService: BookService,
    private readonly authorService: AuthorService,
    private readonly notificationService: NotificationService,
    private readonly searchIndex: SearchIndexService,
  ) {
    for (const component of [
      bookService,
      authorService,
      notificationService,
      searchIndex,
    ]) {
      component.setMediator(this);
    }
  }

  notify(sender: BaseComponent, event: MediatorEvent, book: BookRecord): void {
    if (sender !== this.bookService) return;

    switch (event) {
      case 'book:created': {
        const count = this.authorService.changeBookCount(book.authorName, +1);
        this.searchIndex.indexBook(book);
        this.notificationService.sendAlert(
          `New book "${book.title}" by ${book.authorName} (author now has ${count})`,
        );
        break;
      }
      case 'book:deleted': {
        const count = this.authorService.changeBookCount(book.authorName, -1);
        this.searchIndex.removeBook(book.id);
        this.notificationService.sendAlert(
          `Book "${book.title}" removed (author now has ${count})`,
        );
        break;
      }
    }
  }
}

export function demoMediator(log: DemoLogger = console.log): void {
  const books = new BookService();
  const authors = new AuthorService();
  const notifications = new NotificationService(log);
  const search = new SearchIndexService();
  new BookSystemMediator(books, authors, notifications, search);

  const emma = books.createBook({
    title: 'Emma',
    isbn: '9780141439587',
    authorName: 'Jane Austen',
    genre: 'Classic',
    bookType: 'printed',
    pageCount: 474,
  });
  books.createBook({
    title: 'Persuasion',
    isbn: '9780141439686',
    authorName: 'Jane Austen',
    genre: 'Classic',
    bookType: 'printed',
    pageCount: 249,
  });
  books.createBook({
    title: 'Dune',
    isbn: '9780441013593',
    authorName: 'Frank Herbert',
    genre: 'Sci-Fi',
    bookType: 'printed',
    pageCount: 688,
  });

  log(`Jane Austen book count: ${authors.getBookCount('Jane Austen')}`);
  log(
    `search("austen classic") -> ids ${JSON.stringify(search.search('austen classic'))}`,
  );

  books.deleteBook(emma.id);
  log(
    `After deleting Emma: count=${authors.getBookCount('Jane Austen')}, search("emma") -> ${JSON.stringify(search.search('emma'))}`,
  );
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
