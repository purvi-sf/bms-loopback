import {
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';

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

      const duration = Date.now() - startTime;
      console.log(`[LOG] <-- ${invocationCtx.targetName} completed in ${duration}ms`);

      return result;
    };
  }
}
