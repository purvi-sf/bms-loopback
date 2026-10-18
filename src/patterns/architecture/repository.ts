import {
  BookRecord as Book,
  DemoLogger,
  NewBookRecord,
} from '../shared/bms-types';

export type SortOrder = 'asc' | 'desc';

export interface FindAllOptions<T> {
  page?: number;
  limit?: number;
  sortBy?: keyof T;
  sortOrder?: SortOrder;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IRepository<
  T extends {id: ID},
  TCreate = Omit<T, 'id'>,
  ID = number,
> {
  findAll(options?: FindAllOptions<T>): Promise<PaginatedResult<T>>;
  findById(id: ID): Promise<T | null>;
  findBy(criteria: Partial<T>): Promise<T[]>;
  create(data: TCreate): Promise<T>;
  update(id: ID, data: Partial<TCreate>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  count(): Promise<number>;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Repository -- hides how books are stored so BMS logic never touches the database directly
export class InMemoryBookRepository implements IRepository<
  Book,
  NewBookRecord
> {
  private readonly books = new Map<number, Book>();
  private nextId = 1;

  constructor(seed: NewBookRecord[] = []) {
    for (const data of seed) this.insert(data);
  }

  async findAll(
    options: FindAllOptions<Book> = {},
  ): Promise<PaginatedResult<Book>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? DEFAULT_LIMIT;
    if (!Number.isInteger(page) || page < 1)
      throw new Error('page must be an integer >= 1');
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
    }

    let all = [...this.books.values()];
    if (options.sortBy)
      all = sortBooks(all, options.sortBy, options.sortOrder ?? 'asc');

    const start = (page - 1) * limit;
    return {
      items: all.slice(start, start + limit).map(copy),
      total: all.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(all.length / limit)),
    };
  }

  async findById(id: number): Promise<Book | null> {
    const book = this.books.get(id);
    return book ? copy(book) : null;
  }

  async findBy(criteria: Partial<Book>): Promise<Book[]> {
    const entries = Object.entries(criteria) as Array<[keyof Book, unknown]>;
    return [...this.books.values()]
      .filter(book =>
        entries.every(([key, value]) => sameValue(book[key], value)),
      )
      .map(copy);
  }

  async create(data: NewBookRecord): Promise<Book> {
    return copy(this.insert(data));
  }

  async update(id: number, data: Partial<NewBookRecord>): Promise<Book | null> {
    const existing = this.books.get(id);
    if (!existing) return null;
    const updated: Book = {
      ...existing,
      ...structuredClone(data),
      id,
      addedAt: existing.addedAt,
    };
    this.books.set(id, updated);
    return copy(updated);
  }

  async delete(id: number): Promise<boolean> {
    return this.books.delete(id);
  }

  async count(): Promise<number> {
    return this.books.size;
  }

  private insert(data: NewBookRecord): Book {
    const book: Book = {
      ...structuredClone(data),
      id: this.nextId++,
      addedAt: data.addedAt ? new Date(data.addedAt) : new Date(),
    };
    this.books.set(book.id, book);
    return book;
  }
}

function copy(book: Book): Book {
  return structuredClone(book);
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  return a === b;
}

function sortBooks(books: Book[], key: keyof Book, order: SortOrder): Book[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...books].sort((x, y) => {
    const a = x[key];
    const b = y[key];
    if (a === undefined) return b === undefined ? 0 : 1;
    if (b === undefined) return -1;
    if (a instanceof Date && b instanceof Date)
      return (a.getTime() - b.getTime()) * direction;
    if (typeof a === 'number' && typeof b === 'number')
      return (a - b) * direction;
    return String(a).localeCompare(String(b)) * direction;
  });
}

export async function demoRepository(
  log: DemoLogger = console.log,
): Promise<void> {
  const repo: IRepository<Book, NewBookRecord> = new InMemoryBookRepository([
    {
      title: 'Dune',
      isbn: '9780441013593',
      authorName: 'Frank Herbert',
      genre: 'Sci-Fi',
      bookType: 'printed',
      pageCount: 688,
    },
    {
      title: 'Neuromancer',
      isbn: '9780441569595',
      authorName: 'William Gibson',
      genre: 'Sci-Fi',
      bookType: 'ebook',
      fileSize: '1.2MB',
    },
    {
      title: 'Emma',
      isbn: '9780141439587',
      authorName: 'Jane Austen',
      genre: 'Classic',
      bookType: 'printed',
      pageCount: 474,
    },
    {
      title: 'Persuasion',
      isbn: '9780141439686',
      authorName: 'Jane Austen',
      genre: 'Classic',
      bookType: 'printed',
      pageCount: 249,
    },
    {
      title: 'Foundation',
      isbn: '9780553293357',
      authorName: 'Isaac Asimov',
      genre: 'Sci-Fi',
      bookType: 'audio',
    },
  ]);

  const page1 = await repo.findAll({page: 1, limit: 2, sortBy: 'title'});
  log(
    `Page 1/${page1.totalPages} by title: ${page1.items.map(b => b.title).join(', ')} (total ${page1.total})`,
  );
  const page2 = await repo.findAll({page: 2, limit: 2, sortBy: 'title'});
  log(
    `Page 2/${page2.totalPages} by title: ${page2.items.map(b => b.title).join(', ')}`,
  );

  const byPages = await repo.findAll({sortBy: 'pageCount', sortOrder: 'desc'});
  log(
    `By pageCount desc: ${byPages.items.map(b => `${b.title}(${b.pageCount ?? '-'})`).join(', ')}`,
  );

  const austen = await repo.findBy({
    authorName: 'Jane Austen',
    genre: 'Classic',
  });
  log(`findBy author=Jane Austen: ${austen.map(b => b.title).join(', ')}`);

  const created = await repo.create({
    title: 'Hyperion',
    isbn: '9780553283686',
    authorName: 'Dan Simmons',
    genre: 'Sci-Fi',
    bookType: 'printed',
    pageCount: 482,
  });
  const updated = await repo.update(created.id, {pageCount: 500});
  log(`Created #${created.id}, updated pageCount -> ${updated?.pageCount}`);

  log(
    `delete(#${created.id}) -> ${await repo.delete(created.id)}; findById -> ${await repo.findById(created.id)}; count=${await repo.count()}`,
  );
}
