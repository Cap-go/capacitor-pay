import { registerPlugin } from '@capacitor/core';

import type { PayPlugin } from './definitions';

const Pay = registerPlugin<PayPlugin>('Pay', {
  web: () => import('./web').then((m) => new m.PayWeb()),
});

export * from './definitions';
export { Pay };
