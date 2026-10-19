import {EntityNotFoundError, juggler} from '@loopback/repository';
import {expect} from '@loopback/testlab';
import {Book} from '../../models';
import {BookRepository} from '../../repositories';

function givenBookData(data?: Partial<Book>): Omit<Book, 'id'> {
  return Object.assign(
    {
      title: 'Harry Potter and the Philosopher’s Stone',
      isbn: '9780747532743',
      genre: 'Fantasy',
      bookType: 'Printed',
      pageCount: 223,
      authorId: 1,
    },
    data,
  ) as Omit<Book, 'id'>;
}

describe('BookRepository (integration)', () => {
  let bookRepository: BookRepository;

  beforeEach(() => {
    const dataSource = new juggler.DataSource({
      name: 'db',
      connector: 'memory',
    });
    bookRepository = new BookRepository(dataSource);
  });

  afterEach(async () => {
    await bookRepository.deleteAll();
  });

  it('create() stores a book and returns it with an id', async () => {
    const book = await bookRepository.create(givenBookData());
    expect(book.id).to.be.a.Number();
    expect(book).to.containDeep(givenBookData());
  });

  it('find() returns all created books', async () => {
    await bookRepository.create(givenBookData());
    await bookRepository.create(
      givenBookData({title: 'Dune', isbn: '9780441013593'}),
    );
    const books = await bookRepository.find();
    expect(books.map(b => b.title)).to.eql([givenBookData().title, 'Dune']);
  });

  it('findById() returns the correct book', async () => {
    await bookRepository.create(givenBookData());
    const dune = await bookRepository.create(
      givenBookData({title: 'Dune', isbn: '9780441013593'}),
    );
    const found = await bookRepository.findById(dune.id);
    expect(found.toJSON()).to.eql(dune.toJSON());
  });

  it('findById() throws EntityNotFoundError for a nonexistent id', async () => {
    await expect(bookRepository.findById(999)).to.be.rejectedWith(
      EntityNotFoundError,
    );
  });

  it('updateById() changes only the specified fields', async () => {
    const book = await bookRepository.create(givenBookData());
    await bookRepository.updateById(book.id, {pageCount: 300});
    const updated = await bookRepository.findById(book.id);
    expect(updated.toJSON()).to.eql({...book.toJSON(), pageCount: 300});
  });

  it('deleteById() removes the book', async () => {
    const book = await bookRepository.create(givenBookData());
    await bookRepository.deleteById(book.id);
    expect(await bookRepository.exists(book.id)).to.be.false();
  });

  it('count() returns the number of books', async () => {
    await bookRepository.create(givenBookData());
    await bookRepository.create(
      givenBookData({title: 'Dune', isbn: '9780441013593'}),
    );
    expect(await bookRepository.count()).to.eql({count: 2});
  });
});
