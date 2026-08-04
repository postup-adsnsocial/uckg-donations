import {
  Module,
  type INestApplicationContext,
  type Type,
} from '@nestjs/common';
import {
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
  NestFactory,
} from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module.js';
import { AuthService } from '../auth/auth.service.js';
import { ChurchesService } from '../churches/churches.service.js';
import { MembersService } from '../members/members.service.js';
import { DonationsService } from '../donations/donations.service.js';
import { ReportsService } from '../reports/reports.service.js';
import { requiredPermissionsKey } from './permissions.decorator.js';
import { churchPermissions } from './permissions.guard.js';
import {
  routePolicies,
  routePolicyMetadataKeys,
} from './route-policy.decorator.js';
import { TenantService } from './tenant.service.js';

interface InventoriedRoute {
  controller: Type<unknown>;
  handler: (...args: never[]) => unknown;
  label: string;
}

function collectControllers(
  rootModule: Type<unknown>,
  visited = new Set<Type<unknown>>(),
): Type<unknown>[] {
  if (visited.has(rootModule)) {
    return [];
  }

  visited.add(rootModule);
  const controllers =
    (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, rootModule) as
      | Type<unknown>[]
      | undefined) ?? [];
  const imports =
    (Reflect.getMetadata(MODULE_METADATA.IMPORTS, rootModule) as
      | Type<unknown>[]
      | undefined) ?? [];

  return [
    ...controllers,
    ...imports.flatMap((importedModule) =>
      collectControllers(importedModule, visited),
    ),
  ];
}

const registeredControllers = collectControllers(AppModule);

@Module({
  controllers: registeredControllers,
  imports: [DiscoveryModule],
  providers: [
    { provide: AuthService, useValue: {} },
    { provide: ChurchesService, useValue: {} },
    { provide: MembersService, useValue: {} },
    { provide: DonationsService, useValue: {} },
    { provide: ReportsService, useValue: {} },
    { provide: TenantService, useValue: {} },
  ],
})
class RouteInventoryModule {}

describe('route policy inventory', () => {
  let application: INestApplicationContext;
  let routes: InventoriedRoute[];

  beforeAll(async () => {
    application = await NestFactory.createApplicationContext(
      RouteInventoryModule,
      {
        abortOnError: false,
        logger: false,
      },
    );
    const discovery = application.get(DiscoveryService);
    const scanner = new MetadataScanner();

    routes = discovery
      .getControllers()
      .flatMap((wrapper): InventoriedRoute[] => {
        const controller = wrapper.metatype;
        const instance = wrapper.instance as object | null;

        if (
          !controller ||
          !instance ||
          Reflect.getMetadata(PATH_METADATA, controller) === undefined
        ) {
          return [];
        }

        const prototype = Object.getPrototypeOf(instance) as object;

        return scanner
          .getAllMethodNames(prototype)
          .flatMap((methodName): InventoriedRoute[] => {
            const handler = prototype[
              methodName as keyof typeof prototype
            ] as unknown;

            if (
              typeof handler !== 'function' ||
              Reflect.getMetadata(METHOD_METADATA, handler) === undefined
            ) {
              return [];
            }

            return [
              {
                controller: controller as Type<unknown>,
                handler: handler as (...args: never[]) => unknown,
                label: `${controller.name}.${methodName}`,
              },
            ];
          });
      });
  });

  afterAll(async () => {
    await application?.close();
  });

  it('discovers every registered HTTP handler', () => {
    expect(routes.map(({ label }) => label).sort()).toEqual([
      'AuthController.login',
      'AuthController.logout',
      'AuthController.me',
      'ChurchesController.create',
      'ChurchesController.current',
      'ChurchesController.list',
      'ChurchesController.settings',
      'DonationsController.attachEnvelope',
      'DonationsController.create',
      'DonationsController.get',
      'DonationsController.getEnvelope',
      'DonationsController.list',
      'HealthController.getHealth',
      'MembersController.create',
      'MembersController.delete',
      'MembersController.get',
      'MembersController.list',
      'MembersController.update',
      'ReportsController.get',
      'ReportsController.list',
      'ReportsController.pdf',
    ]);
  });

  it('requires exactly one route classification per handler', () => {
    for (const route of routes) {
      const classifications = routePolicies.filter(
        (policy) =>
          Reflect.getMetadata(routePolicyMetadataKeys[policy], route.handler) ??
          Reflect.getMetadata(
            routePolicyMetadataKeys[policy],
            route.controller,
          ),
      );

      expect(classifications, route.label).toHaveLength(1);
    }
  });

  it('requires known, non-empty permissions for every domain handler', () => {
    for (const route of routes) {
      const isDomain =
        Reflect.getMetadata(routePolicyMetadataKeys.domain, route.handler) ??
        Reflect.getMetadata(routePolicyMetadataKeys.domain, route.controller);

      if (!isDomain) {
        continue;
      }

      const permissions =
        Reflect.getMetadata(requiredPermissionsKey, route.handler) ??
        Reflect.getMetadata(requiredPermissionsKey, route.controller);

      expect(permissions, route.label).toBeInstanceOf(Array);
      expect(permissions, route.label).not.toHaveLength(0);
      expect(
        permissions.every((permission: unknown) =>
          churchPermissions.has(permission as never),
        ),
        route.label,
      ).toBe(true);
    }
  });
});
