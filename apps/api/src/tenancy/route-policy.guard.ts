import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  routePolicies,
  routePolicyMetadataKeys,
} from './route-policy.decorator.js';

export { routePolicyMetadataKeys } from './route-policy.decorator.js';

@Injectable()
export class RoutePolicyGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const classifications = routePolicies.filter((policy) =>
      this.reflector.getAllAndOverride<boolean>(
        routePolicyMetadataKeys[policy],
        [context.getHandler(), context.getClass()],
      ),
    );

    if (classifications.length !== 1) {
      throw new ForbiddenException(
        'The route policy classification is missing or ambiguous.',
      );
    }

    return true;
  }
}
