import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import {
  DiscoveryService,
  MetadataScanner,
  NestFactory,
} from '@nestjs/core';
import type { INestApplicationContext, Type } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module.js';
import { requiredPermissionsKey } from './permissions.decorator.js';
import { churchPermissions } from './permissions.guard.js';
import {
  routePolicies,
  routePolicyMetadataKeys,
} from './route-policy.decorator.js';

interface InventoriedRoute {
  controller: Type<unknown>;
  handler: (...args: never[]) => unknown;
  label: string;
}

describe('route policy inventory', () => {
  let application: INestApplicationContext;
  let routes: InventoriedRoute[];

  beforeAll(async () => {
    application = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
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
                controller,
                handler: handler as (...args: never[]) => unknown,
                label: `${controller.name}.${methodName}`,
              },
            ];
          });
      });
  });

  afterAll(async () => {
    await application.close();
  });

  it('discovers every registered HTTP handler', () => {
    expect(routes.map(({ label }) => label).sort()).toEqual([
      'AuthController.login',
      'AuthController.logout',
      'AuthController.me',
      'ChurchesController.current',
      'ChurchesController.settings',
      'HealthController.getHealth',
      'MembersController.create',
      'MembersController.list',
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
        Reflect.getMetadata(
          routePolicyMetadataKeys.domain,
          route.handler,
        ) ??
        Reflect.getMetadata(
          routePolicyMetadataKeys.domain,
          route.controller,
        );

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
