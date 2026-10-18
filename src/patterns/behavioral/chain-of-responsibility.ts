import {DemoLogger, NewBookRecord, normaliseIsbn} from '../shared/bms-types';

export type ValidatableBook = Partial<NewBookRecord>;

export interface IHandler {
  setNext(handler: IHandler): IHandler;
  handle(book: ValidatableBook): string | null;
}

// Chain of Responsibility -- passes a book through independent validation rules in order
export abstract class ValidationHandler implements IHandler {
  private next?: IHandler;

  setNext(handler: IHandler): IHandler {
    this.next = handler;
    return handler;
  }

  handle(book: ValidatableBook): string | null {
    const error = this.check(book);
    if (error) return error;
    return this.next ? this.next.handle(book) : null;
  }

  protected abstract check(book: ValidatableBook): string | null;
}

export class TitleValidationHandler extends ValidationHandler {
  protected check(book: ValidatableBook): string | null {
    if (!book.title?.trim()) return 'Title must not be empty';
    if (book.title.trim().length > 200)
      return 'Title must be 200 characters or fewer';
    return null;
  }
}

export class ISBNValidationHandler extends ValidationHandler {
  protected check(book: ValidatableBook): string | null {
    if (!book.isbn) return 'ISBN is required';
    const isbn = normaliseIsbn(book.isbn);
    if (!/^(\d{13}|\d{9}[\dX])$/.test(isbn)) {
      return `ISBN "${book.isbn}" must be 10 or 13 digits`;
    }
    return null;
  }
}

export class PageCountValidationHandler extends ValidationHandler {
  protected check(book: ValidatableBook): string | null {
    if (book.bookType !== undefined && book.bookType !== 'printed') return null;
    const {pageCount} = book;
    if (
      pageCount === undefined ||
      !Number.isInteger(pageCount) ||
      pageCount <= 0
    ) {
      return 'Printed books must have a page count greater than 0';
    }
    return null;
  }
}

export class DuplicateCheckHandler extends ValidationHandler {
  private readonly existing: Set<string>;

  constructor(existingIsbns: Iterable<string>) {
    super();
    this.existing = new Set([...existingIsbns].map(normaliseIsbn));
  }

  remember(isbn: string): void {
    this.existing.add(normaliseIsbn(isbn));
  }

  protected check(book: ValidatableBook): string | null {
    return this.existing.has(normaliseIsbn(book.isbn ?? ''))
      ? `A book with ISBN ${book.isbn} already exists`
      : null;
  }
}

export function buildBookValidationChain(
  existingIsbns: Iterable<string> = [],
): {
  chain: IHandler;
  duplicates: DuplicateCheckHandler;
} {
  const chain = new TitleValidationHandler();
  const duplicates = new DuplicateCheckHandler(existingIsbns);
  chain
    .setNext(new ISBNValidationHandler())
    .setNext(new PageCountValidationHandler())
    .setNext(duplicates);
  return {chain, duplicates};
}

export function demoChainOfResponsibility(log: DemoLogger = console.log): void {
  const {chain} = buildBookValidationChain(['978-0-441-01359-3']);

  const candidates: Array<[string, ValidatableBook]> = [
    [
      'valid printed',
      {
        title: 'Emma',
        isbn: '9780141439587',
        bookType: 'printed',
        pageCount: 474,
      },
    ],
    [
      'valid ebook (no pages)',
      {title: 'Neuromancer', isbn: '0441569595', bookType: 'ebook'},
    ],
    [
      'ISBN-10 ending in X',
      {
        title: 'Linux Book',
        isbn: '0-9752298-0-X',
        bookType: 'printed',
        pageCount: 300,
      },
    ],
    [
      'empty title',
      {title: '  ', isbn: '9780141439587', bookType: 'printed', pageCount: 10},
    ],
    [
      'bad ISBN',
      {title: 'Bad', isbn: '12345', bookType: 'printed', pageCount: 10},
    ],
    [
      'printed, 0 pages',
      {title: 'Thin', isbn: '9780141439686', bookType: 'printed', pageCount: 0},
    ],
    [
      'duplicate ISBN',
      {
        title: 'Dune again',
        isbn: '9780441013593',
        bookType: 'printed',
        pageCount: 412,
      },
    ],
  ];

  for (const [label, book] of candidates) {
    const error = chain.handle(book);
    log(`${label.padEnd(24)}: ${error ? `REJECTED — ${error}` : 'OK'}`);
  }
}
