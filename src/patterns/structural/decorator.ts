import {DemoLogger} from '../shared/bms-types';

export interface DisplayableBook {
  title: string;
  authorName: string;
  price: number;
}

export interface IBookDisplay {
  display(): string;
  getPrice(): number;
}

export class BasicBookDisplay implements IBookDisplay {
  constructor(private readonly book: DisplayableBook) {}

  display(): string {
    return `"${this.book.title}" by ${this.book.authorName} — ${formatPrice(this.getPrice())}`;
  }

  getPrice(): number {
    return this.book.price;
  }
}

// Decorator -- stacks featured, discount and bestseller labels onto book listings at runtime
export abstract class BookDecorator implements IBookDisplay {
  constructor(protected readonly wrapped: IBookDisplay) {}

  display(): string {
    return this.wrapped.display();
  }

  getPrice(): number {
    return this.wrapped.getPrice();
  }
}

export class FeaturedBookDecorator extends BookDecorator {
  display(): string {
    return `★ FEATURED ${this.wrapped.display()}`;
  }
}

export class DiscountedBookDecorator extends BookDecorator {
  constructor(
    wrapped: IBookDisplay,
    private readonly discountPercent: number,
  ) {
    super(wrapped);
    if (discountPercent <= 0 || discountPercent >= 100) {
      throw new Error('discountPercent must be between 0 and 100');
    }
  }

  getPrice(): number {
    const discounted =
      this.wrapped.getPrice() * (1 - this.discountPercent / 100);
    return Math.round(discounted * 100) / 100;
  }

  display(): string {
    return `${this.wrapped.display()} | ${this.discountPercent}% OFF → now ${formatPrice(this.getPrice())}`;
  }
}

export class BestsellerDecorator extends BookDecorator {
  display(): string {
    return `${this.wrapped.display()} [BESTSELLER]`;
  }
}

export function demoDecorator(log: DemoLogger = console.log): void {
  const book: DisplayableBook = {
    title: 'Atomic Habits',
    authorName: 'James Clear',
    price: 499,
  };

  const basic = new BasicBookDisplay(book);
  log(`Basic      : ${basic.display()}`);

  const featured = new FeaturedBookDecorator(basic);
  log(`+ Featured : ${featured.display()}`);

  const discounted = new DiscountedBookDecorator(featured, 20);
  log(`+ Discount : ${discounted.display()}`);

  const bestseller = new BestsellerDecorator(discounted);
  log(`+ Best     : ${bestseller.display()}`);
  log(
    `Final price after all decorators: ${formatPrice(bestseller.getPrice())}`,
  );

  const doubleDiscount = new DiscountedBookDecorator(
    new DiscountedBookDecorator(basic, 10),
    10,
  );
  log(`Two 10% discounts stacked: ${formatPrice(doubleDiscount.getPrice())}`);
}

function formatPrice(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
