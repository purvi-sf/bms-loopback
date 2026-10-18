import {DemoLogger} from '../shared/bms-types';

export interface Cloneable<T> {
  clone(): T;
}

export interface BookPrototypeData {
  title: string;
  isbn: string;
  edition: number;
  author: {name: string; nationality?: string};
  genres: string[];
  publisher: {name: string; city: string};
  translations: string[];
  publishDate: Date;
  pageCount: number;
}

// Prototype -- clones an existing book to create new editions without shared state
export class BookPrototype implements Cloneable<BookPrototype> {
  title: string;
  isbn: string;
  edition: number;
  author: {name: string; nationality?: string};
  genres: string[];
  publisher: {name: string; city: string};
  translations: string[];
  publishDate: Date;
  pageCount: number;

  constructor(data: BookPrototypeData) {
    this.title = data.title;
    this.isbn = data.isbn;
    this.edition = data.edition;
    this.author = data.author;
    this.genres = data.genres;
    this.publisher = data.publisher;
    this.translations = data.translations;
    this.publishDate = data.publishDate;
    this.pageCount = data.pageCount;
  }

  clone(): BookPrototype {
    return new BookPrototype(structuredClone(this.toData()));
  }

  cloneAsEdition(
    edition: number,
    changes: Partial<BookPrototypeData> = {},
  ): BookPrototype {
    const copy = this.clone();
    Object.assign(copy, structuredClone(changes), {edition});
    return copy;
  }

  toData(): BookPrototypeData {
    return {
      title: this.title,
      isbn: this.isbn,
      edition: this.edition,
      author: this.author,
      genres: this.genres,
      publisher: this.publisher,
      translations: this.translations,
      publishDate: this.publishDate,
      pageCount: this.pageCount,
    };
  }

  describe(): string {
    return `"${this.title}" ed.${this.edition} (${this.isbn}) — ${this.pageCount}p, ${this.publisher.name}, genres=[${this.genres.join(', ')}], translations=[${this.translations.join(', ')}]`;
  }
}

export function demoPrototype(log: DemoLogger = console.log): void {
  const firstEdition = new BookPrototype({
    title: 'Design Patterns',
    isbn: '9780201633610',
    edition: 1,
    author: {name: 'Erich Gamma', nationality: 'Swiss'},
    genres: ['Programming', 'Software Design'],
    publisher: {name: 'Addison-Wesley', city: 'Boston'},
    translations: ['German'],
    publishDate: new Date('1994-10-31'),
    pageCount: 395,
  });

  const secondEdition = firstEdition.clone();
  secondEdition.edition = 2;
  secondEdition.isbn = '9780201633611';
  secondEdition.genres.push('Object-Oriented');
  secondEdition.translations.push('Japanese', 'Hindi');
  secondEdition.publisher.city = 'New York';
  secondEdition.publishDate.setFullYear(2004);

  log(
    `Original : ${firstEdition.describe()}, city=${firstEdition.publisher.city}, year=${firstEdition.publishDate.getFullYear()}`,
  );
  log(
    `Clone    : ${secondEdition.describe()}, city=${secondEdition.publisher.city}, year=${secondEdition.publishDate.getFullYear()}`,
  );
  log(
    `Nested objects shared? genres=${firstEdition.genres === secondEdition.genres}, publisher=${firstEdition.publisher === secondEdition.publisher}`,
  );

  const editions = [3, 4].map(n =>
    firstEdition.cloneAsEdition(n, {
      isbn: `97802016336${n}0`,
      pageCount: 395 + n * 10,
    }),
  );
  for (const e of editions) log(`Edition  : ${e.describe()}`);
}
