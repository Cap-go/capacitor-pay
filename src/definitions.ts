import type { PluginListenerHandle } from '@capacitor/core';

export type PayPlatform = 'ios' | 'android' | 'web';

export type ApplePayNetwork =
  | 'AmEx'
  | 'Bancomat'
  | 'Bancontact'
  | 'PagoBancomat'
  | 'CarteBancaire'
  | 'CarteBancaires'
  | 'CartesBancaires'
  | 'ChinaUnionPay'
  | 'Dankort'
  | 'Discover'
  | 'Eftpos'
  | 'Electron'
  | 'Elo'
  | 'girocard'
  | 'Himyan'
  | 'Interac'
  | 'iD'
  | 'Jaywan'
  | 'JCB'
  | 'mada'
  | 'Maestro'
  | 'MasterCard'
  | 'Meeza'
  | 'Mir'
  | 'MyDebit'
  | 'NAPAS'
  | 'BankAxept'
  | 'PostFinanceAG'
  | 'PrivateLabel'
  | 'QUICPay'
  | 'Suica'
  | 'Visa'
  | 'VPay';

export type ApplePayMerchantCapability = '3DS' | 'credit' | 'debit' | 'emv';

export type ApplePaySummaryItemType = 'final' | 'pending';

export type ApplePayContactField = 'emailAddress' | 'name' | 'phoneNumber' | 'postalAddress';

export type ApplePayShippingType = 'shipping' | 'delivery' | 'servicePickup' | 'storePickup';

export interface ApplePaySummaryItem {
  label: string;
  amount: string;
  type?: ApplePaySummaryItemType;
}

export interface ApplePayAvailabilityOptions {
  /**
   * Optional list of payment networks you intend to use.
   * Passing networks determines the return value of `canMakePaymentsUsingNetworks`.
   */
  supportedNetworks?: ApplePayNetwork[];
}

export interface ApplePayAvailabilityResult {
  /**
   * Indicates whether the device can make Apple Pay payments in general.
   */
  canMakePayments: boolean;
  /**
   * Indicates whether the device can make Apple Pay payments with the supplied networks.
   */
  canMakePaymentsUsingNetworks: boolean;
}

export interface ApplePayPaymentOptions {
  /**
   * Merchant identifier created in the Apple Developer portal.
   */
  merchantIdentifier: string;
  /**
   * Two-letter ISO 3166 country code.
   */
  countryCode: string;
  /**
   * Three-letter ISO 4217 currency code.
   */
  currencyCode: string;
  /**
   * Payment summary items displayed in the Apple Pay sheet.
   */
  paymentSummaryItems: ApplePaySummaryItem[];
  /**
   * Card networks to support.
   */
  supportedNetworks: ApplePayNetwork[];
  /**
   * Merchant payment capabilities. Defaults to ['3DS'] when omitted.
   */
  merchantCapabilities?: ApplePayMerchantCapability[];
  /**
   * Contact fields that must be supplied for shipping.
   */
  requiredShippingContactFields?: ApplePayContactField[];
  /**
   * Contact fields that must be supplied for billing.
   */
  requiredBillingContactFields?: ApplePayContactField[];
  /**
   * Controls the shipping flow presented to the user.
   */
  shippingType?: ApplePayShippingType;
  /**
   * Optional ISO 3166 country codes where the merchant is supported.
   */
  supportedCountries?: string[];
  /**
   * Optional opaque application data passed back in the payment token.
   */
  applicationData?: string;
}

export interface ApplePayContact {
  name?: {
    givenName?: string;
    familyName?: string;
    middleName?: string;
    namePrefix?: string;
    nameSuffix?: string;
    nickname?: string;
  };
  emailAddress?: string;
  phoneNumber?: string;
  postalAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isoCountryCode?: string;
    subAdministrativeArea?: string;
    subLocality?: string;
  };
}

export interface ApplePayPaymentResult {
  /**
   * Raw payment token encoded as base64 string.
   */
  paymentData: string;
  /**
   * Raw payment token JSON string, useful for debugging.
   */
  paymentString: string;
  /**
   * Payment transaction identifier.
   */
  transactionIdentifier: string;
  paymentMethod: {
    displayName?: string;
    network?: ApplePayNetwork;
    type: 'debit' | 'credit' | 'prepaid' | 'store';
  };
  shippingContact?: ApplePayContact;
  billingContact?: ApplePayContact;
}

export type GooglePayEnvironment = 'test' | 'production';

export interface GooglePayAvailabilityOptions {
  /**
   * Environment used to construct the Google Payments client. Defaults to `'test'`.
   */
  environment?: GooglePayEnvironment;
  /**
   * Raw `IsReadyToPayRequest` JSON as defined by the Google Pay API.
   * Supply the card networks and auth methods you intend to support at runtime.
   *
   * @see https://developers.google.com/pay/api/android/reference/request-objects#IsReadyToPayRequest
   */
  isReadyToPayRequest: google.payments.api.IsReadyToPayRequest;
}

export interface GooglePayAvailabilityResult {
  /**
   * Whether the user is able to provide payment information through the Google Pay payment sheet.
   */
  isReady: google.payments.api.IsReadyToPayResponse['result'];
  /**
   * The current user's ability to pay with one or more of the payment methods specified in `IsReadyToPayRequest.allowedPaymentMethods`.
   *
   * This property only exists if `IsReadyToPayRequest.existingPaymentMethodRequired` was set to `true`. The property value will always be `true` if the request is configured for a test environment.
   */
  paymentMethodPresent: google.payments.api.IsReadyToPayResponse['paymentMethodPresent'];
}

export interface GooglePayPaymentOptions {
  /**
   * Environment used to construct the Google Payments client. Defaults to `'test'`.
   */
  environment?: GooglePayEnvironment;
  /**
   * Raw `PaymentDataRequest` JSON as defined by the Google Pay API.
   * Provide transaction details, merchant info, and tokenization parameters.
   *
   * @see https://developers.google.com/pay/api/android/reference/request-objects#PaymentDataRequest
   */
  paymentDataRequest: google.payments.api.PaymentDataRequest;
}

export interface GooglePayPaymentResult {
  /**
   * Payment data returned by Google Pay.
   *
   * @see https://developers.google.com/pay/api/android/reference/response-objects#PaymentData
   */
  paymentData: google.payments.api.PaymentData;
}

export interface PayAvailabilityOptions {
  apple?: ApplePayAvailabilityOptions;
  google?: GooglePayAvailabilityOptions;
}

export interface PayAvailabilityResult {
  available: boolean;
  platform: PayPlatform;
  apple?: ApplePayAvailabilityResult;
  google?: GooglePayAvailabilityResult;
}

export interface PayPaymentOptions {
  apple?: ApplePayPaymentOptions;
  google?: GooglePayPaymentOptions;
}

export interface PayPaymentResult {
  platform: Exclude<PayPlatform, 'web'>;
  apple?: ApplePayPaymentResult;
  google?: void;
}

export interface PayPlugin {
  /**
   * Checks whether native pay is available on the current platform.
   * On iOS this evaluates Apple Pay, on Android it evaluates Google Pay.
   */
  isPayAvailable(options?: PayAvailabilityOptions): Promise<PayAvailabilityResult>;
  /**
   * Presents the native pay sheet for the current platform.
   * Provide the Apple Pay configuration on iOS and the Google Pay configuration on Android.
   */
  requestPayment(options: PayPaymentOptions): Promise<PayPaymentResult>;

  /**
   * Get the native Capacitor plugin version
   *
   * @returns {Promise<{ id: string }>} an Promise with version for this device
   * @throws An error if the something went wrong
   */
  getPluginVersion(): Promise<{ version: string }>;

  /**
   * Add event listener for Google Pay authorized payments.
   *
   * Works only on Google Pay.
   */
  addListener(
    eventName: 'onAuthorized',
    listenerFunc: (result: { platform: PayPaymentResult['platform']; google: GooglePayPaymentResult }) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Add event listener for Google Pay canceled payments.
   *
   * Works only on Google Pay.
   */
  addListener(
    eventName: 'onCanceled',
    listenerFunc: (result: { platform: PayPaymentResult['platform']; message: string; statusCode: 'CANCELED' }) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Add event listener for Google Pay errors.
   *
   * Works only on Google Pay.
   */
  addListener(
    eventName: 'onError',
    listenerFunc: (error: { platform: PayPaymentResult['platform']; message: string; statusCode: 'ERROR' }) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Remove all the listeners that are attached to this plugin.
   */
  removeAllListeners(): Promise<void>;
}
