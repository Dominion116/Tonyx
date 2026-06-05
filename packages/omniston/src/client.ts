import { AutoReconnectTransport, Omniston, WebSocketTransport } from '@ston-fi/omniston-sdk';

const OMNISTON_API_URL = 'wss://api.ston.fi/omniston';

let instance: Omniston | null = null;

export function getClient(): Omniston {
  if (!instance) {
    const wsTransport = new WebSocketTransport(OMNISTON_API_URL);
    instance = new Omniston({
      apiUrl: OMNISTON_API_URL,
      transport: new AutoReconnectTransport({ transport: wsTransport }),
    });
  }
  return instance;
}

export function resetClient(): void {
  instance = null;
}
