import {Provider} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import * as jwt from 'jsonwebtoken';
import {VerifyFunction} from 'loopback4-authentication';

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

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

// BearerTokenVerifyProvider verifies JWT on every @authenticate('bearer') request
// This is what actually enforces authentication on protected routes
export class BearerTokenVerifyProvider implements Provider<VerifyFunction.BearerFn> {
  value(): VerifyFunction.BearerFn {
    return async (token: string) => {
      try {
        // OWASP A02: jwt.verify() checks BOTH the signature AND expiry
        // If anyone tampers with the payload, the signature check fails
        // If the token expired, it throws a TokenExpiredError
        const decoded = jwt.verify(token, getJwtSecret()) as {
          userId: number;
          email: string;
          role: string;
          permissions: string[];
          iat: number;
          exp: number;
        };

        // Returns the authenticated user. This gets stored in the request context and used by @authorize
        const authUser: AuthUser = {
          id: String(decoded.userId),
          username: decoded.email,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions ?? [],
        };

        return authUser;
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          throw new HttpErrors.Unauthorized(
            'Token has expired -- please login again',
          );
        }
        if (err instanceof jwt.JsonWebTokenError) {
          throw new HttpErrors.Unauthorized(
            'Invalid token -- signature verification failed',
          );
        }
        throw new HttpErrors.Unauthorized('Authentication failed');
      }
    };
  }
}
