import {Client, expect} from '@loopback/testlab';
import {BmsLoopbackApplication} from '../..';
import {AuthorRepository} from '../../repositories';
import {setupApplication} from './test-helper';

async function getToken(
  client: Client,
  email: string,
  password: string,
): Promise<string> {
  const res = await client
    .post('/auth/login')
    .send({email, password})
    .expect(200);
  return res.body.token;
}

describe('SecureBookController (acceptance)', () => {
  let app: BmsLoopbackApplication;
  let client: Client;
  let authorId: number;
  let validBook: object;

  before('setupApplication', async () => {
    process.env.JWT_SECRET = 'test-secret-key-for-acceptance-tests';
    ({app, client} = await setupApplication());
    const authorRepository = await app.getRepository(AuthorRepository);
    const author = await authorRepository.create({
      firstName: 'J.K.',
      lastName: 'Rowling',
    });
    authorId = author.id!;
    validBook = {
      title: 'Harry Potter and the Philosopher’s Stone',
      isbn: '9780747532743',
      genre: 'Fantasy',
      bookType: 'Printed',
      pageCount: 223,
      authorId,
    };
  });

  after(async () => {
    await app.stop();
    delete process.env.JWT_SECRET;
  });

  it('GET /secure/books without a token returns 401', async () => {
    await client.get('/secure/books').expect(401);
  });

  it('GET /secure/books with an invalid token returns 401', async () => {
    await client
      .get('/secure/books')
      .set('Authorization', 'Bearer badtoken')
      .expect(401);
  });

  it('GET /secure/books with a viewer token returns 200', async () => {
    const token = await getToken(client, 'viewer@bms.com', 'Viewer@123');
    const res = await client
      .get('/secure/books')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).to.be.an.Array();
  });

  it('POST /secure/books with a viewer token returns 403', async () => {
    const token = await getToken(client, 'viewer@bms.com', 'Viewer@123');
    await client
      .post('/secure/books')
      .set('Authorization', `Bearer ${token}`)
      .send(validBook)
      .expect(403);
  });

  it('POST /secure/books with an editor token and valid data returns 201', async () => {
    const token = await getToken(client, 'editor@bms.com', 'Editor@123');
    const res = await client
      .post('/secure/books')
      .set('Authorization', `Bearer ${token}`)
      .send(validBook)
      .expect(201);
    expect(res.body).to.containDeep(validBook);
    expect(res.body.id).to.be.a.Number();
  });

  it('DELETE /secure/books/999 with an editor token returns 403', async () => {
    const token = await getToken(client, 'editor@bms.com', 'Editor@123');
    await client
      .delete('/secure/books/999')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('POST /secure/books with an admin token but missing fields returns 422', async () => {
    const token = await getToken(client, 'admin@bms.com', 'Admin@123');
    await client
      .post('/secure/books')
      .set('Authorization', `Bearer ${token}`)
      .send({title: 'No ISBN or author'})
      .expect(422);
  });
});
