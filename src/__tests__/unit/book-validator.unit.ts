import {expect} from '@loopback/testlab';
import sinon from 'sinon';
import {DbDataSource} from '../../datasources';
import {
  BookValidator,
  BookValidatorProvider,
} from '../../providers/book-validator.provider';

describe('BookValidatorProvider (unit)', () => {
  let validator: BookValidator;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
    const dataSource = sinon.createStubInstance(DbDataSource);
    const provider = new BookValidatorProvider(
      dataSource as unknown as DbDataSource,
    );
    validator = provider.value();
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.JWT_SECRET;
  });

  it('returns true for a valid Printed book', () => {
    expect(
      validator({isbn: '9780747532743', bookType: 'Printed', pageCount: 223}),
    ).to.be.true();
  });

  it('returns true for a valid EBook', () => {
    expect(
      validator({isbn: '9780747532743', bookType: 'EBook', fileSize: '2MB'}),
    ).to.be.true();
  });

  it('throws when the ISBN is shorter than 10 characters', () => {
    expect(() =>
      validator({isbn: '123', bookType: 'Printed', pageCount: 223}),
    ).to.throw('ISBN must be at least 10 characters');
  });

  it('throws when a Printed book has no page count', () => {
    expect(() =>
      validator({isbn: '9780747532743', bookType: 'Printed'}),
    ).to.throw('Printed books must have a page count');
  });

  it('throws when an EBook has no file size', () => {
    expect(() =>
      validator({isbn: '9780747532743', bookType: 'EBook'}),
    ).to.throw('EBooks must have a file size');
  });
});
