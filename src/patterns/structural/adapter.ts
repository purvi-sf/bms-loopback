import {DemoLogger} from '../shared/bms-types';

export interface CurrentBook {
  title: string;
  authorName: string;
  publishDate: string;
  pageCount: number;
  isbn: string;
}
export interface LegacyBook {
  book_title: string;
  author_name: string;
  publication_year: number;
  page_count: number;
  book_isbn: string;
}

export interface MockAPIBook {
  id: string;
  name: string;
  writer: string;
  year: number | string;
  pages: number | string;
  code: string;
}

export interface IBookAdapter<Source> {
  adapt(source: Source): CurrentBook;
  adaptMany(sources: Source[]): CurrentBook[];
}

// Adapter -- converts legacy and MockAPI book formats into the current BMS format
export class LegacyBookAdapter implements IBookAdapter<LegacyBook> {
  adapt(legacy: LegacyBook): CurrentBook {
    return {
      title: legacy.book_title.trim(),
      authorName: legacy.author_name.trim(),
      publishDate: yearToIsoDate(legacy.publication_year),
      pageCount: toPositiveInt(legacy.page_count, 'page_count'),
      isbn: legacy.book_isbn.replace(/[\s-]/g, ''),
    };
  }

  adaptMany(legacyBooks: LegacyBook[]): CurrentBook[] {
    return legacyBooks.map(b => this.adapt(b));
  }
}

export class MockAPIAdapter implements IBookAdapter<MockAPIBook> {
  adapt(apiBook: MockAPIBook): CurrentBook {
    return {
      title: apiBook.name.trim(),
      authorName: apiBook.writer.trim(),
      publishDate: yearToIsoDate(Number(apiBook.year)),
      pageCount: toPositiveInt(Number(apiBook.pages), 'pages'),
      isbn: apiBook.code.replace(/[\s-]/g, ''),
    };
  }

  adaptMany(apiBooks: MockAPIBook[]): CurrentBook[] {
    return apiBooks.map(b => this.adapt(b));
  }
}

export function demoAdapter(log: DemoLogger = console.log): void {
  const legacyRows: LegacyBook[] = [
    {
      book_title: 'The Mythical Man-Month ',
      author_name: 'Fred Brooks',
      publication_year: 1975,
      page_count: 322,
      book_isbn: '978-0-201-83595-3',
    },
  ];

  const mockApiResponse: MockAPIBook[] = [
    {
      id: '1',
      name: 'Refactoring',
      writer: 'Martin Fowler',
      year: '2018',
      pages: '448',
      code: '9780134757599',
    },
  ];

  const adapters: Array<[string, () => CurrentBook[]]> = [
    ['Legacy ', () => new LegacyBookAdapter().adaptMany(legacyRows)],
    ['MockAPI', () => new MockAPIAdapter().adaptMany(mockApiResponse)],
  ];

  for (const [source, run] of adapters) {
    for (const book of run()) log(`${source} -> ${JSON.stringify(book)}`);
  }
}

function yearToIsoDate(year: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error(`Invalid publication year: ${year}`);
  }
  return `${year}-01-01`;
}

function toPositiveInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return value;
}
