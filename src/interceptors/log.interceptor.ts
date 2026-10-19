import {
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {BOOK_EVENTS, bookEventEmitter} from '../patterns/behavioral/observer';

@injectable({tags: {key: LogInterceptor.BINDING_KEY}})
export class LogInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${LogInterceptor.name}`;

  value(): Interceptor {
    return async (
      invocationCtx: InvocationContext,
      next: () => ValueOrPromise<InvocationResult>,
    ) => {
      const startTime = Date.now();
      console.log(`[LOG] --> ${invocationCtx.targetName} called`);
      console.log(`[LOG] --> Args: ${JSON.stringify(invocationCtx.args)}`);

      const result = await next();

      const bookId = (result as {id?: unknown} | undefined)?.id;
      if (invocationCtx.methodName.includes('create') && typeof bookId === 'number') {
        bookEventEmitter.notify(BOOK_EVENTS.BOOK_CREATED, {
          bookId,
          method: invocationCtx.targetName,
        });
      }

      const duration = Date.now() - startTime;
      console.log(`[LOG] <-- ${invocationCtx.targetName} completed in ${duration}ms`);

      return result;
    };
  }
}
