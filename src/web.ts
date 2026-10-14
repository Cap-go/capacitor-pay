import { WebPlugin } from '@capacitor/core';

import type {
  ApplePayShippingUpdate,
  PayAvailabilityOptions,
  PayAvailabilityResult,
  PayPaymentOptions,
  PayPaymentResult,
  PayPlugin,
} from './definitions';

export class PayWeb extends WebPlugin implements PayPlugin {
  async isPayAvailable(_options?: PayAvailabilityOptions): Promise<PayAvailabilityResult> {
    return {
      available: false,
      platform: 'web',
      apple: {
        canMakePayments: false,
        canMakePaymentsUsingNetworks: false,
      },
      google: {
        isReady: false,
        paymentMethodPresent: undefined,
      },
    };
  }

  async requestPayment(_options: PayPaymentOptions): Promise<PayPaymentResult> {
    throw this.unimplemented('Native payments are not implemented on the web. Use a native platform.');
  }

  async updateApplePayShipping(_options: ApplePayShippingUpdate): Promise<void> {
    throw this.unimplemented('Apple Pay shipping updates are only available on iOS.');
  }

  async getPluginVersion(): Promise<{ version: string }> {
    return { version: 'web' };
  }
}
