import {MethodDecoratorFactory} from '@loopback/core';

export const LOG_METHOD_KEY = 'decorators.logMethod';

export interface LogMethodOptions {
  level: 'info' | 'debug' | 'warn';
}

export function logMethod(options: LogMethodOptions = {level: 'info'}) {
  return MethodDecoratorFactory.createDecorator<LogMethodOptions>(
    LOG_METHOD_KEY,
    options,
  );
}
