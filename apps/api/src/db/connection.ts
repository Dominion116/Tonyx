import mongoose from 'mongoose';
import { env } from '../env.js';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1_000;

export async function connectDb(attempt = 1): Promise<void> {
  if (!env.mongoUri) {
    console.warn('[db] MONGODB_URI not set — skipping connection (dev mode)');
    return;
  }

  try {
    await mongoose.connect(env.mongoUri, { dbName: env.mongoDbName });
    console.log(`[db] Connected to MongoDB (${env.mongoDbName})`);
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      console.error(`[db] Failed to connect after ${MAX_RETRIES} attempts:`, err);
      throw err;
    }

    const delay = INITIAL_DELAY_MS * 2 ** (attempt - 1);
    console.warn(`[db] Connection attempt ${attempt} failed. Retrying in ${delay}ms…`);
    await new Promise((r) => setTimeout(r, delay));
    return connectDb(attempt + 1);
  }
}
