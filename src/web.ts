import { WebPlugin } from '@capacitor/core';

import type { PayPlugin } from './definitions';

export class PayWeb extends WebPlugin implements PayPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
