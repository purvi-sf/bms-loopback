import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import {AuthenticationComponent, Strategies} from 'loopback4-authentication';
import {
  AuthorizationBindings,
  AuthorizationComponent,
} from 'loopback4-authorization';
import path from 'path';
import {BmsComponent} from './components/bms.component';
import {BearerTokenVerifyProvider} from './providers/bearer-token-verify.provider';
import {GoogleOauth2VerifyProvider} from './providers/google-oauth.provider';
import {MySequence} from './sequence';

export {ApplicationConfig};

export class BmsLoopbackApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    this.sequence(MySequence);

    this.static('/', path.join(__dirname, '../public'));

    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    // custom BMS Component
    this.component(BmsComponent);

    this.component(AuthenticationComponent);
    this.bind(Strategies.Passport.GOOGLE_OAUTH2_VERIFIER).toProvider(
      GoogleOauth2VerifyProvider,
    );

    // This is what actually validates JWT tokens on @authenticate('bearer') routes
    this.bind(Strategies.Passport.BEARER_TOKEN_VERIFIER).toProvider(
      BearerTokenVerifyProvider,
    );

    // ARC Authorization RBAC
    // allowAlwaysPaths are prefix matches: '/books' also covers '/books/{id}'
    // and '/books/count'. '/auth/security-info' is not listed: it needs a JWT.
    this.bind(AuthorizationBindings.CONFIG).to({
      allowAlwaysPaths: [
        '/books',
        '/authors',
        '/ping',
        '/explorer',
        '/openapi.json',
        '/auth/login',
        '/auth/google',
        '/auth/google-auth-redirect',
        '/auth/rbac-info',
      ],
    });
    this.component(AuthorizationComponent);

    this.projectRoot = __dirname;

    this.bootOptions = {
      controllers: {
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }
}
