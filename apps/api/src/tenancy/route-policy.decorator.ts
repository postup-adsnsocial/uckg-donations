import { SetMetadata } from '@nestjs/common';

export const routePolicies = [
  'public',
  'identity',
  'internal',
  'domain',
] as const;

export type RoutePolicy = (typeof routePolicies)[number];

export const routePolicyMetadataKeys: Record<RoutePolicy, string> = {
  domain: 'route-policy:domain',
  identity: 'route-policy:identity',
  internal: 'route-policy:internal',
  public: 'route-policy:public',
};

function classifyRoute(policy: RoutePolicy) {
  return SetMetadata(routePolicyMetadataKeys[policy], true);
}

export const PublicRoute = () => classifyRoute('public');
export const IdentityRoute = () => classifyRoute('identity');
export const InternalRoute = () => classifyRoute('internal');
export const DomainRoutePolicy = () => classifyRoute('domain');
