export type PayPlatform = 'ios' | 'android' | 'web';

export type ApplePayNetwork =
  | 'AmEx'
  | 'amex'
  | 'Bancomat'
  | 'Bancontact'
  | 'PagoBancomat'
  | 'CarteBancaire'
  | 'CarteBancaires'
  | 'CartesBancaires'
  | 'ChinaUnionPay'
  | 'Dankort'
  | 'Discover'
  | 'discover'
  | 'Eftpos'
  | 'Electron'
  | 'Elo'
  | 'girocard'
  | 'Himyan'
  | 'Interac'
  | 'iD'
  | 'Jaywan'
  | 'JCB'
  | 'jcb'
  | 'mada'
  | 'Maestro'
  | 'maestro'
  | 'MasterCard'
  | 'masterCard'
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
  | 'visa'
  | 'VPay'
  | 'vPay';

export type ApplePayMerchantCapability = '3DS' | 'credit' | 'debit' | 'emv';

export type ApplePaySummaryItemType = 'final' | 'pending';

export type ApplePayContactField = 'emailAddress' | 'name' | 'phoneNumber' | 'postalAddress';

export type ApplePayShippingType = 'shipping' | 'delivery' | 'servicePickup' | 'storePickup';

export interface ApplePaySummaryItem {
  label: string;
  amount: string;
  type?: ApplePaySummaryItemType;
}

export type ApplePayRecurringPaymentIntervalUnit = 'day' | 'week' | 'month' | 'year';

export interface ApplePayRecurringPaymentSummaryItem extends ApplePaySummaryItem {
  /**
   * Unit of time between recurring payments.
   */
  intervalUnit: ApplePayRecurringPaymentIntervalUnit;
  /**
   * Number of `intervalUnit` units between recurring payments (for example `1` month, `2` weeks).
   */
  intervalCount: number;
  /**
   * Start date of the recurring period.
   *
   * On supported platforms this may be either:
   * - a `number` representing milliseconds since Unix epoch, or
   * - a `string` in a date format accepted by the native implementation
   *   (for example an ISO 8601 date-time string or a `yyyy-MM-dd` date string).
   */
  startDate?: number | string;
  /**
   * End date of the recurring period.
   *
   * On supported platforms this may be either:
   * - a `number` representing milliseconds since Unix epoch, or
   * - a `string` in a date format accepted by the native implementation
   *   (for example an ISO 8601 date-time string or a `yyyy-MM-dd` date string).
   */
  endDate?: number | string;
}

export interface ApplePayRecurringPaymentRequest {
  /**
   * A description for the recurring payment shown in the Apple Pay sheet.
   */
  paymentDescription: string;
  /**
   * The recurring billing item (for example your subscription).
   */
  regularBilling: ApplePayRecurringPaymentSummaryItem;
  /**
   * URL where the user can manage the recurring payment (cancel, update, etc).
   */
  managementURL: string;
  /**
   * Optional billing agreement text shown to the user.
   */
  billingAgreement?: string;
  /**
   * Optional URL where Apple can send token update notifications.
   */
  tokenNotificationURL?: string;
  /**
   * Optional trial billing item (for example a free trial period).
   */
  trialBilling?: ApplePayRecurringPaymentSummaryItem;
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

  /**
   * Recurring payment configuration (iOS 16+).
   */
  recurringPaymentRequest?: ApplePayRecurringPaymentRequest;
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

export type GooglePayCardNetwork =
  | 'AMEX'
  | 'DISCOVER'
  | 'JCB'
  | 'MASTERCARD'
  | 'VISA'
  // Keep this open-ended so users can pass new/region-specific networks without waiting for a release.
  | (string & Record<never, never>);

export type GooglePayAuthMethod =
  | 'PAN_ONLY'
  | 'CRYPTOGRAM_3DS'
  // Keep this open-ended for forward compatibility.
  | (string & Record<never, never>);

export type GooglePayTotalPriceStatus = 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL' | (string & Record<never, never>);

export interface GooglePayBillingAddressParameters {
  format?: 'MIN' | 'FULL' | (string & Record<never, never>);
  phoneNumberRequired?: boolean;
}

export interface GooglePayCardPaymentMethodParameters {
  allowedAuthMethods?: GooglePayAuthMethod[];
  allowedCardNetworks?: GooglePayCardNetwork[];
  billingAddressRequired?: boolean;
  billingAddressParameters?: GooglePayBillingAddressParameters;
}

export interface GooglePayTokenizationSpecification {
  type?: 'PAYMENT_GATEWAY' | 'DIRECT' | (string & Record<never, never>);
  parameters?: Record<string, string>;
}

export interface GooglePayAllowedPaymentMethod {
  type?: 'CARD' | (string & Record<never, never>);
  parameters?: GooglePayCardPaymentMethodParameters;
  tokenizationSpecification?: GooglePayTokenizationSpecification;
}

export interface GooglePayMerchantInfo {
  merchantId?: string;
  merchantName?: string;
}

export interface GooglePayTransactionInfo {
  totalPriceStatus?: GooglePayTotalPriceStatus;
  totalPrice?: string;
  currencyCode?: string;
  countryCode?: string;
}

/**
 * Typed helper for the Google Pay `IsReadyToPayRequest` JSON.
 * The native Android implementation still accepts arbitrary JSON (forward compatible).
 */
export interface GooglePayIsReadyToPayRequest {
  /**
   * The list of payment methods you want to check for readiness.
   */
  allowedPaymentMethods?: GooglePayAllowedPaymentMethod[];
  /**
   * Forward-compatible escape hatch for additional fields supported by Google Pay.
   */
  [key: string]: unknown;
}

/**
 * Typed helper for the Google Pay `PaymentDataRequest` JSON.
 * The native Android implementation still accepts arbitrary JSON (forward compatible).
 */
export interface GooglePayPaymentDataRequest {
  /**
   * Google Pay API version, typically `2`.
   */
  apiVersion?: number;
  /**
   * Google Pay API minor version, typically `0`.
   */
  apiVersionMinor?: number;
  /**
   * Allowed payment method configurations.
   */
  allowedPaymentMethods?: GooglePayAllowedPaymentMethod[];
  /**
   * Merchant information displayed in the Google Pay sheet.
   */
  merchantInfo?: GooglePayMerchantInfo;
  /**
   * Transaction details (amount, currency, etc).
   */
  transactionInfo?: GooglePayTransactionInfo;
  /**
   * Forward-compatible escape hatch for additional fields supported by Google Pay.
   */
  [key: string]: unknown;
}

export interface GooglePayAvailabilityOptions {
  /**
   * Environment used to construct the Google Payments client. Defaults to `'test'`.
   */
  environment?: GooglePayEnvironment;
  /**
   * Raw `IsReadyToPayRequest` JSON as defined by the Google Pay API.
   * Supply the card networks and auth methods you intend to support at runtime.
   */
  isReadyToPayRequest?: GooglePayIsReadyToPayRequest;
}

export interface GooglePayAvailabilityResult {
  /**
   * Indicates whether the Google Pay API is available for the supplied parameters.
   */
  isReady: boolean;
}

export interface GooglePayPaymentOptions {
  /**
   * Environment used to construct the Google Payments client. Defaults to `'test'`.
   */
  environment?: GooglePayEnvironment;
  /**
   * Raw `PaymentDataRequest` JSON as defined by the Google Pay API.
   * Provide transaction details, merchant info, and tokenization parameters.
   */
  paymentDataRequest: GooglePayPaymentDataRequest;
}

export interface GooglePayPaymentResult {
  /**
   * Payment data returned by Google Pay.
   */
  paymentData: Record<string, unknown>;
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
  google?: GooglePayPaymentResult;
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
}
