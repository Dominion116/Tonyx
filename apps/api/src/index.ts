import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './db/index.js';
import { startPoolScanner } from './cron/poolScanner.js';
import { startNotificationScanner } from './cron/notificationScanner.js';
import { registerBotCommands } from './telegram/bot.js';
import { env } from './env.js';

const app = createApp();

connectDb()
  .then(() => {
    startPoolScanner();
    startNotificationScanner();
    void registerBotCommands();
    app.listen(env.port, () => {
      console.log(`Tonyx API listening on http://localhost:${env.port}`);
      console.log(`Swagger UI: http://localhost:${env.port}/api/docs`);
    });
  })
  .catch((err) => {
    console.error('[startup] Fatal error:', err);
    process.exit(1);
  });
