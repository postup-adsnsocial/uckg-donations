import { createApplication } from './application.js';

const application = await createApplication();
await application.init();

export default application.getHttpAdapter().getInstance();
