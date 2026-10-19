import {
  AuthorRecord,
  BookRecord,
  CategoryRecord,
  DemoLogger,
  NewBookRecord,
  normaliseIsbn,
} from '../shared/bms-types';

export class BooksSubsystem {
  private readonly books = new Map<number, BookRecord>();
  private nextId = 1;

  findBook(id: number): BookRecord | undefined {
    return this.books.get(id);
  }

  findByIsbn(isbn: string): BookRecord | undefined {
    const target = normaliseIsbn(isbn);
    return [...this.books.values()].find(b => normaliseIsbn(b.isbn) === target);
  }

  countByAuthor(authorId: number): number {
    return [...this.books.values()].filter(b => b.authorId === authorId).length;
  }

  createBook(data: NewBookRecord): BookRecord {
    if (this.findByIsbn(data.isbn)) {
      throw new Error(`A book with ISBN ${data.isbn} already exists`);
    }
    const book: BookRecord = {
      ...data,
      id: this.nextId++,
      addedAt: data.addedAt ?? new Date(),
    };
    this.books.set(book.id, book);
    return {...book};
  }

  deleteBook(id: number): boolean {
    return this.books.delete(id);
  }
}

export class AuthorsSubsystem {
  private readonly authors = new Map<number, AuthorRecord>();
  private nextId = 1;

  findAuthor(id: number): AuthorRecord | undefined {
    return this.authors.get(id);
  }

  findAuthorByName(name: string): AuthorRecord | undefined {
    const key = name.trim().toLowerCase();
    return [...this.authors.values()].find(a => a.name.toLowerCase() === key);
  }

  createAuthor(data: {name: string; email?: string}): AuthorRecord {
    if (!data.name.trim()) throw new Error('Author name is required');
    const author: AuthorRecord = {
      id: this.nextId++,
      name: data.name.trim(),
      email: data.email,
      bookCount: 0,
    };
    this.authors.set(author.id, author);
    return author;
  }

  setBookCount(id: number, bookCount: number): void {
    const author = this.authors.get(id);
    if (author) author.bookCount = bookCount;
  }

  deleteAuthor(id: number): boolean {
    return this.authors.delete(id);
  }
}

export class CategoriesSubsystem {
  private readonly categories = new Map<number, CategoryRecord>();
  private nextId = 1;

  findCategory(id: number): CategoryRecord | undefined {
    return this.categories.get(id);
  }

  findCategoryByName(name: string): CategoryRecord | undefined {
    const key = name.trim().toLowerCase();
    return [...this.categories.values()].find(
      c => c.name.toLowerCase() === key,
    );
  }

  createCategory(name: string): CategoryRecord {
    const category: CategoryRecord = {
      id: this.nextId++,
      name: name.trim(),
      bookIds: [],
    };
    this.categories.set(category.id, category);
    return category;
  }

  assignCategory(bookId: number, categoryId: number): void {
    const category = this.categories.get(categoryId);
    if (!category) throw new Error(`Category ${categoryId} not found`);
    if (!category.bookIds.includes(bookId)) category.bookIds.push(bookId);
  }

  findCategoriesForBook(bookId: number): CategoryRecord[] {
    return [...this.categories.values()].filter(c =>
      c.bookIds.includes(bookId),
    );
  }

  unassignBook(bookId: number): void {
    for (const category of this.categories.values()) {
      category.bookIds = category.bookIds.filter(id => id !== bookId);
    }
  }
}

export type FacadeBookInput = Omit<NewBookRecord, 'authorName' | 'authorId'> & {
  categoryNames?: string[];
};

export interface FacadeAuthorInput {
  name: string;
  email?: string;
}

export interface BookDetails {
  book: BookRecord;
  author?: AuthorRecord;
  categories: CategoryRecord[];
}

export interface CascadeDeleteResult {
  deletedBookId: number;
  removedFromCategories: string[];
  deletedAuthorId?: number;
}

// Facade -- one simple API over the books, authors and categories subsystems, like the API gateway
export class BmsFacade {
  constructor(
    private readonly books = new BooksSubsystem(),
    private readonly authors = new AuthorsSubsystem(),
    private readonly categories = new CategoriesSubsystem(),
  ) {}

  getBookWithDetails(id: number): BookDetails | undefined {
    const book = this.books.findBook(id);
    if (!book) return undefined;
    return {
      book: {...book},
      author:
        book.authorId !== undefined
          ? this.authors.findAuthor(book.authorId)
          : undefined,
      categories: this.categories.findCategoriesForBook(id),
    };
  }

  createBookWithAuthor(
    bookData: FacadeBookInput,
    authorData: FacadeAuthorInput,
  ): BookDetails {
    const existingAuthor = this.authors.findAuthorByName(authorData.name);
    const author = existingAuthor ?? this.authors.createAuthor(authorData);

    const {categoryNames = [], ...bookFields} = bookData;
    let book: BookRecord;
    try {
      book = this.books.createBook({
        ...bookFields,
        authorId: author.id,
        authorName: author.name,
      });
    } catch (err) {
      if (!existingAuthor) this.authors.deleteAuthor(author.id);
      throw err;
    }

    this.authors.setBookCount(author.id, this.books.countByAuthor(author.id));

    for (const name of new Set([bookFields.genre, ...categoryNames])) {
      const category =
        this.categories.findCategoryByName(name) ??
        this.categories.createCategory(name);
      this.categories.assignCategory(book.id, category.id);
    }

    return this.getBookWithDetails(book.id)!;
  }

  deleteBookCascade(bookId: number): CascadeDeleteResult {
    const details = this.getBookWithDetails(bookId);
    if (!details) throw new Error(`Book ${bookId} not found`);

    this.categories.unassignBook(bookId);
    this.books.deleteBook(bookId);

    const result: CascadeDeleteResult = {
      deletedBookId: bookId,
      removedFromCategories: details.categories.map(c => c.name),
    };

    const authorId = details.book.authorId;
    if (authorId !== undefined) {
      const remaining = this.books.countByAuthor(authorId);
      if (remaining === 0) {
        this.authors.deleteAuthor(authorId);
        result.deletedAuthorId = authorId;
      } else {
        this.authors.setBookCount(authorId, remaining);
      }
    }
    return result;
  }
}

export function demoFacade(log: DemoLogger = console.log): void {
  const bms = new BmsFacade();

  const first = bms.createBookWithAuthor(
    {
      title: 'Harry Potter 1',
      isbn: '9780747532699',
      genre: 'Fantasy',
      bookType: 'printed',
      pageCount: 223,
      categoryNames: ['Children'],
    },
    {name: 'J.K. Rowling', email: 'jk@example.com'},
  );
  log(
    `Created: ${first.book.title}; author=${first.author?.name} (books: ${first.author?.bookCount}); categories=${first.categories.map(c => c.name).join(', ')}`,
  );

  const second = bms.createBookWithAuthor(
    {
      title: 'Harry Potter 2',
      isbn: '9780747538493',
      genre: 'Fantasy',
      bookType: 'printed',
      pageCount: 251,
    },
    {name: 'J.K. Rowling'},
  );
  log(
    `Created: ${second.book.title}; same author id=${second.author?.id} (books: ${second.author?.bookCount})`,
  );

  try {
    bms.createBookWithAuthor(
      {
        title: 'Duplicate',
        isbn: '9780747532699',
        genre: 'Fantasy',
        bookType: 'printed',
        pageCount: 1,
      },
      {name: 'Someone New'},
    );
  } catch (err) {
    log(`Rolled back: ${(err as Error).message}`);
  }

  log(`Delete #1: ${JSON.stringify(bms.deleteBookCascade(first.book.id))}`);
  log(
    `Book #2 details: author books=${bms.getBookWithDetails(second.book.id)?.author?.bookCount}`,
  );
  log(`Delete #2: ${JSON.stringify(bms.deleteBookCascade(second.book.id))}`);
}
