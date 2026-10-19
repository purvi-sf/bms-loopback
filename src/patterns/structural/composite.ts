import {DemoLogger} from '../shared/bms-types';

export interface IBookComponent {
  getTitle(): string;
  getCount(): number;
  display(indent?: number): string;
}

export class Book implements IBookComponent {
  constructor(
    readonly title: string,
    readonly authorName: string,
    readonly isbn: string,
  ) {}

  getTitle(): string {
    return this.title;
  }

  getCount(): number {
    return 1;
  }

  display(indent = 0): string {
    return `${pad(indent)}- ${this.title} (${this.authorName})`;
  }
}

// Composite -- treats single books and nested library sections the same way
export class BookCollection implements IBookComponent {
  private readonly children: IBookComponent[] = [];

  constructor(readonly name: string) {}

  add(...components: IBookComponent[]): this {
    for (const component of components) {
      if (
        component === this ||
        (component instanceof BookCollection && component.contains(this))
      ) {
        throw new Error(
          `Adding "${component.getTitle()}" to "${this.name}" would create a cycle`,
        );
      }
      this.children.push(component);
    }
    return this;
  }

  remove(component: IBookComponent): boolean {
    const index = this.children.indexOf(component);
    if (index === -1) return false;
    this.children.splice(index, 1);
    return true;
  }

  getChildren(): readonly IBookComponent[] {
    return this.children;
  }

  contains(component: IBookComponent): boolean {
    return this.children.some(
      child =>
        child === component ||
        (child instanceof BookCollection && child.contains(component)),
    );
  }

  getTitle(): string {
    return this.name;
  }

  getCount(): number {
    return this.children.reduce((sum, child) => sum + child.getCount(), 0);
  }

  display(indent = 0): string {
    const header = `${pad(indent)}+ ${this.name} [${this.getCount()} book${this.getCount() === 1 ? '' : 's'}]`;
    return [header, ...this.children.map(c => c.display(indent + 1))].join(
      '\n',
    );
  }
}

export function demoComposite(log: DemoLogger = console.log): void {
  const library = new BookCollection('BMS Central Library').add(
    new BookCollection('Fiction Section').add(
      new BookCollection('Fantasy Shelf').add(
        new Book('The Hobbit', 'J.R.R. Tolkien', '9780547928227'),
        new Book('Mistborn', 'Brandon Sanderson', '9780765311788'),
      ),
      new BookCollection('Mystery Shelf').add(
        new Book('Gone Girl', 'Gillian Flynn', '9780307588371'),
      ),
    ),
    new BookCollection('Technology Section').add(
      new BookCollection('Programming Shelf').add(
        new Book('Clean Code', 'Robert C. Martin', '9780132350884'),
        new Book('Refactoring', 'Martin Fowler', '9780134757599'),
      ),
    ),
    new Book('Library Guide', 'BMS Staff', '0000000000'),
  );

  log(library.display());
  log(`Total books: ${library.getCount()}`);

  const fiction = library.getChildren()[0] as BookCollection;
  const mystery = fiction.getChildren()[1];
  fiction.remove(mystery);
  log(`After removing "${mystery.getTitle()}": ${library.getCount()} books`);

  try {
    fiction.add(library);
  } catch (err) {
    log(`Cycle prevented: ${(err as Error).message}`);
  }
}

function pad(indent: number): string {
  return '  '.repeat(indent);
}
