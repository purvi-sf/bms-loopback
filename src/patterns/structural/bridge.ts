import {DemoLogger, NewBookRecord} from '../shared/bms-types';

export type PresentableBook = NewBookRecord;

export interface IRenderer {
  readonly format: string;
  renderHeading(text: string): string;
  renderField(label: string, value: string): string;
  render(content: string): string;
  readonly separator: string;
}

export class HTMLRenderer implements IRenderer {
  readonly format = 'html';
  readonly separator = '\n  ';

  renderHeading(text: string): string {
    return `<h2>${escapeHtml(text)}</h2>`;
  }

  renderField(label: string, value: string): string {
    return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
  }

  render(content: string): string {
    return `<article class="book">\n  ${content}\n</article>`;
  }
}

export class JSONRenderer implements IRenderer {
  readonly format = 'json';
  readonly separator = ',';

  renderHeading(text: string): string {
    return `${JSON.stringify('heading')}:${JSON.stringify(text)}`;
  }

  renderField(label: string, value: string): string {
    return `${JSON.stringify(toCamelCase(label))}:${JSON.stringify(value)}`;
  }

  render(content: string): string {
    return JSON.stringify(JSON.parse(`{${content}}`), null, 2);
  }
}

export class MarkdownRenderer implements IRenderer {
  readonly format = 'markdown';
  readonly separator = '\n';

  renderHeading(text: string): string {
    return `## ${text}\n`;
  }

  renderField(label: string, value: string): string {
    return `- **${label}:** ${value}`;
  }

  render(content: string): string {
    return content;
  }
}

// Bridge -- lets any book view be rendered as HTML, JSON or Markdown independently
export abstract class BookPresentation {
  constructor(protected renderer: IRenderer) {}

  setRenderer(renderer: IRenderer): this {
    this.renderer = renderer;
    return this;
  }

  present(book: PresentableBook): string {
    const parts = this.buildParts(book).filter(p => p !== '');
    return this.renderer.render(parts.join(this.renderer.separator));
  }

  protected field(label: string, value: string | number | undefined): string {
    return value === undefined
      ? ''
      : this.renderer.renderField(label, String(value));
  }

  protected abstract buildParts(book: PresentableBook): string[];
}

export class DetailedBookPresentation extends BookPresentation {
  protected buildParts(book: PresentableBook): string[] {
    return [
      this.renderer.renderHeading(book.title),
      this.field('Author', book.authorName),
      this.field('ISBN', book.isbn),
      this.field('Genre', book.genre),
      this.field('Format', book.bookType),
      this.field('Page Count', book.pageCount),
      this.field('File Size', book.fileSize),
      this.field('Published', book.publishDate),
    ];
  }
}

export class SummaryBookPresentation extends BookPresentation {
  protected buildParts(book: PresentableBook): string[] {
    return [
      this.renderer.renderHeading(book.title),
      this.field('By', `${book.authorName} (${book.genre})`),
    ];
  }
}

export function demoBridge(log: DemoLogger = console.log): void {
  const book: PresentableBook = {
    title: 'Clean <Architecture>',
    authorName: 'Robert C. Martin',
    isbn: '9780134494166',
    genre: 'Programming',
    bookType: 'printed',
    pageCount: 432,
    publishDate: '2017-09-10',
  };

  const detailed = new DetailedBookPresentation(new HTMLRenderer());
  log(`Detailed + HTML:\n${detailed.present(book)}`);
  detailed.setRenderer(new JSONRenderer());
  log(`Detailed + JSON:\n${detailed.present(book)}`);

  const summary = new SummaryBookPresentation(new MarkdownRenderer());
  log(`Summary + Markdown:\n${summary.present(book)}`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toCamelCase(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
}
