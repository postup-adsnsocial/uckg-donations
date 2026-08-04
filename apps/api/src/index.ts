import express, { type Express } from 'express';

import { createApplication } from './application.js';

const server: Express = express();
const application = await createApplication();
await application.init();
server.use(application.getHttpAdapter().getInstance());

export default server;
