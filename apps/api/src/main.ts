import { createApplication } from './application.js';
import { ApiConfigService } from './config/api-config.service.js';

const app = await createApplication();
const config = app.get(ApiConfigService).values;

await app.listen(process.env.PORT ?? config.apiPort, '0.0.0.0');
