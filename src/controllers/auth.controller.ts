import {get, HttpErrors, post, requestBody, response} from '@loopback/rest';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {authenticate} from 'loopback4-authentication';
import {authorize} from 'loopback4-authorization';

// JWT secret in production comes from process.env.JWT_SECRET
// which is stored in GitHub Secrets, never hardcoded
const MISSING_SECRET_MESSAGE =
  'JWT_SECRET environment variable is required. Set it in .env or GitHub Secrets.';
if (!process.env.JWT_SECRET) {
  throw new Error(MISSING_SECRET_MESSAGE);
}

// Read on every sign/verify so a rotated or test-specific secret is picked up
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(MISSING_SECRET_MESSAGE);
  }
  return secret;
}
const JWT_EXPIRY = '1h';

// Role     | Permissions
// admin    | READ_BOOKS, CREATE_BOOK, DELETE_BOOK
// editor   | READ_BOOKS, CREATE_BOOK
// viewer   | READ_BOOKS
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['READ_BOOKS', 'CREATE_BOOK', 'DELETE_BOOK'],
  editor: ['READ_BOOKS', 'CREATE_BOOK'],
  viewer: ['READ_BOOKS'],
};

// OWASP A07: Passwords stored as bcrypt hashes, never plain text
// bcrypt rounds=12: strong enough for production, ~300ms per hash
// Salt is automatically generated and stored inside the hash string
const MOCK_USERS = [
  {
    id: 1,
    email: 'admin@bms.com',
    // bcrypt hash of "Admin@123"
    passwordHash: bcrypt.hashSync('Admin@123', 12),
    role: 'admin',
    name: 'Admin User',
  },
  {
    id: 2,
    email: 'editor@bms.com',
    passwordHash: bcrypt.hashSync('Editor@123', 12),
    role: 'editor',
    name: 'Editor User',
  },
  {
    id: 3,
    email: 'viewer@bms.com',
    passwordHash: bcrypt.hashSync('Viewer@123', 12),
    role: 'viewer',
    name: 'Viewer User',
  },
];

// Real bcrypt hash compared against when the email is unknown, so failed
// logins take the same time whether or not the account exists
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

export class AuthController {
  constructor() {}

  // POST /auth/login -- local authentication
  // OAuth 2.0 Step 1: user provides credentials
  // OAuth 2.0 Step 2: system authenticates and issues a signed JWT
  @post('/auth/login')
  @response(200, {
    description: 'Login successful -- returns signed JWT access token',
  })
  async login(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: {type: 'string', format: 'email'},
              password: {type: 'string', minLength: 6},
            },
          },
        },
      },
    })
    credentials: {
      email: string;
      password: string;
    },
  ): Promise<object> {
    // Find user by email
    const user = MOCK_USERS.find(u => u.email === credentials.email);

    // OWASP A07: use constant-time comparison via bcrypt
    // Never reveal whether email or password was wrong always say "Invalid credentials"
    // This prevents user enumeration attacks
    if (!user) {
      // Still run bcrypt to prevent timing attacks that reveal valid emails
      await bcrypt.compare(credentials.password, DUMMY_HASH);
      throw new HttpErrors.Unauthorized('Invalid credentials');
    }

    // OWASP A02: bcrypt.compare does constant-time comparison
    // preventing timing attacks
    const passwordValid = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new HttpErrors.Unauthorized('Invalid credentials');
    }

    // OWASP A02: sign the JWT with a secret key using HS256 algorithm
    // The signature prevents token tampering if anyone modifies the payload,
    // the signature verification will fail
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: ROLE_PERMISSIONS[user.role],
      },
      getJwtSecret(),
      {
        expiresIn: JWT_EXPIRY,
        // OWASP A07: tokens expire after 1 hour
        // Limits the damage if a token is stolen
        algorithm: 'HS256',
      },
    );

    return {
      success: true,
      token,
      // OWASP A02: never return the password hash in the response
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      permissions: ROLE_PERMISSIONS[user.role],
      expiresIn: JWT_EXPIRY,
    };
  }

  // GET /auth/google Google OAuth2 endpoint
  @get('/auth/google')
  @response(200, {description: 'Google OAuth2 authentication endpoint'})
  async googleAuth(): Promise<object> {
    return {
      message: 'Google OAuth2 Authentication',
      description: 'In production, this redirects to Google consent screen',
      requiredEnvVars: [
        'GOOGLE_AUTH_URL',
        'GOOGLE_AUTH_CLIENT_ID',
        'GOOGLE_AUTH_CLIENT_SECRET',
        'GOOGLE_AUTH_TOKEN_URL',
        'GOOGLE_AUTH_CALLBACK_URL',
      ],
      oauthFlow: [
        '1. User visits /auth/google',
        '2. Redirect to Google consent screen',
        '3. User authenticates with Google',
        '4. Google redirects to GOOGLE_AUTH_CALLBACK_URL with code',
        '5. Exchange code for access token (server-to-server)',
        '6. Use token to get user profile from Google',
        '7. Create/find user in our database',
        '8. Issue our own signed JWT token',
      ],
      passportStrategy: 'passport-google-oauth20',
      arcPackage: 'loopback4-authentication',
    };
  }

  // GET /auth/google-auth-redirect Google OAuth2 callback
  @get('/auth/google-auth-redirect')
  @response(200, {description: 'Google OAuth2 callback'})
  async googleAuthRedirect(): Promise<object> {
    return {
      message: 'Google OAuth2 Callback',
      description:
        'Google redirects here after authentication with an authorization code',
      nextStep: 'Exchange the code for an access token and issue a signed JWT',
    };
  }

  // GET /auth/rbac-info RBAC matrix
  @get('/auth/rbac-info')
  @response(200, {description: 'RBAC permission matrix'})
  async rbacInfo(): Promise<object> {
    return {
      description: 'Role Based Access Control (RBAC) Matrix',
      roles: ROLE_PERMISSIONS,
      explanation: {
        admin: 'Full access -- can read, create, and delete books',
        editor: 'Can read and create books but cannot delete',
        viewer: 'Read-only access -- cannot create or delete books',
      },
      howItWorks: [
        '1. User logs in with email/password -- bcrypt verifies the hash',
        '2. Server issues a signed JWT (jsonwebtoken HS256) with role and permissions',
        '3. Client sends JWT in Authorization: Bearer <token> header',
        '4. @authenticate("bearer") calls BearerTokenVerifyProvider',
        '5. BearerTokenVerifyProvider calls jwt.verify() -- checks signature AND expiry',
        '6. @authorize({permissions: ["CREATE_BOOK"]}) checks the decoded permissions',
        '7. If permission missing, returns 403 Forbidden',
      ],
      package: 'loopback4-authorization',
    };
  }

  // GET /auth/security-info OWASP implementation summary
  // Requires a valid JWT; '*' lets any authenticated role read it
  @authenticate('bearer')
  @authorize({permissions: ['*']})
  @get('/auth/security-info')
  @response(200, {description: 'OWASP security measures implemented'})
  async securityInfo(): Promise<object> {
    return {
      owasp_top_10_mitigations: {
        A01_Broken_Access_Control:
          'RBAC via loopback4-authorization @authorize; /secure/books routes require a JWT and the matching permission',
        A02_Cryptographic_Failures:
          'JWT signed with HS256 via jsonwebtoken, bcrypt (rounds=12) for passwords, secret read from JWT_SECRET only',
        A03_Injection:
          'Request bodies validated against OpenAPI schemas; POST /secure/books also runs BookValidator and checks the author exists',
        A04_Insecure_Design:
          'Least-privilege roles: viewer (read), editor (read/create), admin (read/create/delete)',
        A05_Security_Misconfiguration:
          'No hardcoded secrets -- the app refuses to start without JWT_SECRET; CI reads secrets from GitHub Secrets',
        A06_Vulnerable_Components:
          'npm audit --audit-level=high runs in .github/workflows/security.yml (report only, does not fail the build)',
        A07_Authentication_Failures:
          'bcrypt password hashing, JWT expiry (1h), generic "Invalid credentials" message, dummy bcrypt compare for unknown emails',
        A08_Software_Integrity:
          'Husky pre-commit hook runs git-secrets to block committing credentials',
        A09_Logging_Failures:
          'LogInterceptor logs BookController calls, arguments and duration to the console',
      },
      authentication: {
        strategy: 'Bearer JWT via loopback4-authentication',
        token_type: 'JWT (JSON Web Token)',
        token_algorithm: 'HS256',
        token_expiry: '1 hour',
        password_hashing: 'bcrypt with 12 rounds',
        supported_providers: [
          'Local (email/password)',
          'Google OAuth2 (verifier bound; /auth/google routes are placeholders)',
        ],
        arc_packages: [
          'loopback4-authentication',
          'loopback4-authorization',
          'passport-google-oauth20',
        ],
      },
      authorization: {
        model: 'RBAC (Role-Based Access Control)',
        package: 'loopback4-authorization',
        roles: Object.keys(ROLE_PERMISSIONS),
        permissions: ROLE_PERMISSIONS,
      },
      git_security: {
        tool: 'git-secrets + Husky pre-commit hooks',
        prevents: 'Committing AWS keys, passwords, API tokens to git',
        setup:
          'brew install git-secrets && git secrets --register-aws (once per clone)',
        hook: '.husky/pre-commit runs git-secrets --pre_commit_hook',
      },
      github_secrets: {
        used_for: [
          'JWT_SECRET',
          'GOOGLE_AUTH_CLIENT_ID',
          'GOOGLE_AUTH_CLIENT_SECRET',
        ],
        how: 'Settings → Secrets and variables → Actions → New repository secret',
        in_workflow: '.github/workflows/security.yml',
        never_in_code: true,
      },
    };
  }
}
