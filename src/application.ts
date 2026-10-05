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

    // This is what actually validates JWT tokens on @authenticate('bearer') routes
    this.bind(Strategies.Passport.BEARER_TOKEN_VERIFIER).toProvider(
      BearerTokenVerifyProvider,
    );

    // ARC Authorization RBAC
    this.bind(AuthorizationBindings.CONFIG).to({
      allowAlwaysPaths: [
        '/explorer',
        '/openapi.json',
        '/ping',
        '/auth/login',
        '/auth/google',
        '/auth/google-auth-redirect',
        '/auth/rbac-info',
        '/auth/security-info',
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
