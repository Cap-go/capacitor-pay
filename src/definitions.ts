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
  | 'ELECTRON'
  | 'ELO'
  | 'ELO_DEBIT'
  | 'INTERAC'
  | 'JCB'
  | 'MAESTRO'
  | 'MASTERCARD'
  | 'VISA'
  // Keep this open-ended so users can pass new/region-specific networks without waiting for a release.
  | (string & Record<never, never>);

export type GooglePayAuthMethod =
  | 'PAN_ONLY'
  | 'CRYPTOGRAM_3DS'
  // Keep this open-ended for forward compatibility without waiting for a release.
  | (string & Record<never, never>);

export type GooglePayPaymentMethodType = 'CARD' | (string & Record<never, never>);

export type GooglePayTokenizationType = 'PAYMENT_GATEWAY' | 'DIRECT' | (string & Record<never, never>);

export type GooglePayBillingAddressFormat = 'MIN' | 'FULL' | 'FULL-ISO3166' | (string & Record<never, never>);

export type GooglePayShippingAddressFormat = 'FULL' | 'FULL-ISO3166' | (string & Record<never, never>);

export type GooglePayTotalPriceStatus = 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL' | (string & Record<never, never>);

export type GooglePayCheckoutOption =
  | 'DEFAULT'
  | 'COMPLETE_IMMEDIATE_PURCHASE'
  | 'CONTINUE_TO_REVIEW'
  | (string & Record<never, never>);

export type GooglePayDisplayItemType =
  | 'LINE_ITEM'
  | 'SUBTOTAL'
  | 'TAX'
  | 'DISCOUNT'
  | 'SHIPPING_OPTION'
  | (string & Record<never, never>);

export type GooglePayDisplayItemStatus = 'FINAL' | 'PENDING' | (string & Record<never, never>);

export type GooglePayCallbackIntent =
  | 'OFFER'
  | 'PAYMENT_AUTHORIZATION'
  | 'SHIPPING_ADDRESS'
  | 'SHIPPING_OPTION'
  | 'PAYMENT_METHOD'
  | (string & Record<never, never>);

export type GooglePayCardFundingSource = 'UNKNOWN' | 'CREDIT' | 'DEBIT' | 'PREPAID' | (string & Record<never, never>);

export interface GooglePayBillingAddressParameters {
  /**
   * Billing address format to return when `billingAddressRequired` is `true`.
   *
   * Use `FULL` only when you truly need the extra fields to complete the order.
   */
  format?: GooglePayBillingAddressFormat;
  /**
   * Whether a billing phone number should also be returned.
   */
  phoneNumberRequired?: boolean;
}

export interface GooglePayShippingAddressParameters {
  /**
   * Restricts shipping addresses to the provided ISO 3166-1 alpha-2 country codes.
   */
  allowedCountryCodes?: string[];
  /**
   * Whether a phone number should be collected with the shipping address.
   */
  phoneNumberRequired?: boolean;
  /**
   * Shipping address format to return when `shippingAddressRequired` is `true`.
   *
   * `MIN` is not a valid value for shipping addresses.
   */
  format?: GooglePayShippingAddressFormat;
}

export interface GooglePayCardNetworkParameters {
  /**
   * Card network these network-specific parameters apply to.
   */
  cardNetwork: GooglePayCardNetwork;
  /**
   * Acquiring institution identification code used by some network-specific flows.
   */
  acquirerBin?: string;
  /**
   * Acquirer-assigned merchant identifier used by some network-specific flows.
   */
  acquirerMerchantId?: string;
}

export interface GooglePayCardPaymentMethodParameters {
  /**
   * Authentication methods your gateway or processor accepts.
   */
  allowedAuthMethods: GooglePayAuthMethod[];
  /**
   * Card networks your gateway or processor accepts.
   */
  allowedCardNetworks: GooglePayCardNetwork[];
  /**
   * Whether prepaid cards are allowed. Defaults to `true` in Google Pay.
   */
  allowPrepaidCards?: boolean;
  /**
   * Whether credit cards are allowed. Defaults to `true` in Google Pay.
   */
  allowCreditCards?: boolean;
  /**
   * Restricts users to cards issued in the provided ISO 3166-1 alpha-2 countries.
   */
  allowedIssuerCountryCodes?: string[];
  /**
   * Blocks cards issued in the provided ISO 3166-1 alpha-2 countries.
   *
   * This is mutually exclusive with `allowedIssuerCountryCodes`.
   */
  blockedIssuerCountryCodes?: string[];
  /**
   * Whether Google Pay should include assurance details about the selected card.
   */
  assuranceDetailsRequired?: boolean;
  /**
   * Whether a billing address is required from the buyer.
   */
  billingAddressRequired?: boolean;
  /**
   * Additional billing-address controls used when `billingAddressRequired` is `true`.
   */
  billingAddressParameters?: GooglePayBillingAddressParameters;
  /**
   * Optional network-specific processing parameters for supported networks.
   */
  cardNetworkParameters?: GooglePayCardNetworkParameters[];
  /**
   * Whether the card verification code should be returned in the payment token.
   *
   * This requires Google enablement for your account.
   */
  cvcRequired?: boolean;
}

/**
 * Tokenization parameters for `PAYMENT_GATEWAY` tokenization, which sends the payment data to a supported third-party gateway for tokenization and processing.
 * @see https://developers.google.com/pay/api/android/reference/request-objects#gateway
 */
export interface GooglePayPaymentGatewayTokenizationParameters {
  /**
   * Additional gateway-specific tokenization parameters.
   */
  [key: string]: string | undefined;
  /**
   * Google Pay gateway identifier.
   */
  gateway: string;
  /**
   * Merchant identifier issued by your payment gateway when required.
   */
  gatewayMerchantId?: string;
}

export interface GooglePayDirectTokenizationParameters {
  /**
   * Payment data cryptography protocol version.
   */
  protocolVersion: string;
  /**
   * Base64-encoded elliptic-curve public key used to encrypt the payment data.
   */
  publicKey: string;
}

export interface GooglePayGatewayTokenizationSpecification {
  /**
   * Tokenize payment data for a supported third-party gateway.
   */
  type: 'PAYMENT_GATEWAY';
  /**
   * Gateway-specific tokenization parameters.
   */
  parameters: GooglePayPaymentGatewayTokenizationParameters;
}

export interface GooglePayDirectTokenizationSpecification {
  /**
   * Tokenize payment data directly for merchant-side decryption.
   */
  type: 'DIRECT';
  /**
   * Direct tokenization parameters for payment data cryptography.
   */
  parameters: GooglePayDirectTokenizationParameters;
}

export interface GooglePayCustomTokenizationSpecification {
  /**
   * Tokenization type understood by your Google Pay integration.
   */
  type?: GooglePayTokenizationType;
  /**
   * Tokenization parameters. Google Pay expects string values.
   */
  parameters?: Record<string, string>;
}

export type GooglePayTokenizationSpecification =
  | GooglePayGatewayTokenizationSpecification
  | GooglePayDirectTokenizationSpecification
  | GooglePayCustomTokenizationSpecification;

export interface GooglePayAllowedPaymentMethod {
  /**
   * Supported payment method type. `CARD` is the only value currently accepted by Google Pay request objects.
   */
  type?: GooglePayPaymentMethodType;
  /**
   * Parameters that control which cards can be shown and what extra data is collected.
   */
  parameters?: GooglePayCardPaymentMethodParameters;
  /**
   * Tokenization settings for the selected payment method.
   *
   * In Google Pay, this is required for `PaymentDataRequest` card payment methods, but ignored by `IsReadyToPayRequest`.
   * @see https://developers.google.com/pay/api/android/reference/request-objects#PaymentMethodTokenizationSpecification
   */
  tokenizationSpecification?: GooglePayTokenizationSpecification;
}

export interface GooglePaySoftwareInfo {
  /**
   * Identifier for the software integrating with Google Pay, such as your domain name.
   */
  id?: string;
  /**
   * Version of the integrating software.
   */
  version?: string;
}

export interface GooglePayMerchantInfo {
  /**
   * Google merchant identifier.
   *
   * This is required for recognized production web integrations and may also be supplied on Android.
   */
  merchantId?: string;
  /**
   * Merchant name displayed in the Google Pay sheet.
   */
  merchantName?: string;
  /**
   * Optional metadata about the software integrating with Google Pay.
   */
  softwareInfo?: GooglePaySoftwareInfo;
}

export interface GooglePayDisplayItem {
  /**
   * User-visible line-item label.
   */
  label: string;
  /**
   * Category of the line item.
   */
  type: GooglePayDisplayItemType;
  /**
   * Monetary value for the item.
   *
   * Google Pay accepts an optional decimal precision of two decimal places.
   */
  price: string;
  /**
   * Whether this line item is final or still pending.
   */
  status?: GooglePayDisplayItemStatus;
}

export interface GooglePayOfferDetail {
  /**
   * Redemption code that identifies the offer.
   */
  redemptionCode: string;
  /**
   * User-visible description for the offer.
   */
  description: string;
}

export interface GooglePayOfferInfo {
  /**
   * Merchant-provided offers available for the current order.
   */
  offers: GooglePayOfferDetail[];
}

export interface GooglePaySelectionOption {
  /**
   * Unique identifier for the option.
   */
  id: string;
  /**
   * User-visible label for the option.
   */
  label: string;
  /**
   * Optional secondary description shown under the label.
   */
  description?: string;
}

export interface GooglePayShippingOptionParameters {
  /**
   * Available shipping options presented to the buyer.
   */
  shippingOptions: GooglePaySelectionOption[];
  /**
   * Identifier of the default selected shipping option.
   */
  defaultSelectedOptionId?: string;
}

export interface GooglePayTransactionInfo {
  /**
   * Merchant-generated correlation identifier for the transaction.
   */
  transactionId?: string;
  /**
   * ISO 4217 alphabetic currency code.
   *
   * Google Pay requires this for chargeable payment requests.
   */
  currencyCode?: string;
  /**
   * ISO 3166-1 alpha-2 country code where the transaction is processed.
   *
   * This is required for EEA/SCA flows and recommended for country-specific behavior.
   */
  countryCode?: string;
  /**
   * Total transaction price using an optional decimal precision of two decimal places.
   */
  totalPrice?: string;
  /**
   * Custom total label shown with `displayItems`.
   */
  totalPriceLabel?: string;
  /**
   * Status of the total price.
   */
  totalPriceStatus?: GooglePayTotalPriceStatus;
  /**
   * Optional transaction note. Some payment methods, such as UPI on web, require this.
   */
  transactionNote?: string;
  /**
   * Controls the submit button label shown in the Google Pay sheet.
   */
  checkoutOption?: GooglePayCheckoutOption;
  /**
   * Optional cart line items shown in the Google Pay sheet.
   */
  displayItems?: GooglePayDisplayItem[];
}

/**
 * Self-contained Google Pay request type based on the official request objects and DefinitelyTyped definitions.
 *
 * The plugin forwards the provided JSON to the native Google Pay SDK on Android, while keeping the type surface local
 * so consumers do not need to install `@types/googlepay`.
 */
export interface GooglePayIsReadyToPayRequest {
  /**
   * Google Pay API major version.
   *
   * Use `2` for current integrations.
   */
  apiVersion?: number;
  /**
   * Google Pay API minor version.
   *
   * Use `0` for current integrations.
   */
  apiVersionMinor?: number;
  /**
   * Payment methods you want to test for readiness.
   */
  allowedPaymentMethods?: GooglePayAllowedPaymentMethod[];
  /**
   * When `true`, Google Pay also indicates whether an existing matching payment method is present.
   *
   * In the `test` environment this always resolves to `true`.
   */
  existingPaymentMethodRequired?: boolean;
  /**
   * Forward-compatible escape hatch for additional fields supported by Google Pay.
   */
  [key: string]: unknown;
}

/**
 * Self-contained Google Pay payment request type based on the official request objects and DefinitelyTyped definitions.
 *
 * The plugin forwards the provided JSON to the native Google Pay SDK on Android, while keeping the type surface local
 * so consumers do not need to install `@types/googlepay`.
 */
export interface GooglePayPaymentDataRequest {
  /**
   * Google Pay API major version.
   *
   * Use `2` for current integrations.
   */
  apiVersion?: number;
  /**
   * Google Pay API minor version.
   *
   * Use `0` for current integrations.
   */
  apiVersionMinor?: number;
  /**
   * Merchant information displayed in the Google Pay sheet.
   */
  merchantInfo?: GooglePayMerchantInfo;
  /**
   * Allowed payment method configurations.
   */
  allowedPaymentMethods?: GooglePayAllowedPaymentMethod[];
  /**
   * Transaction details such as amount, currency, and checkout behavior.
   */
  transactionInfo?: GooglePayTransactionInfo;
  /**
   * Whether the buyer email address should be returned.
   */
  emailRequired?: boolean;
  /**
   * Whether a shipping address should be collected.
   */
  shippingAddressRequired?: boolean;
  /**
   * Shipping-address restrictions used when `shippingAddressRequired` is `true`.
   */
  shippingAddressParameters?: GooglePayShippingAddressParameters;
  /**
   * Merchant-provided offers to pre-populate in the Google Pay sheet.
   *
   * This is part of the official web request object and may not be supported by every native Android flow.
   */
  offerInfo?: GooglePayOfferInfo;
  /**
   * Whether the Google Pay sheet should collect a shipping option.
   *
   * This is part of the official web request object and is used with dynamic price updates.
   */
  shippingOptionRequired?: boolean;
  /**
   * Default shipping options for the Google Pay sheet.
   *
   * This is part of the official web request object and is used with dynamic price updates.
   */
  shippingOptionParameters?: GooglePayShippingOptionParameters;
  /**
   * Callback intents for dynamic price updates and payment authorization on the web.
   *
   * These values are included for completeness with the official Google Pay request object, but the Capacitor plugin
   * does not currently expose the corresponding web callbacks.
   */
  callbackIntents?: GooglePayCallbackIntent[];
  /**
   * Forward-compatible escape hatch for additional fields supported by Google Pay.
   */
  [key: string]: unknown;
}

export interface GooglePayAddress {
  /**
   * Recipient or cardholder name.
   */
  name?: string;
  /**
   * First address line.
   */
  address1?: string;
  /**
   * Second address line.
   */
  address2?: string;
  /**
   * Third address line.
   */
  address3?: string;
  /**
   * City or locality.
   */
  locality?: string;
  /**
   * State, province, or other administrative area.
   */
  administrativeArea?: string;
  /**
   * Two-letter ISO 3166-1 alpha-2 country code.
   */
  countryCode: string;
  /**
   * Postal or ZIP code.
   */
  postalCode: string;
  /**
   * Sorting code used in some countries.
   */
  sortingCode?: string;
  /**
   * Phone number returned when it was requested.
   */
  phoneNumber?: string;
  /**
   * ISO 3166-2 code for the administrative area when `FULL-ISO3166` formatting is used.
   */
  iso3166AdministrativeArea?: string;
}

export interface GooglePayAssuranceDetails {
  /**
   * Whether Google verified account possession for the selected card.
   */
  accountVerified?: boolean;
  /**
   * Whether cardholder authentication or ID&V was completed for the selected card.
   */
  cardHolderAuthenticated?: boolean;
}

export interface GooglePayCardInfo {
  /**
   * Optional assurance details returned when `assuranceDetailsRequired` was requested.
   */
  assuranceDetails?: GooglePayAssuranceDetails;
  /**
   * Card network for the selected payment method.
   */
  cardNetwork: GooglePayCardNetwork;
  /**
   * Card details, typically the last four digits.
   */
  cardDetails: string;
  /**
   * Billing address returned when `billingAddressRequired` was requested.
   */
  billingAddress?: GooglePayAddress;
  /**
   * Funding source for the selected card when available.
   */
  cardFundingSource?: GooglePayCardFundingSource;
}

export interface GooglePayPaymentMethodTokenizationData {
  /**
   * Tokenization type used for the selected payment method.
   */
  type: GooglePayTokenizationType;
  /**
   * Serialized payment token or gateway payload.
   */
  token: string;
}

export interface GooglePayPaymentMethodData {
  /**
   * Payment method type returned by Google Pay.
   */
  type: GooglePayPaymentMethodType;
  /**
   * Additional information about the selected card.
   */
  info?: GooglePayCardInfo;
  /**
   * User-facing description of the selected funding source.
   */
  description?: string;
  /**
   * Tokenized payment data you send to your backend or processor.
   */
  tokenizationData: GooglePayPaymentMethodTokenizationData;
}

export interface GooglePayOfferData {
  /**
   * Offer redemption codes applied by the buyer.
   */
  redemptionCodes: string[];
}

export interface GooglePaySelectionOptionData {
  /**
   * Identifier of the selected option.
   */
  id: string;
}

export interface GooglePayIsReadyToPayResponse {
  /**
   * Whether Google Pay is available for at least one of the requested payment methods.
   */
  result: boolean;
  /**
   * Whether the current user already has one of the requested payment methods available.
   *
   * This is only returned by Google Pay web integrations when `existingPaymentMethodRequired` is `true`.
   */
  paymentMethodPresent?: boolean;
}

export interface GooglePayPaymentData {
  /**
   * Google Pay API major version returned in the response.
   */
  apiVersion: number;
  /**
   * Google Pay API minor version returned in the response.
   */
  apiVersionMinor: number;
  /**
   * Buyer email address when `emailRequired` was requested.
   */
  email?: string;
  /**
   * Shipping address when `shippingAddressRequired` was requested.
   */
  shippingAddress?: GooglePayAddress;
  /**
   * Selected payment method details and tokenized payload.
   */
  paymentMethodData: GooglePayPaymentMethodData;
  /**
   * Offer redemption data when an offer was applied.
   */
  offerData?: GooglePayOfferData;
  /**
   * Selected shipping option data when shipping options were used.
   */
  shippingOptionData?: GooglePaySelectionOptionData;
}

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
  isReadyToPayRequest?: GooglePayIsReadyToPayRequest;
}

export interface GooglePayAvailabilityResult {
  /**
   * Whether the user is able to provide payment information through the Google Pay payment sheet.
   */
  isReady: boolean;
  /**
   * The current user's ability to pay with one or more of the payment methods specified in `IsReadyToPayRequest.allowedPaymentMethods`.
   *
   * This property only exists if `IsReadyToPayRequest.existingPaymentMethodRequired` was set to `true`. The property value will always be `true` if the request is configured for a test environment.
   */
  paymentMethodPresent: boolean | undefined;
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
  paymentDataRequest: GooglePayPaymentDataRequest;
}

export interface GooglePayPaymentResult {
  /**
   * Payment data returned by Google Pay.
   *
   * @see https://developers.google.com/pay/api/android/reference/response-objects#PaymentData
   */
  paymentData: GooglePayPaymentData;
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

export interface ApplePayRequestPaymentResult {
  /**
   * Platform that resolved the payment request.
   */
  platform: 'ios';
  /**
   * Apple Pay payment payload.
   */
  apple: ApplePayPaymentResult;
}

export interface GooglePayRequestPaymentResult {
  /**
   * Platform that resolved the payment request.
   */
  platform: 'android';
  /**
   * Google Pay payment payload.
   */
  google: GooglePayPaymentResult;
}

export type PayPaymentResult = ApplePayRequestPaymentResult | GooglePayRequestPaymentResult;

export interface PayPlugin {
  /**
   * Checks whether native pay is available on the current platform.
   * On iOS this evaluates Apple Pay, on Android it evaluates Google Pay.
   */
  isPayAvailable(options?: PayAvailabilityOptions): Promise<PayAvailabilityResult>;
  /**
   * Presents the native pay sheet for the current platform.
   * Provide the Apple Pay configuration on iOS and the Google Pay configuration on Android.
   *
   * This promise is the completion path on both platforms.
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
