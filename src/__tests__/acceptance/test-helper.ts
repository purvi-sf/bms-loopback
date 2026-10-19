import {BmsLoopbackApplication} from '../..';
import {
  createRestAppClient,
  givenHttpServerConfig,
  Client,
} from '@loopback/testlab';

export async function setupApplication(): Promise<AppWithClient> {
  const restConfig = givenHttpServerConfig({
    // Customize the server configuration here.
    // Empty values (undefined, '') will be ignored by the helper.
    //
    // host: process.env.HOST,
    // port: +process.env.PORT,
  });

  const app = new BmsLoopbackApplication({
    rest: restConfig,
  });

  // Use a fresh in-memory datasource so tests never read or write data/db.json
  app.bind('datasources.config.db').to({name: 'db', connector: 'memory'});

  await app.boot();
  await app.start();

  const client = createRestAppClient(app);

  return {app, client};
}

export interface AppWithClient {
  app: BmsLoopbackApplication;
  client: Client;
}
