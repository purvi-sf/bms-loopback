import {BookType, DemoLogger, NewBookRecord} from '../shared/bms-types';

export interface BaseBookData {
  title: string;
  isbn: string;
  authorName: string;
  genre: string;
  publishDate?: string;
}

export interface IBook extends BaseBookData {
  readonly bookType: BookType;
  getDescription(): string;
  toRecord(): NewBookRecord;
}

export interface PrintedBookData extends BaseBookData {
  pageCount: number;
  publisher: string;
}

export type EBookFormat = 'PDF' | 'EPUB' | 'MOBI';

export interface EBookData extends BaseBookData {
  fileSize: string;
  format: EBookFormat;
}

export interface AudioBookData extends BaseBookData {
  duration: number;
  narrator: string;
}

abstract class BaseBook implements IBook {
  abstract readonly bookType: BookType;
  title: string;
  isbn: string;
  authorName: string;
  genre: string;
  publishDate?: string;

  protected constructor(data: BaseBookData) {
    if (!data.title?.trim()) throw new Error('title is required');
    if (!data.isbn?.trim()) throw new Error('isbn is required');
    if (!data.authorName?.trim()) throw new Error('authorName is required');
    this.title = data.title.trim();
    this.isbn = data.isbn.trim();
    this.authorName = data.authorName.trim();
    this.genre = data.genre;
    this.publishDate = data.publishDate;
  }

  abstract getDescription(): string;

  toRecord(): NewBookRecord {
    return {
      title: this.title,
      isbn: this.isbn,
      authorName: this.authorName,
      genre: this.genre,
      bookType: this.bookType,
      publishDate: this.publishDate,
    };
  }
}

export class PrintedBook extends BaseBook {
  readonly bookType = 'printed' as const;
  pageCount: number;
  publisher: string;

  constructor(data: PrintedBookData) {
    super(data);
    if (!Number.isInteger(data.pageCount) || data.pageCount <= 0) {
      throw new Error('pageCount must be a positive integer');
    }
    this.pageCount = data.pageCount;
    this.publisher = data.publisher;
  }

  getDescription(): string {
    return `[Printed] "${this.title}" by ${this.authorName} — ${this.pageCount} pages, ${this.publisher}`;
  }

  toRecord(): NewBookRecord {
    return {...super.toRecord(), pageCount: this.pageCount};
  }
}

export class EBook extends BaseBook {
  readonly bookType = 'ebook' as const;
  fileSize: string;
  format: EBookFormat;

  constructor(data: EBookData) {
    super(data);
    this.fileSize = data.fileSize;
    this.format = data.format;
  }

  getDescription(): string {
    return `[E-Book] "${this.title}" by ${this.authorName} — ${this.format}, ${this.fileSize}`;
  }

  toRecord(): NewBookRecord {
    return {...super.toRecord(), fileSize: this.fileSize};
  }
}

export class AudioBook extends BaseBook {
  readonly bookType = 'audio' as const;
  duration: number;
  narrator: string;

  constructor(data: AudioBookData) {
    super(data);
    if (data.duration <= 0) throw new Error('duration must be positive');
    this.duration = data.duration;
    this.narrator = data.narrator;
  }

  getDescription(): string {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    return `[Audio] "${this.title}" by ${this.authorName} — narrated by ${this.narrator}, ${hours}h ${minutes}m`;
  }
}

export interface BookDataByType {
  printed: PrintedBookData;
  ebook: EBookData;
  audio: AudioBookData;
}

export interface BookClassByType {
  printed: PrintedBook;
  ebook: EBook;
  audio: AudioBook;
}

type BookCreators = {
  [K in BookType]: (data: BookDataByType[K]) => BookClassByType[K];
};

// Factory -- creates printed, e-book and audio books without exposing construction logic
export class BookFactory {
  private readonly creators: BookCreators = {
    printed: data => new PrintedBook(data),
    ebook: data => new EBook(data),
    audio: data => new AudioBook(data),
  };

  createBook<T extends BookType>(
    type: T,
    data: BookDataByType[T],
  ): BookClassByType[T] {
    if (!Object.prototype.hasOwnProperty.call(this.creators, type)) {
      throw new Error(
        `Unknown book type "${String(type)}". Use: ${this.getSupportedTypes().join(', ')}`,
      );
    }
    const creator: BookCreators[T] = this.creators[type];
    return creator(data);
  }

  getSupportedTypes(): BookType[] {
    return Object.keys(this.creators) as BookType[];
  }
}

export function demoFactory(log: DemoLogger = console.log): void {
  const factory = new BookFactory();

  const books: IBook[] = [
    factory.createBook('printed', {
      title: 'Clean Code',
      isbn: '9780132350884',
      authorName: 'Robert C. Martin',
      genre: 'Programming',
      pageCount: 464,
      publisher: 'Prentice Hall',
    }),
    factory.createBook('ebook', {
      title: 'Eloquent JavaScript',
      isbn: '9781593279509',
      authorName: 'Marijn Haverbeke',
      genre: 'Programming',
      fileSize: '4.2MB',
      format: 'EPUB',
    }),
    factory.createBook('audio', {
      title: 'Sapiens',
      isbn: '9780062316097',
      authorName: 'Yuval Noah Harari',
      genre: 'History',
      duration: 925,
      narrator: 'Derek Perkins',
    }),
  ];

  for (const book of books) log(book.getDescription());

  try {
    factory.createBook('comic' as BookType, {} as PrintedBookData);
  } catch (err) {
    log(`Unknown type rejected: ${(err as Error).message}`);
  }
}
