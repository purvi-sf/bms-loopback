import {inject, Provider} from '@loopback/core';
import {DbDataSource} from '../datasources';

export type BookValidator = (book: {
  isbn: string;
  bookType: string;
  pageCount?: number;
  fileSize?: string;
}) => boolean;

export class BookValidatorProvider implements Provider<BookValidator> {
  // Demonstrates explicit Dependency Injection using @inject
  // The datasource is injected by LoopBack's IoC container
  constructor(
    @inject('datasources.db')
    private dataSource: DbDataSource,
  ) { }

  value(): BookValidator {
    return (book) => {
      if (!book.isbn || book.isbn.length < 10) {
        throw new Error('ISBN must be at least 10 characters');
      }
      if (book.bookType === 'Printed' && !book.pageCount) {
        throw new Error('Printed books must have a page count');
      }
      if (book.bookType === 'EBook' && !book.fileSize) {
        throw new Error('EBooks must have a file size');
      }
      return true;
    };
  }
}
