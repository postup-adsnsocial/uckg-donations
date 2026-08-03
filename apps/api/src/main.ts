import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { ApiConfigService } from './config/api-config.service.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bodyParser: false,
});
const config = app.get(ApiConfigService).values;

app.set('trust proxy', config.trustProxy);
app.use(helmet());
app.use(json({ limit: config.bodyLimit }));
app.use(urlencoded({ extended: true, limit: config.bodyLimit }));

app.enableCors({
  credentials: true,
  origin: [...config.webOrigins],
});

app.enableShutdownHooks();

await app.listen(config.apiPort, '0.0.0.0');
