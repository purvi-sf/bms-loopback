import {HttpErrors} from '@loopback/rest';
import {expect} from '@loopback/testlab';
import * as jwt from 'jsonwebtoken';
import sinon from 'sinon';
import {
  AuthController,
  ROLE_PERMISSIONS,
} from '../../controllers/auth.controller';

const JWT_SECRET = 'test-secret-key-for-unit-tests';

interface LoginResult {
  success: boolean;
  token: string;
  user: {id: number; email: string; name: string; role: string};
  permissions: string[];
}

async function loginError(
  controller: AuthController,
  email: string,
  password: string,
): Promise<HttpErrors.HttpError> {
  try {
    await controller.login({email, password});
  } catch (err) {
    return err as HttpErrors.HttpError;
  }
  throw new Error('Expected login to be rejected');
}

describe('AuthController (unit)', () => {
  let controller: AuthController;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    controller = new AuthController();
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.JWT_SECRET;
  });

  it('logs in an admin and returns a token', async () => {
    const result = (await controller.login({
      email: 'admin@bms.com',
      password: 'Admin@123',
    })) as LoginResult;
    expect(result.success).to.be.true();
    expect(result.token).to.be.a.String();
  });

  it('returns the viewer role for a viewer login', async () => {
    const result = (await controller.login({
      email: 'viewer@bms.com',
      password: 'Viewer@123',
    })) as LoginResult;
    expect(result.user.role).to.equal('viewer');
  });

  it('rejects a wrong password with Invalid credentials', async () => {
    const err = await loginError(controller, 'admin@bms.com', 'WrongPass1');
    expect(err).to.be.instanceOf(HttpErrors.Unauthorized);
    expect(err.message).to.equal('Invalid credentials');
  });

  it('rejects an unknown email with Invalid credentials', async () => {
    const err = await loginError(controller, 'nobody@bms.com', 'Admin@123');
    expect(err).to.be.instanceOf(HttpErrors.Unauthorized);
    expect(err.message).to.equal('Invalid credentials');
  });

  it('returns the permissions defined in ROLE_PERMISSIONS for the role', async () => {
    const result = (await controller.login({
      email: 'editor@bms.com',
      password: 'Editor@123',
    })) as LoginResult;
    expect(result.permissions).to.eql(ROLE_PERMISSIONS[result.user.role]);
  });

  it('returns a JWT that verifies with JWT_SECRET', async () => {
    const result = (await controller.login({
      email: 'admin@bms.com',
      password: 'Admin@123',
    })) as LoginResult;
    const decoded = jwt.verify(result.token, JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.email).to.equal('admin@bms.com');
    expect(decoded.role).to.equal(result.user.role);
    expect(decoded.permissions).to.eql(ROLE_PERMISSIONS[result.user.role]);
  });
});
