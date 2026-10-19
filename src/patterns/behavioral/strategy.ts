import {BookRecord as Book, DemoLogger} from '../shared/bms-types';

export interface ISortStrategy {
  readonly name: string;
  sort(books: Book[]): Book[];
}

export class SortByTitleAsc implements ISortStrategy {
  readonly name = 'Title A→Z';
  sort(books: Book[]): Book[] {
    return [...books].sort((a, b) => a.title.localeCompare(b.title));
  }
}

export class SortByTitleDesc implements ISortStrategy {
  readonly name = 'Title Z→A';
  sort(books: Book[]): Book[] {
    return [...books].sort((a, b) => b.title.localeCompare(a.title));
  }
}

export class SortByPageCount implements ISortStrategy {
  readonly name = 'Page count';
  sort(books: Book[]): Book[] {
    return [...books].sort(
      (a, b) => (a.pageCount ?? Infinity) - (b.pageCount ?? Infinity),
    );
  }
}

export class SortByRecentlyAdded implements ISortStrategy {
  readonly name = 'Recently added';
  sort(books: Book[]): Book[] {
    return [...books].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  }
}

// Strategy -- switches the book sorting algorithm at runtime without changing the sorter
export class BookSorter {
  constructor(private strategy: ISortStrategy) {}

  setStrategy(strategy: ISortStrategy): this {
    this.strategy = strategy;
    return this;
  }

  getStrategyName(): string {
    return this.strategy.name;
  }

  sort(books: Book[]): Book[] {
    return this.strategy.sort(books);
  }
}

export const SORT_STRATEGIES: Record<string, ISortStrategy> = {
  titleAsc: new SortByTitleAsc(),
  titleDesc: new SortByTitleDesc(),
  pageCount: new SortByPageCount(),
  recent: new SortByRecentlyAdded(),
};

export function demoStrategy(log: DemoLogger = console.log): void {
  const day = (n: number) => new Date(Date.UTC(2025, 0, n));
  const books: Book[] = [
    {
      id: 1,
      title: 'Dune',
      isbn: '9780441013593',
      authorName: 'Frank Herbert',
      genre: 'Sci-Fi',
      bookType: 'printed',
      pageCount: 688,
      addedAt: day(3),
    },
    {
      id: 2,
      title: 'Animal Farm',
      isbn: '9780451526342',
      authorName: 'George Orwell',
      genre: 'Classic',
      bookType: 'printed',
      pageCount: 140,
      addedAt: day(1),
    },
    {
      id: 3,
      title: 'Neuromancer',
      isbn: '9780441569595',
      authorName: 'William Gibson',
      genre: 'Sci-Fi',
      bookType: 'ebook',
      fileSize: '1.2MB',
      addedAt: day(5),
    },
    {
      id: 4,
      title: 'Circe',
      isbn: '9780316556347',
      authorName: 'Madeline Miller',
      genre: 'Fantasy',
      bookType: 'printed',
      pageCount: 393,
      addedAt: day(2),
    },
  ];

  const sorter = new BookSorter(new SortByTitleAsc());
  for (const strategy of Object.values(SORT_STRATEGIES)) {
    sorter.setStrategy(strategy);
    log(
      `${sorter.getStrategyName().padEnd(15)}: ${sorter
        .sort(books)
        .map(b => b.title)
        .join(', ')}`,
    );
  }
  log(`Original order untouched: ${books.map(b => b.title).join(', ')}`);
}
