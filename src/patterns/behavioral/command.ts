import {BookRecord, DemoLogger, NewBookRecord} from '../shared/bms-types';

export interface ICommand {
  execute(): void;
  undo(): void;
  describe(): string;
}

export interface BookStore {
  nextId(): number;
  get(id: number): BookRecord | undefined;
  put(book: BookRecord): void;
  remove(id: number): boolean;
  list(): BookRecord[];
}

export class InMemoryBookStore implements BookStore {
  private readonly books = new Map<number, BookRecord>();
  private lastId = 0;

  nextId(): number {
    return ++this.lastId;
  }

  get(id: number): BookRecord | undefined {
    const book = this.books.get(id);
    return book ? structuredClone(book) : undefined;
  }

  put(book: BookRecord): void {
    this.books.set(book.id, structuredClone(book));
  }

  remove(id: number): boolean {
    return this.books.delete(id);
  }

  list(): BookRecord[] {
    return [...this.books.values()].map(b => structuredClone(b));
  }
}

export class CreateBookCommand implements ICommand {
  private created?: BookRecord;

  constructor(
    private readonly store: BookStore,
    private readonly data: NewBookRecord,
  ) {}

  execute(): void {
    this.created ??= {
      ...this.data,
      id: this.store.nextId(),
      addedAt: this.data.addedAt ?? new Date(),
    };
    this.store.put(this.created);
  }

  undo(): void {
    if (this.created) this.store.remove(this.created.id);
  }

  get bookId(): number | undefined {
    return this.created?.id;
  }

  describe(): string {
    return `Create "${this.data.title}"`;
  }
}

export class UpdateBookCommand implements ICommand {
  private previous?: BookRecord;

  constructor(
    private readonly store: BookStore,
    private readonly bookId: number,
    private readonly changes: Partial<NewBookRecord>,
  ) {}

  execute(): void {
    const current = this.store.get(this.bookId);
    if (!current) throw new Error(`Book ${this.bookId} not found`);
    this.previous = current;
    this.store.put({...current, ...this.changes, id: current.id});
  }

  undo(): void {
    if (this.previous) this.store.put(this.previous);
  }

  describe(): string {
    return `Update #${this.bookId} ${JSON.stringify(this.changes)}`;
  }
}

export class DeleteBookCommand implements ICommand {
  private deleted?: BookRecord;

  constructor(
    private readonly store: BookStore,
    private readonly bookId: number,
  ) {}

  execute(): void {
    const book = this.store.get(this.bookId);
    if (!book) throw new Error(`Book ${this.bookId} not found`);
    this.deleted = book;
    this.store.remove(this.bookId);
  }

  undo(): void {
    if (this.deleted) this.store.put(this.deleted);
  }

  describe(): string {
    return `Delete #${this.bookId}`;
  }
}

// Command -- wraps book create, update and delete as objects to support undo and redo
export class BookCommandHistory {
  private readonly undoStack: ICommand[] = [];
  private readonly redoStack: ICommand[] = [];

  execute(command: ICommand): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
  }

  undo(): ICommand | undefined {
    const command = this.undoStack.pop();
    if (!command) return undefined;
    command.undo();
    this.redoStack.push(command);
    return command;
  }

  redo(): ICommand | undefined {
    const command = this.redoStack.pop();
    if (!command) return undefined;
    command.execute();
    this.undoStack.push(command);
    return command;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getHistory(): string[] {
    return this.undoStack.map(c => c.describe());
  }
}

export function demoCommand(log: DemoLogger = console.log): void {
  const store = new InMemoryBookStore();
  const history = new BookCommandHistory();
  const show = (label: string) =>
    log(
      `${label.padEnd(22)} -> ${
        store
          .list()
          .map(b => `#${b.id} ${b.title} (${b.pageCount}p)`)
          .join(', ') || '(empty)'
      }`,
    );

  const createDune = new CreateBookCommand(store, {
    title: 'Dune',
    isbn: '9780441013593',
    authorName: 'Frank Herbert',
    genre: 'Sci-Fi',
    bookType: 'printed',
    pageCount: 412,
  });
  history.execute(createDune);
  history.execute(
    new CreateBookCommand(store, {
      title: 'Emma',
      isbn: '9780141439587',
      authorName: 'Jane Austen',
      genre: 'Classic',
      bookType: 'printed',
      pageCount: 474,
    }),
  );
  show('Create Dune, Emma');

  history.execute(
    new UpdateBookCommand(store, createDune.bookId!, {pageCount: 688}),
  );
  show('Update Dune pages');

  history.execute(new DeleteBookCommand(store, createDune.bookId!));
  show('Delete Dune');
  log(`History: ${history.getHistory().join(' | ')}`);

  history.undo();
  show('Undo (delete)');
  history.undo();
  show('Undo (update)');
  history.redo();
  show('Redo (update)');
  history.redo();
  show('Redo (delete)');
  history.undo();
  show('Undo (delete) again');
}
