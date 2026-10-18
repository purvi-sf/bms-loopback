import {BookType, DemoLogger, NewBookRecord} from '../shared/bms-types';

// Builder -- assembles a book step by step and validates it before saving
export class BookBuilder {
  private data: Partial<NewBookRecord> = {};

  setTitle(title: string): this {
    this.data.title = title.trim();
    return this;
  }

  setIsbn(isbn: string): this {
    this.data.isbn = isbn.trim();
    return this;
  }

  setAuthor(authorName: string, authorId?: number): this {
    this.data.authorName = authorName.trim();
    this.data.authorId = authorId;
    return this;
  }

  setGenre(genre: string): this {
    this.data.genre = genre.trim();
    return this;
  }

  setPageCount(pageCount: number): this {
    this.data.pageCount = pageCount;
    return this;
  }

  setFileSize(fileSize: string): this {
    this.data.fileSize = fileSize.trim();
    return this;
  }

  setBookType(bookType: BookType): this {
    this.data.bookType = bookType;
    return this;
  }

  setPublishDate(publishDate: string): this {
    this.data.publishDate = publishDate;
    return this;
  }

  reset(): this {
    this.data = {};
    return this;
  }

  build(): NewBookRecord {
    const {title, isbn, authorName, genre, pageCount, fileSize} = this.data;
    const bookType = this.data.bookType ?? (fileSize ? 'ebook' : 'printed');
    const errors: string[] = [];

    if (!title) errors.push('title is required');
    if (!isbn) errors.push('isbn is required');
    if (!authorName) errors.push('author is required');
    if (!genre) errors.push('genre is required');

    if (bookType === 'printed') {
      if (pageCount === undefined) {
        errors.push('pageCount is required for printed books');
      } else if (!Number.isInteger(pageCount) || pageCount <= 0) {
        errors.push('pageCount must be a positive integer');
      }
      if (fileSize) errors.push('printed books cannot have a fileSize');
    }
    if (bookType === 'ebook') {
      if (!fileSize) errors.push('fileSize is required for e-books');
      if (pageCount !== undefined)
        errors.push('e-books cannot have a pageCount');
    }

    if (errors.length > 0) {
      throw new Error(`Cannot build book: ${errors.join('; ')}`);
    }

    return {
      ...this.data,
      title: title!,
      isbn: isbn!,
      authorName: authorName!,
      genre: genre!,
      bookType,
    };
  }
}

export function demoBuilder(log: DemoLogger = console.log): void {
  const printed = new BookBuilder()
    .setTitle('The Pragmatic Programmer')
    .setIsbn('9780135957059')
    .setAuthor('David Thomas', 1)
    .setGenre('Programming')
    .setPageCount(352)
    .setPublishDate('2019-09-13')
    .build();
  log(`Built printed book: ${JSON.stringify(printed)}`);

  const ebook = new BookBuilder()
    .setTitle('You Don’t Know JS Yet')
    .setIsbn('9798602477429')
    .setAuthor('Kyle Simpson')
    .setGenre('Programming')
    .setFileSize('3.1MB')
    .build();
  log(`Built e-book (type inferred): ${ebook.bookType}`);

  try {
    new BookBuilder().setTitle('Missing Fields').setPageCount(-5).build();
  } catch (err) {
    log(`Validation: ${(err as Error).message}`);
  }
}
