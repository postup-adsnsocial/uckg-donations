import type { ExecutionContext } from '@nestjs/common';

export function createExecutionContext(request: object): ExecutionContext {
  return {
    getClass: () => class TestController {},
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getNext: () => undefined,
      getRequest: () => request,
      getResponse: () => undefined,
    }),
  } as unknown as ExecutionContext;
}
