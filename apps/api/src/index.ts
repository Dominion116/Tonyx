import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './env.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`Tonyx API listening on http://localhost:${env.port}`);
  console.log(`Swagger UI: http://localhost:${env.port}/api/docs`);
});
