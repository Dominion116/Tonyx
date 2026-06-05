import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './db/index.js';
import { env } from './env.js';

const app = createApp();

connectDb()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`Tonyx API listening on http://localhost:${env.port}`);
      console.log(`Swagger UI: http://localhost:${env.port}/api/docs`);
    });
  })
  .catch((err) => {
    console.error('[startup] Fatal error:', err);
    process.exit(1);
  });
