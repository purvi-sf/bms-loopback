import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {BmsComponent} from './components/bms.component';
import {BmsFacade} from './patterns/structural/facade';
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

    // Register our custom BMS Component
    this.component(BmsComponent);

    // BmsFacade pattern: see src/patterns/structural/facade.ts for unified BMS interface
    this.bind('services.BmsFacade').toClass(BmsFacade);
    console.log('[BmsFacade] Facade pattern available -- use BmsFacade for unified BMS operations');

    this.projectRoot = __dirname;

    // This is the critical part -- must use .js extension
    this.bootOptions = {
      controllers: {
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }
}
