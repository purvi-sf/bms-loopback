export type BookType = 'printed' | 'ebook' | 'audio';

export interface BookRecord {
  id: number;
  title: string;
  isbn: string;
  authorName: string;
  authorId?: number;
  genre: string;
  bookType: BookType;
  pageCount?: number;
  fileSize?: string;
  publishDate?: string;
  addedAt: Date;
}

export type NewBookRecord = Omit<BookRecord, 'id' | 'addedAt'> & {
  addedAt?: Date;
};

export interface AuthorRecord {
  id: number;
  name: string;
  email?: string;
  bookCount: number;
}

export interface CategoryRecord {
  id: number;
  name: string;
  bookIds: number[];
}

export type DemoLogger = (line: string) => void;

export function normaliseIsbn(isbn: string): string {
  return isbn.replace(/[\s-]/g, '').toUpperCase();
}
