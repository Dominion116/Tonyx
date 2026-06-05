import { MiraClient } from '@tonyx/mira';
import { env } from '../env.js';

export const miraClient = new MiraClient({
  apiKey: env.miraApiKey,
});
