import {existsSync, readFileSync} from 'fs';
import {IRepository, InMemoryBookRepository} from '../architecture/repository';
import {
  BookRecord,
  BookType,
  DemoLogger,
  NewBookRecord,
} from '../shared/bms-types';
import {buildBookValidationChain} from './chain-of-responsibility';

export interface ParsedBookRow {
  title?: string;
  isbn?: string;
  authorName?: string;
  genre?: string;
  bookType?: string;
  pageCount?: number;
  fileSize?: string;
  publishDate?: string;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportReport {
  format: string;
  totalRows: number;
  imported: number;
  failed: number;
  importedIds: number[];
  errors: ImportError[];
  durationMs: number;
}

const BOOK_TYPES: readonly BookType[] = ['printed', 'ebook', 'audio'];

// Template Method -- fixes the import steps once while CSV and JSON supply their own parsing
export abstract class BookImporter {
  abstract readonly format: string;

  constructor(
    protected readonly repository: IRepository<BookRecord, NewBookRecord>,
  ) {}

  async importBooks(source: string): Promise<ImportReport> {
    const startedAt = Date.now();
    const raw = this.readData(source);
    const rows = this.parseData(raw);
    const {valid, errors} = await this.validateData(rows);
    const saved = await this.saveData(valid);
    return this.generateReport(
      rows.length,
      saved,
      errors,
      Date.now() - startedAt,
    );
  }

  protected abstract readData(source: string): string;

  protected abstract parseData(raw: string): ParsedBookRow[];

  protected readSource(source: string): string {
    const text = existsSync(source) ? readFileSync(source, 'utf8') : source;
    return text.replace(/^\uFEFF/, '');
  }

  protected async validateData(
    rows: ParsedBookRow[],
  ): Promise<{valid: NewBookRecord[]; errors: ImportError[]}> {
    const existing = await this.repository.findBy({});
    const {chain, duplicates} = buildBookValidationChain(
      existing.map(b => b.isbn),
    );
    const valid: NewBookRecord[] = [];
    const errors: ImportError[] = [];

    rows.forEach((row, i) => {
      const bookType = (row.bookType ?? 'printed').toLowerCase() as BookType;
      const missing = (['authorName', 'genre'] as const).filter(
        f => !row[f]?.trim(),
      );

      const error =
        (!BOOK_TYPES.includes(bookType)
          ? `Unknown bookType "${row.bookType}"`
          : null) ??
        (missing.length ? `Missing ${missing.join(', ')}` : null) ??
        chain.handle({...row, bookType});

      if (error) {
        errors.push({row: i + 1, message: error});
        return;
      }
      duplicates.remember(row.isbn!);
      valid.push({
        title: row.title!.trim(),
        isbn: row.isbn!.trim(),
        authorName: row.authorName!.trim(),
        genre: row.genre!.trim(),
        bookType,
        pageCount: row.pageCount,
        fileSize: row.fileSize,
        publishDate: row.publishDate,
      });
    });
    return {valid, errors};
  }

  protected async saveData(books: NewBookRecord[]): Promise<BookRecord[]> {
    const saved: BookRecord[] = [];
    for (const book of books) saved.push(await this.repository.create(book));
    return saved;
  }

  protected generateReport(
    totalRows: number,
    saved: BookRecord[],
    errors: ImportError[],
    durationMs: number,
  ): ImportReport {
    return {
      format: this.format,
      totalRows,
      imported: saved.length,
      failed: errors.length,
      importedIds: saved.map(b => b.id),
      errors,
      durationMs,
    };
  }
}

export class CSVBookImporter extends BookImporter {
  readonly format = 'CSV';

  protected readData(source: string): string {
    return this.readSource(source)
      .split(/\r?\n/)
      .filter(line => line.trim() !== '')
      .join('\n');
  }

  protected parseData(raw: string): ParsedBookRow[] {
    const [headerLine, ...lines] = raw.split('\n');
    if (!headerLine) return [];
    const headers = parseCsvLine(headerLine).map(h => h.trim().toLowerCase());

    return lines.map(line => {
      const cells = parseCsvLine(line);
      const get = (name: string) => {
        const value = cells[headers.indexOf(name.toLowerCase())]?.trim();
        return value === '' ? undefined : value;
      };
      const pages = get('pageCount');
      return {
        title: get('title'),
        isbn: get('isbn'),
        authorName: get('author'),
        genre: get('genre'),
        bookType: get('bookType'),
        pageCount: pages === undefined ? undefined : Number(pages),
        fileSize: get('fileSize'),
        publishDate: get('publishDate'),
      };
    });
  }
}

export class JSONBookImporter extends BookImporter {
  readonly format = 'JSON';

  protected readData(source: string): string {
    return this.readSource(source).trim();
  }

  protected parseData(raw: string): ParsedBookRow[] {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as {books?: unknown}).books;
    if (!Array.isArray(list))
      throw new Error('JSON must be an array or {"books": [...]}');

    return list.map((item: Record<string, unknown>) => ({
      title: asString(item.title),
      isbn: asString(item.isbn),
      authorName: asString(item.author ?? item.authorName),
      genre: asString(item.genre),
      bookType: asString(item.bookType),
      pageCount:
        item.pageCount === undefined ? undefined : Number(item.pageCount),
      fileSize: asString(item.fileSize),
      publishDate: asString(item.publishDate),
    }));
  }
}

export async function demoTemplateMethod(
  log: DemoLogger = console.log,
): Promise<void> {
  const repository = new InMemoryBookRepository();

  const csv = [
    'title,isbn,author,genre,bookType,pageCount,fileSize',
    'Dune,9780441013593,Frank Herbert,Sci-Fi,printed,688,',
    '"Good Omens, Revised",9780060853983,"Pratchett & Gaiman",Fantasy,printed,412,',
    'No Pages,9780141439587,Someone,Classic,printed,,',
    'Neuromancer,9780441569595,William Gibson,Sci-Fi,ebook,,1.2MB',
  ].join('\r\n');

  const json = JSON.stringify({
    books: [
      {
        title: 'Emma',
        isbn: '9780141439587',
        author: 'Jane Austen',
        genre: 'Classic',
        bookType: 'printed',
        pageCount: 474,
      },
      {
        title: 'Dune (dup)',
        isbn: '978-0-441-01359-3',
        author: 'Frank Herbert',
        genre: 'Sci-Fi',
        bookType: 'printed',
        pageCount: 688,
      },
      {
        title: 'Sapiens',
        isbn: '9780062316097',
        author: 'Yuval Noah Harari',
        genre: 'History',
        bookType: 'audio',
      },
      {title: '', isbn: '9780000000000', author: 'Nobody', genre: 'None'},
    ],
  });

  for (const [importer, data] of [
    [new CSVBookImporter(repository), csv],
    [new JSONBookImporter(repository), json],
  ] as const) {
    const report = await importer.importBooks(data);
    log(
      `${report.format}: ${report.imported}/${report.totalRows} imported, ${report.failed} failed`,
    );
    for (const e of report.errors) log(`  row ${e.row}: ${e.message}`);
  }
  log(`Repository now holds ${await repository.count()} books`);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function asString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}
