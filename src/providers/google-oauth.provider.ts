import {Provider} from '@loopback/core';
import {IAuthUser, VerifyFunction} from 'loopback4-authentication';

// Runs after Google redirects back to app with the user's profile
// Receives the Google profile and returns the user to store in the session
export class GoogleOauth2VerifyProvider
  implements Provider<VerifyFunction.GoogleAuthFn> {
  value(): VerifyFunction.GoogleAuthFn {
    return async (
      accessToken: string,
      refreshToken: string,
      profile: object & {id: string; emails?: {value: string}[]},
    ) => {
      // In production: look up or create user in database by Google profile ID
      // This is where we call your UserRepository
      const user: IAuthUser = {
        id: profile.id,
        username: profile.emails?.[0]?.value ?? profile.id,
      };
      return user;
    };
  }
}
