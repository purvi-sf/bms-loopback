import {EntityNotFoundError, juggler} from '@loopback/repository';
import {expect} from '@loopback/testlab';
import {Author} from '../../models';
import {AuthorRepository} from '../../repositories';

function givenAuthorData(data?: Partial<Author>): Omit<Author, 'id'> {
  return Object.assign(
    {
      firstName: 'J.K.',
      lastName: 'Rowling',
      email: 'jk@example.com',
    },
    data,
  ) as Omit<Author, 'id'>;
}

describe('AuthorRepository (integration)', () => {
  let authorRepository: AuthorRepository;

  beforeEach(() => {
    const dataSource = new juggler.DataSource({
      name: 'db',
      connector: 'memory',
    });
    authorRepository = new AuthorRepository(dataSource);
  });

  afterEach(async () => {
    await authorRepository.deleteAll();
  });

  it('create() stores an author and returns it with an id', async () => {
    const author = await authorRepository.create(givenAuthorData());
    expect(author.id).to.be.a.Number();
    expect(author).to.containDeep(givenAuthorData());
  });

  it('find() returns all created authors', async () => {
    await authorRepository.create(givenAuthorData());
    await authorRepository.create(
      givenAuthorData({firstName: 'Frank', lastName: 'Herbert'}),
    );
    const authors = await authorRepository.find();
    expect(authors.map(a => a.lastName)).to.eql(['Rowling', 'Herbert']);
  });

  it('findById() returns the correct author', async () => {
    await authorRepository.create(givenAuthorData());
    const herbert = await authorRepository.create(
      givenAuthorData({firstName: 'Frank', lastName: 'Herbert'}),
    );
    const found = await authorRepository.findById(herbert.id);
    expect(found.toJSON()).to.eql(herbert.toJSON());
  });

  it('findById() throws EntityNotFoundError for a nonexistent id', async () => {
    await expect(authorRepository.findById(999)).to.be.rejectedWith(
      EntityNotFoundError,
    );
  });

  it('updateById() changes only the specified fields', async () => {
    const author = await authorRepository.create(givenAuthorData());
    await authorRepository.updateById(author.id, {bio: 'British author'});
    const updated = await authorRepository.findById(author.id);
    expect(updated.toJSON()).to.eql({
      ...author.toJSON(),
      bio: 'British author',
    });
  });

  it('deleteById() removes the author', async () => {
    const author = await authorRepository.create(givenAuthorData());
    await authorRepository.deleteById(author.id);
    expect(await authorRepository.exists(author.id)).to.be.false();
  });

  it('count() returns the number of authors', async () => {
    await authorRepository.create(givenAuthorData());
    await authorRepository.create(
      givenAuthorData({firstName: 'Frank', lastName: 'Herbert'}),
    );
    expect(await authorRepository.count()).to.eql({count: 2});
  });
});
