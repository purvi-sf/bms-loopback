import {DemoLogger} from '../shared/bms-types';

export interface DatabaseConfig {
  name: string;
  connector: string;
  database: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  connectionCount: number;
  config: DatabaseConfig;
  connectedAt?: string;
  instanceCreatedAt: string;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  name: 'db',
  connector: 'memory',
  database: 'bms',
};

// Singleton -- ensures one shared DB connection across all BMS repositories
export class DatabaseConnectionSingleton {
  private static instance: DatabaseConnectionSingleton | undefined;

  private connected = false;
  private connections = 0;
  private connectedAt?: Date;
  private readonly createdAt = new Date();

  private constructor(private readonly config: DatabaseConfig) {}

  static getInstance(
    config: DatabaseConfig = DEFAULT_CONFIG,
  ): DatabaseConnectionSingleton {
    if (!DatabaseConnectionSingleton.instance) {
      DatabaseConnectionSingleton.instance = new DatabaseConnectionSingleton({
        ...config,
      });
    }
    return DatabaseConnectionSingleton.instance;
  }

  static resetInstance(): void {
    DatabaseConnectionSingleton.instance = undefined;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get connectionCount(): number {
    return this.connections;
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;
    this.connections++;
    this.connectedAt = new Date();
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.connectedAt = undefined;
  }

  getStatus(): ConnectionStatus {
    return {
      isConnected: this.connected,
      connectionCount: this.connections,
      config: {...this.config},
      connectedAt: this.connectedAt?.toISOString(),
      instanceCreatedAt: this.createdAt.toISOString(),
    };
  }
}

export function getDbConnection(
  config?: DatabaseConfig,
): DatabaseConnectionSingleton {
  return DatabaseConnectionSingleton.getInstance(config);
}

export function demoSingleton(log: DemoLogger = console.log): void {
  DatabaseConnectionSingleton.resetInstance();

  const fromBookRepo = DatabaseConnectionSingleton.getInstance();
  const fromAuthorRepo = DatabaseConnectionSingleton.getInstance();
  log(`getInstance() twice -> same object: ${fromBookRepo === fromAuthorRepo}`);

  fromBookRepo.connect();
  log(
    `Connected via book repo; author repo sees isConnected=${fromAuthorRepo.isConnected}`,
  );

  fromAuthorRepo.connect();
  log(`connect() again -> connectionCount=${fromBookRepo.connectionCount}`);

  fromAuthorRepo.disconnect();
  fromBookRepo.connect();
  log(
    `After disconnect + reconnect: ${JSON.stringify(getDbConnection().getStatus())}`,
  );
}
