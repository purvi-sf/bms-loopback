import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';
import {DatabaseConnectionSingleton} from '../patterns/creational/singleton';

const config = {
  name: 'db',
  connector: 'memory',
  localStorage: '',
  file: './data/db.json'
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
// Singleton -- DatabaseConnectionSingleton tracks the one shared connection this datasource uses
@lifeCycleObserver('datasource')
export class DbDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'db';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.db', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
    console.log(
      'DbDataSource using singleton pattern: ' +
        DatabaseConnectionSingleton.getInstance().getStatus().instanceId,
    );
  }
}
