import {Client, expect} from '@loopback/testlab';
import {BmsLoopbackApplication} from '../..';
import {setupApplication} from './test-helper';

describe('Auth (acceptance)', () => {
  let app: BmsLoopbackApplication;
  let client: Client;

  before('setupApplication', async () => {
    process.env.JWT_SECRET = 'test-secret-key-for-acceptance-tests';
    ({app, client} = await setupApplication());
  });

  after(async () => {
    await app.stop();
    delete process.env.JWT_SECRET;
  });

  it('POST /auth/login with admin credentials returns a token', async () => {
    const res = await client
      .post('/auth/login')
      .send({email: 'admin@bms.com', password: 'Admin@123'})
      .expect(200);
    expect(res.body).to.have.property('token');
  });

  it('POST /auth/login with a wrong password returns 401', async () => {
    await client
      .post('/auth/login')
      .send({email: 'admin@bms.com', password: 'WrongPass1'})
      .expect(401);
  });

  it('POST /auth/login with an unknown email returns 401', async () => {
    await client
      .post('/auth/login')
      .send({email: 'nobody@bms.com', password: 'Admin@123'})
      .expect(401);
  });

  it('GET /auth/rbac-info returns the roles', async () => {
    const res = await client.get('/auth/rbac-info').expect(200);
    expect(res.body).to.have.property('roles');
  });

  it('GET /auth/google returns 200', async () => {
    await client.get('/auth/google').expect(200);
  });

  it('GET /auth/google-auth-redirect returns 200', async () => {
    await client.get('/auth/google-auth-redirect').expect(200);
  });
});
