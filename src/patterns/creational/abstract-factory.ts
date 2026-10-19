import {DemoLogger} from '../shared/bms-types';
import {BaseBookData, EBook, EBookFormat, IBook, PrintedBook} from './factory';

export interface IStoreAuthor {
  readonly name: string;
  getProfile(): string;
}

export interface IStoreCategory {
  readonly name: string;
  getLocation(): string;
}

export interface StoreBookInput extends BaseBookData {
  pageCount?: number;
  publisher?: string;
  fileSize?: string;
  format?: EBookFormat;
}

// Abstract Factory -- creates matching book, author and category families for physical or digital stores
export interface IBookstoreFactory {
  readonly storeName: string;
  createBook(data: StoreBookInput): IBook;
  createAuthor(name: string): IStoreAuthor;
  createCategory(name: string): IStoreCategory;
}

export class PhysicalAuthor implements IStoreAuthor {
  constructor(
    readonly name: string,
    readonly signingEventsPerYear = 4,
  ) {}

  getProfile(): string {
    return `${this.name} (in-store signings: ${this.signingEventsPerYear}/year)`;
  }
}

export class ShelfCategory implements IStoreCategory {
  constructor(
    readonly name: string,
    readonly aisle: number,
    readonly shelf: string,
  ) {}

  getLocation(): string {
    return `${this.name}: Aisle ${this.aisle}, Shelf ${this.shelf}`;
  }
}

export class PhysicalBookstoreFactory implements IBookstoreFactory {
  readonly storeName = 'BMS Physical Store';
  private nextAisle = 1;

  createBook(data: StoreBookInput): IBook {
    if (data.pageCount === undefined) {
      throw new Error('Physical store books need a pageCount');
    }
    return new PrintedBook({
      ...data,
      pageCount: data.pageCount,
      publisher: data.publisher ?? 'Unknown publisher',
    });
  }

  createAuthor(name: string): IStoreAuthor {
    return new PhysicalAuthor(name);
  }

  createCategory(name: string): IStoreCategory {
    const aisle = this.nextAisle++;
    return new ShelfCategory(name, aisle, String.fromCharCode(64 + aisle));
  }
}

export class DigitalAuthor implements IStoreAuthor {
  constructor(readonly name: string) {}

  get profileUrl(): string {
    return `https://bms.example.com/authors/${slugify(this.name)}`;
  }

  getProfile(): string {
    return `${this.name} (online profile: ${this.profileUrl})`;
  }
}

export class TagCategory implements IStoreCategory {
  constructor(readonly name: string) {}

  get tag(): string {
    return `#${slugify(this.name)}`;
  }

  getLocation(): string {
    return `${this.name}: browse tag ${this.tag}`;
  }
}

export class DigitalBookstoreFactory implements IBookstoreFactory {
  readonly storeName = 'BMS Online Store';

  createBook(data: StoreBookInput): IBook {
    if (!data.fileSize) throw new Error('Digital store books need a fileSize');
    return new EBook({
      ...data,
      fileSize: data.fileSize,
      format: data.format ?? 'EPUB',
    });
  }

  createAuthor(name: string): IStoreAuthor {
    return new DigitalAuthor(name);
  }

  createCategory(name: string): IStoreCategory {
    return new TagCategory(name);
  }
}

export function stockBook(
  factory: IBookstoreFactory,
  data: StoreBookInput,
): string {
  const book = factory.createBook(data);
  const author = factory.createAuthor(data.authorName);
  const category = factory.createCategory(data.genre);
  return [
    `${factory.storeName}:`,
    `  Book     -> ${book.getDescription()}`,
    `  Author   -> ${author.getProfile()}`,
    `  Category -> ${category.getLocation()}`,
  ].join('\n');
}

export function demoAbstractFactory(log: DemoLogger = console.log): void {
  const data: StoreBookInput = {
    title: 'The Hobbit',
    isbn: '9780547928227',
    authorName: 'J.R.R. Tolkien',
    genre: 'Fantasy',
    pageCount: 310,
    publisher: 'Houghton Mifflin',
    fileSize: '1.8MB',
    format: 'MOBI',
  };

  for (const factory of [
    new PhysicalBookstoreFactory(),
    new DigitalBookstoreFactory(),
  ]) {
    log(stockBook(factory, data));
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
