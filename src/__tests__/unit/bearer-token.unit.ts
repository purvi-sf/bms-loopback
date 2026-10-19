import {HttpErrors} from '@loopback/rest';
import {expect} from '@loopback/testlab';
import * as jwt from 'jsonwebtoken';
import sinon from 'sinon';
import {VerifyFunction} from 'loopback4-authentication';
import {
  AuthUser,
  BearerTokenVerifyProvider,
} from '../../providers/bearer-token-verify.provider';

const JWT_SECRET = 'test-secret-key-for-unit-tests';

async function verifyError(
  verifier: VerifyFunction.BearerFn,
  token: string,
): Promise<HttpErrors.HttpError> {
  try {
    await verifier(token);
  } catch (err) {
    return err as HttpErrors.HttpError;
  }
  throw new Error('Expected the verifier to reject the token');
}

describe('BearerTokenVerifyProvider (unit)', () => {
  let verifier: VerifyFunction.BearerFn;
  const payload = {
    userId: 2,
    email: 'editor@bms.com',
    role: 'editor',
    permissions: ['READ_BOOKS', 'CREATE_BOOK'],
  };

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    verifier = new BearerTokenVerifyProvider().value();
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.JWT_SECRET;
  });

  it('returns the user for a valid token', async () => {
    const token = jwt.sign(payload, JWT_SECRET, {expiresIn: '1h'});
    const user = (await verifier(token)) as AuthUser;
    expect(user).to.containDeep({
      id: String(payload.userId),
      username: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    });
  });

  it('throws Unauthorized for an expired token', async () => {
    const token = jwt.sign(payload, JWT_SECRET, {expiresIn: -1});
    const err = await verifyError(verifier, token);
    expect(err).to.be.instanceOf(HttpErrors.Unauthorized);
  });

  it('throws Unauthorized mentioning the signature for a wrong secret', async () => {
    const token = jwt.sign(payload, 'some-other-secret', {expiresIn: '1h'});
    const err = await verifyError(verifier, token);
    expect(err).to.be.instanceOf(HttpErrors.Unauthorized);
    expect(err.message).to.containEql('signature');
  });

  it('throws Unauthorized for a malformed token string', async () => {
    const err = await verifyError(verifier, 'notavalidtoken');
    expect(err).to.be.instanceOf(HttpErrors.Unauthorized);
  });

  it('returns the permissions embedded in the token', async () => {
    const permissions = ['READ_BOOKS'];
    const token = jwt.sign({...payload, permissions}, JWT_SECRET, {
      expiresIn: '1h',
    });
    const user = (await verifier(token)) as AuthUser;
    expect(user.permissions).to.eql(permissions);
  });
});
