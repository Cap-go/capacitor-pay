# @capgo/capacitor-pay

<a href="https://capgo.app/">
  <img
    src="https://raw.githubusercontent.com/Cap-go/capgo/main/assets/capgo_banner.png"
    alt="Capgo - Instant updates for capacitor"
  />
</a>

<div align="center">
  <h2>
    <a href="https://capgo.app/?ref=plugin_pay"> ➡️ Get Instant updates for your App with Capgo</a>
  </h2>
  <h2>
    <a href="https://capgo.app/consulting/?ref=plugin_pay"> Missing a feature? We'll build the plugin for you 💪</a>
  </h2>
</div>

Capacitor plugin to trigger native payments with Apple Pay and Google Pay using a unified JavaScript API.

## Documentation

The most complete doc is available here: https://capgo.app/docs/plugins/pay/

## Compatibility

| Plugin version | Capacitor compatibility | Maintained |
| -------------- | ----------------------- | ---------- |
| v8.\*.\*       | v8.\*.\*                | ✅         |
| v7.\*.\*       | v7.\*.\*                | On demand  |
| v6.\*.\*       | v6.\*.\*                | ❌         |
| v5.\*.\*       | v5.\*.\*                | ❌         |

> **Note:** The major version of this plugin follows the major version of Capacitor. Use the version that matches your Capacitor installation (e.g., plugin v8 for Capacitor 8). Only the latest major version is actively maintained.

## Install

```bash
# Install (choose one)
npm install @capgo/capacitor-pay
pnpm add @capgo/capacitor-pay
yarn add @capgo/capacitor-pay
bun add @capgo/capacitor-pay

# Then sync Capacitor (choose one)
npx cap sync
pnpm exec cap sync
yarn cap sync
bunx cap sync
```

## Platform setup

Before invoking the plugin, complete the native configuration documented in this repository:

- **Apple Pay (iOS):** see [`docs/apple-pay-setup.md`](docs/apple-pay-setup.md) for merchant ID creation, certificates, Xcode entitlements, and device testing.
- **Google Pay (Android):** follow [`docs/google-pay-setup.md`](docs/google-pay-setup.md) to configure the business profile, tokenization settings, and runtime JSON payloads.

Finish both guides once per app to unlock the native payment sheets on devices.

Google Pay request and response types are bundled with this plugin, so you do not need to install `@types/googlepay` unless you also use Google's web JavaScript client elsewhere in your app.

## Usage

```ts
import { Pay } from '@capgo/capacitor-pay';

// Check availability on the current platform.
const availability = await Pay.isPayAvailable({
  apple: {
    supportedNetworks: ['visa', 'masterCard', 'amex'],
  },
  google: {
    // Optional: falls back to a basic CARD request if omitted.
    isReadyToPayRequest: {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'],
          },
        },
      ],
    },
  },
});

if (!availability.available) {
  // Surface a friendly message or provide an alternative checkout.
  return;
}

if (availability.platform === 'ios') {
  const result = await Pay.requestPayment({
    apple: {
      merchantIdentifier: 'merchant.com.example.app',
      countryCode: 'US',
      currencyCode: 'USD',
      supportedNetworks: ['visa', 'masterCard'],
      paymentSummaryItems: [
        { label: 'Example Product', amount: '19.99' },
        { label: 'Tax', amount: '1.60' },
        { label: 'Example Store', amount: '21.59' },
      ],
      requiredShippingContactFields: ['postalAddress', 'name', 'emailAddress'],
    },
  });
  console.log(result.apple?.paymentData);
} else if (availability.platform === 'android') {
  await Pay.addListener('onAuthorized', (result) => {
    console.log('Payment authorized:', result.google.paymentData);
    // Process the payment token on your backend server here.
  });

  await Pay.addListener('onCanceled', (result) => {
    console.log('Payment canceled by user', result);
    // Handle the cancellation gracefully in your UI.
  });

  await Pay.addListener('onError', (error) => {
    console.error('Payment error:', error);
    // Handle the error gracefully in your UI.
  });

  await Pay.requestPayment({
    google: {
      environment: 'test',
      paymentDataRequest: {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'],
              billingAddressRequired: true,
              billingAddressParameters: {
                format: 'FULL',
              },
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'example',
                gatewayMerchantId: 'exampleGatewayMerchantId',
              },
            },
          },
        ],
        merchantInfo: {
          merchantId: '01234567890123456789',
          merchantName: 'Example Merchant',
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: '21.59',
          currencyCode: 'USD',
          countryCode: 'US',
        },
      },
    },
  });
}
```

## Recurring payments

Apple Pay has first-class support via `recurringPaymentRequest` (iOS 16+):

```ts
import { Pay } from '@capgo/capacitor-pay';

await Pay.requestPayment({
  apple: {
    merchantIdentifier: 'merchant.com.example.app',
    countryCode: 'US',
    currencyCode: 'USD',
    supportedNetworks: ['visa', 'masterCard'],
    paymentSummaryItems: [
      { label: 'Pro Plan', amount: '9.99' },
      { label: 'Example Store', amount: '9.99' },
    ],
    recurringPaymentRequest: {
      paymentDescription: 'Pro Plan Subscription',
      managementURL: 'https://example.com/account/subscription',
      regularBilling: {
        label: 'Pro Plan',
        amount: '9.99',
        intervalUnit: 'month',
        intervalCount: 1,
        startDate: Date.now(),
      },
    },
  },
});
```

Google Pay does not have a dedicated "recurring request" object in `PaymentDataRequest`. For subscriptions you typically:

1. Collect a token once with a normal `paymentDataRequest`.
2. Store it server-side and create recurring charges with your PSP/gateway (Stripe/Adyen/Braintree/etc).

```ts
import { Pay, type GooglePayPaymentDataRequest } from '@capgo/capacitor-pay';

const paymentDataRequest: GooglePayPaymentDataRequest = {
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [
    {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'],
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'example',
          gatewayMerchantId: 'exampleGatewayMerchantId',
        },
      },
    },
  ],
  merchantInfo: {
    merchantId: '01234567890123456789',
    merchantName: 'Example Merchant',
  },
  transactionInfo: {
    totalPriceStatus: 'FINAL',
    totalPrice: '9.99',
    currencyCode: 'USD',
    countryCode: 'US',
  },
};

await Pay.addListener('onAuthorized', ({ google }) => {
  // Send `google.paymentData` to your backend and use your PSP to start the subscription.
});

await Pay.requestPayment({
  google: {
    environment: 'test',
    paymentDataRequest,
  },
});
```

## API

<docgen-index>

* [`isPayAvailable(...)`](#ispayavailable)
* [`requestPayment(...)`](#requestpayment)
* [`getPluginVersion()`](#getpluginversion)
* [`addListener('onAuthorized', ...)`](#addlisteneronauthorized-)
* [`addListener('onCanceled', ...)`](#addlisteneroncanceled-)
* [`addListener('onError', ...)`](#addlisteneronerror-)
* [`removeAllListeners()`](#removealllisteners)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### isPayAvailable(...)

```typescript
isPayAvailable(options?: PayAvailabilityOptions | undefined) => Promise<PayAvailabilityResult>
```

Checks whether native pay is available on the current platform.
On iOS this evaluates Apple Pay, on Android it evaluates Google Pay.

| Param         | Type                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| **`options`** | <code><a href="#payavailabilityoptions">PayAvailabilityOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#payavailabilityresult">PayAvailabilityResult</a>&gt;</code>

--------------------


### requestPayment(...)

```typescript
requestPayment(options: PayPaymentOptions) => Promise<PayPaymentResult>
```

Presents the native pay sheet for the current platform.
Provide the Apple Pay configuration on iOS and the Google Pay configuration on Android.

| Param         | Type                                                            |
| ------------- | --------------------------------------------------------------- |
| **`options`** | <code><a href="#paypaymentoptions">PayPaymentOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#paypaymentresult">PayPaymentResult</a>&gt;</code>

--------------------


### getPluginVersion()

```typescript
getPluginVersion() => Promise<{ version: string; }>
```

Get the native Capacitor plugin version

**Returns:** <code>Promise&lt;{ version: string; }&gt;</code>

--------------------


### addListener('onAuthorized', ...)

```typescript
addListener(eventName: 'onAuthorized', listenerFunc: (result: GooglePayAuthorizedEvent) => void) => Promise<PluginListenerHandle>
```

Add event listener for Google Pay authorized payments.

Works only on Google Pay.

| Param              | Type                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'onAuthorized'</code>                                                                        |
| **`listenerFunc`** | <code>(result: <a href="#googlepayauthorizedevent">GooglePayAuthorizedEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt;</code>

--------------------


### addListener('onCanceled', ...)

```typescript
addListener(eventName: 'onCanceled', listenerFunc: (result: GooglePayCanceledEvent) => void) => Promise<PluginListenerHandle>
```

Add event listener for Google Pay canceled payments.

Works only on Google Pay.

| Param              | Type                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'onCanceled'</code>                                                                      |
| **`listenerFunc`** | <code>(result: <a href="#googlepaycanceledevent">GooglePayCanceledEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt;</code>

--------------------


### addListener('onError', ...)

```typescript
addListener(eventName: 'onError', listenerFunc: (error: GooglePayErrorEvent) => void) => Promise<PluginListenerHandle>
```

Add event listener for Google Pay errors.

Works only on Google Pay.

| Param              | Type                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'onError'</code>                                                                  |
| **`listenerFunc`** | <code>(error: <a href="#googlepayerrorevent">GooglePayErrorEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt;</code>

--------------------


### removeAllListeners()

```typescript
removeAllListeners() => Promise<void>
```

Remove all the listeners that are attached to this plugin.

--------------------


### Interfaces


#### PayAvailabilityResult

| Prop            | Type                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| **`available`** | <code>boolean</code>                                                                |
| **`platform`**  | <code><a href="#payplatform">PayPlatform</a></code>                                 |
| **`apple`**     | <code><a href="#applepayavailabilityresult">ApplePayAvailabilityResult</a></code>   |
| **`google`**    | <code><a href="#googlepayavailabilityresult">GooglePayAvailabilityResult</a></code> |


#### ApplePayAvailabilityResult

| Prop                               | Type                 | Description                                                                          |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| **`canMakePayments`**              | <code>boolean</code> | Indicates whether the device can make Apple Pay payments in general.                 |
| **`canMakePaymentsUsingNetworks`** | <code>boolean</code> | Indicates whether the device can make Apple Pay payments with the supplied networks. |


#### GooglePayAvailabilityResult

| Prop                       | Type                 | Description                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`isReady`**              | <code>boolean</code> | Whether the user is able to provide payment information through the Google Pay payment sheet.                                                                                                                                                                                                                                         |
| **`paymentMethodPresent`** | <code>boolean</code> | The current user's ability to pay with one or more of the payment methods specified in `IsReadyToPayRequest.allowedPaymentMethods`. This property only exists if `IsReadyToPayRequest.existingPaymentMethodRequired` was set to `true`. The property value will always be `true` if the request is configured for a test environment. |


#### PayAvailabilityOptions

| Prop         | Type                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| **`apple`**  | <code><a href="#applepayavailabilityoptions">ApplePayAvailabilityOptions</a></code>   |
| **`google`** | <code><a href="#googlepayavailabilityoptions">GooglePayAvailabilityOptions</a></code> |


#### ApplePayAvailabilityOptions

| Prop                    | Type                           | Description                                                                                                                          |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`supportedNetworks`** | <code>ApplePayNetwork[]</code> | Optional list of payment networks you intend to use. Passing networks determines the return value of `canMakePaymentsUsingNetworks`. |


#### GooglePayAvailabilityOptions

| Prop                      | Type                                                                                  | Description                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **`environment`**         | <code><a href="#googlepayenvironment">GooglePayEnvironment</a></code>                 | Environment used to construct the Google Payments client. Defaults to `'test'`.                                                              |
| **`isReadyToPayRequest`** | <code><a href="#googlepayisreadytopayrequest">GooglePayIsReadyToPayRequest</a></code> | Raw `IsReadyToPayRequest` JSON as defined by the Google Pay API. Supply the card networks and auth methods you intend to support at runtime. |


#### GooglePayIsReadyToPayRequest

Self-contained Google Pay request type based on the official request objects and DefinitelyTyped definitions.

The plugin forwards the provided JSON to the native Google Pay SDK on Android, while keeping the type surface local
so consumers do not need to install `@types/googlepay`.

| Prop                                | Type                                         | Description                                                                                                                                              |
| ----------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`apiVersion`**                    | <code>number</code>                          | Google Pay API major version. Use `2` for current integrations.                                                                                          |
| **`apiVersionMinor`**               | <code>number</code>                          | Google Pay API minor version. Use `0` for current integrations.                                                                                          |
| **`allowedPaymentMethods`**         | <code>GooglePayAllowedPaymentMethod[]</code> | Payment methods you want to test for readiness.                                                                                                          |
| **`existingPaymentMethodRequired`** | <code>boolean</code>                         | When `true`, Google Pay also indicates whether an existing matching payment method is present. In the `test` environment this always resolves to `true`. |


#### GooglePayAllowedPaymentMethod

| Prop                            | Type                                                                                                  | Description                                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`type`**                      | <code><a href="#googlepaypaymentmethodtype">GooglePayPaymentMethodType</a></code>                     | Supported payment method type. `CARD` is the only value currently accepted by Google Pay request objects.                                                                   |
| **`parameters`**                | <code><a href="#googlepaycardpaymentmethodparameters">GooglePayCardPaymentMethodParameters</a></code> | Parameters that control which cards can be shown and what extra data is collected.                                                                                          |
| **`tokenizationSpecification`** | <code><a href="#googlepaytokenizationspecification">GooglePayTokenizationSpecification</a></code>     | Tokenization settings for the selected payment method. In Google Pay, this is required for `PaymentDataRequest` card payment methods, but ignored by `IsReadyToPayRequest`. |


#### GooglePayCardPaymentMethodParameters

| Prop                            | Type                                                                                            | Description                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **`allowedAuthMethods`**        | <code>GooglePayAuthMethod[]</code>                                                              | Authentication methods your gateway or processor accepts.                                                                      |
| **`allowedCardNetworks`**       | <code>GooglePayCardNetwork[]</code>                                                             | Card networks your gateway or processor accepts.                                                                               |
| **`allowPrepaidCards`**         | <code>boolean</code>                                                                            | Whether prepaid cards are allowed. Defaults to `true` in Google Pay.                                                           |
| **`allowCreditCards`**          | <code>boolean</code>                                                                            | Whether credit cards are allowed. Defaults to `true` in Google Pay.                                                            |
| **`allowedIssuerCountryCodes`** | <code>string[]</code>                                                                           | Restricts users to cards issued in the provided ISO 3166-1 alpha-2 countries.                                                  |
| **`blockedIssuerCountryCodes`** | <code>string[]</code>                                                                           | Blocks cards issued in the provided ISO 3166-1 alpha-2 countries. This is mutually exclusive with `allowedIssuerCountryCodes`. |
| **`assuranceDetailsRequired`**  | <code>boolean</code>                                                                            | Whether Google Pay should include assurance details about the selected card.                                                   |
| **`billingAddressRequired`**    | <code>boolean</code>                                                                            | Whether a billing address is required from the buyer.                                                                          |
| **`billingAddressParameters`**  | <code><a href="#googlepaybillingaddressparameters">GooglePayBillingAddressParameters</a></code> | Additional billing-address controls used when `billingAddressRequired` is `true`.                                              |
| **`cardNetworkParameters`**     | <code>GooglePayCardNetworkParameters[]</code>                                                   | Optional network-specific processing parameters for supported networks.                                                        |
| **`cvcRequired`**               | <code>boolean</code>                                                                            | Whether the card verification code should be returned in the payment token. This requires Google enablement for your account.  |


#### GooglePayBillingAddressParameters

| Prop                      | Type                                                                                    | Description                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`format`**              | <code><a href="#googlepaybillingaddressformat">GooglePayBillingAddressFormat</a></code> | Billing address format to return when `billingAddressRequired` is `true`. Use `FULL` only when you truly need the extra fields to complete the order. |
| **`phoneNumberRequired`** | <code>boolean</code>                                                                    | Whether a billing phone number should also be returned.                                                                                               |


#### GooglePayCardNetworkParameters

| Prop                     | Type                                                                  | Description                                                                    |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **`cardNetwork`**        | <code><a href="#googlepaycardnetwork">GooglePayCardNetwork</a></code> | Card network these network-specific parameters apply to.                       |
| **`acquirerBin`**        | <code>string</code>                                                   | Acquiring institution identification code used by some network-specific flows. |
| **`acquirerMerchantId`** | <code>string</code>                                                   | Acquirer-assigned merchant identifier used by some network-specific flows.     |


#### GooglePayGatewayTokenizationSpecification

| Prop             | Type                                                                                                                    | Description                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **`type`**       | <code>'PAYMENT_GATEWAY'</code>                                                                                          | Tokenize payment data for a supported third-party gateway. |
| **`parameters`** | <code><a href="#googlepaypaymentgatewaytokenizationparameters">GooglePayPaymentGatewayTokenizationParameters</a></code> | Gateway-specific tokenization parameters.                  |


#### GooglePayPaymentGatewayTokenizationParameters

Tokenization parameters for `PAYMENT_GATEWAY` tokenization, which sends the payment data to a supported third-party gateway for tokenization and processing.

| Prop                    | Type                | Description                                                       |
| ----------------------- | ------------------- | ----------------------------------------------------------------- |
| **`gateway`**           | <code>string</code> | Google Pay gateway identifier.                                    |
| **`gatewayMerchantId`** | <code>string</code> | Merchant identifier issued by your payment gateway when required. |


#### GooglePayDirectTokenizationSpecification

| Prop             | Type                                                                                                    | Description                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **`type`**       | <code>'DIRECT'</code>                                                                                   | Tokenize payment data directly for merchant-side decryption.  |
| **`parameters`** | <code><a href="#googlepaydirecttokenizationparameters">GooglePayDirectTokenizationParameters</a></code> | Direct tokenization parameters for payment data cryptography. |


#### GooglePayDirectTokenizationParameters

| Prop                  | Type                | Description                                                                |
| --------------------- | ------------------- | -------------------------------------------------------------------------- |
| **`protocolVersion`** | <code>string</code> | Payment data cryptography protocol version.                                |
| **`publicKey`**       | <code>string</code> | Base64-encoded elliptic-curve public key used to encrypt the payment data. |


#### GooglePayCustomTokenizationSpecification

| Prop             | Type                                                                            | Description                                                  |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **`type`**       | <code><a href="#googlepaytokenizationtype">GooglePayTokenizationType</a></code> | Tokenization type understood by your Google Pay integration. |
| **`parameters`** | <code><a href="#record">Record</a>&lt;string, string&gt;</code>                 | Tokenization parameters. Google Pay expects string values.   |


#### ApplePayRequestPaymentResult

| Prop           | Type                                                                    | Description                                 |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| **`platform`** | <code>'ios'</code>                                                      | Platform that resolved the payment request. |
| **`apple`**    | <code><a href="#applepaypaymentresult">ApplePayPaymentResult</a></code> | Apple Pay payment payload.                  |


#### ApplePayPaymentResult

| Prop                        | Type                                                                                                                                                | Description                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **`paymentData`**           | <code>string</code>                                                                                                                                 | Raw payment token encoded as base64 string.          |
| **`paymentString`**         | <code>string</code>                                                                                                                                 | Raw payment token JSON string, useful for debugging. |
| **`transactionIdentifier`** | <code>string</code>                                                                                                                                 | Payment transaction identifier.                      |
| **`paymentMethod`**         | <code>{ displayName?: string; network?: <a href="#applepaynetwork">ApplePayNetwork</a>; type: 'credit' \| 'debit' \| 'prepaid' \| 'store'; }</code> |                                                      |
| **`shippingContact`**       | <code><a href="#applepaycontact">ApplePayContact</a></code>                                                                                         |                                                      |
| **`billingContact`**        | <code><a href="#applepaycontact">ApplePayContact</a></code>                                                                                         |                                                      |


#### ApplePayContact

| Prop                | Type                                                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`name`**          | <code>{ givenName?: string; familyName?: string; middleName?: string; namePrefix?: string; nameSuffix?: string; nickname?: string; }</code>                                            |
| **`emailAddress`**  | <code>string</code>                                                                                                                                                                    |
| **`phoneNumber`**   | <code>string</code>                                                                                                                                                                    |
| **`postalAddress`** | <code>{ street?: string; city?: string; state?: string; postalCode?: string; country?: string; isoCountryCode?: string; subAdministrativeArea?: string; subLocality?: string; }</code> |


#### GooglePayRequestPaymentResult

| Prop           | Type                   | Description                                 |
| -------------- | ---------------------- | ------------------------------------------- |
| **`platform`** | <code>'android'</code> | Platform that resolved the payment request. |


#### PayPaymentOptions

| Prop         | Type                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| **`apple`**  | <code><a href="#applepaypaymentoptions">ApplePayPaymentOptions</a></code>   |
| **`google`** | <code><a href="#googlepaypaymentoptions">GooglePayPaymentOptions</a></code> |


#### ApplePayPaymentOptions

| Prop                                | Type                                                                                        | Description                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **`merchantIdentifier`**            | <code>string</code>                                                                         | Merchant identifier created in the Apple Developer portal.         |
| **`countryCode`**                   | <code>string</code>                                                                         | Two-letter ISO 3166 country code.                                  |
| **`currencyCode`**                  | <code>string</code>                                                                         | Three-letter ISO 4217 currency code.                               |
| **`paymentSummaryItems`**           | <code>ApplePaySummaryItem[]</code>                                                          | Payment summary items displayed in the Apple Pay sheet.            |
| **`supportedNetworks`**             | <code>ApplePayNetwork[]</code>                                                              | Card networks to support.                                          |
| **`merchantCapabilities`**          | <code>ApplePayMerchantCapability[]</code>                                                   | Merchant payment capabilities. Defaults to ['3DS'] when omitted.   |
| **`requiredShippingContactFields`** | <code>ApplePayContactField[]</code>                                                         | Contact fields that must be supplied for shipping.                 |
| **`requiredBillingContactFields`**  | <code>ApplePayContactField[]</code>                                                         | Contact fields that must be supplied for billing.                  |
| **`shippingType`**                  | <code><a href="#applepayshippingtype">ApplePayShippingType</a></code>                       | Controls the shipping flow presented to the user.                  |
| **`supportedCountries`**            | <code>string[]</code>                                                                       | Optional ISO 3166 country codes where the merchant is supported.   |
| **`applicationData`**               | <code>string</code>                                                                         | Optional opaque application data passed back in the payment token. |
| **`recurringPaymentRequest`**       | <code><a href="#applepayrecurringpaymentrequest">ApplePayRecurringPaymentRequest</a></code> | Recurring payment configuration (iOS 16+).                         |


#### ApplePaySummaryItem

| Prop         | Type                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| **`label`**  | <code>string</code>                                                         |
| **`amount`** | <code>string</code>                                                         |
| **`type`**   | <code><a href="#applepaysummaryitemtype">ApplePaySummaryItemType</a></code> |


#### ApplePayRecurringPaymentRequest

| Prop                       | Type                                                                                                | Description                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **`paymentDescription`**   | <code>string</code>                                                                                 | A description for the recurring payment shown in the Apple Pay sheet.      |
| **`regularBilling`**       | <code><a href="#applepayrecurringpaymentsummaryitem">ApplePayRecurringPaymentSummaryItem</a></code> | The recurring billing item (for example your subscription).                |
| **`managementURL`**        | <code>string</code>                                                                                 | URL where the user can manage the recurring payment (cancel, update, etc). |
| **`billingAgreement`**     | <code>string</code>                                                                                 | Optional billing agreement text shown to the user.                         |
| **`tokenNotificationURL`** | <code>string</code>                                                                                 | Optional URL where Apple can send token update notifications.              |
| **`trialBilling`**         | <code><a href="#applepayrecurringpaymentsummaryitem">ApplePayRecurringPaymentSummaryItem</a></code> | Optional trial billing item (for example a free trial period).             |


#### ApplePayRecurringPaymentSummaryItem

| Prop                | Type                                                                                                  | Description                                                                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`intervalUnit`**  | <code><a href="#applepayrecurringpaymentintervalunit">ApplePayRecurringPaymentIntervalUnit</a></code> | Unit of time between recurring payments.                                                                                                                                                                                                                                                 |
| **`intervalCount`** | <code>number</code>                                                                                   | Number of `intervalUnit` units between recurring payments (for example `1` month, `2` weeks).                                                                                                                                                                                            |
| **`startDate`**     | <code>string \| number</code>                                                                         | Start date of the recurring period. On supported platforms this may be either: - a `number` representing milliseconds since Unix epoch, or - a `string` in a date format accepted by the native implementation (for example an ISO 8601 date-time string or a `yyyy-MM-dd` date string). |
| **`endDate`**       | <code>string \| number</code>                                                                         | End date of the recurring period. On supported platforms this may be either: - a `number` representing milliseconds since Unix epoch, or - a `string` in a date format accepted by the native implementation (for example an ISO 8601 date-time string or a `yyyy-MM-dd` date string).   |


#### GooglePayPaymentOptions

| Prop                     | Type                                                                                | Description                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **`environment`**        | <code><a href="#googlepayenvironment">GooglePayEnvironment</a></code>               | Environment used to construct the Google Payments client. Defaults to `'test'`.                                                          |
| **`paymentDataRequest`** | <code><a href="#googlepaypaymentdatarequest">GooglePayPaymentDataRequest</a></code> | Raw `PaymentDataRequest` JSON as defined by the Google Pay API. Provide transaction details, merchant info, and tokenization parameters. |


#### GooglePayPaymentDataRequest

Self-contained Google Pay payment request type based on the official request objects and DefinitelyTyped definitions.

The plugin forwards the provided JSON to the native Google Pay SDK on Android, while keeping the type surface local
so consumers do not need to install `@types/googlepay`.

| Prop                            | Type                                                                                              | Description                                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`apiVersion`**                | <code>number</code>                                                                               | Google Pay API major version. Use `2` for current integrations.                                                                                                                                                                                              |
| **`apiVersionMinor`**           | <code>number</code>                                                                               | Google Pay API minor version. Use `0` for current integrations.                                                                                                                                                                                              |
| **`merchantInfo`**              | <code><a href="#googlepaymerchantinfo">GooglePayMerchantInfo</a></code>                           | Merchant information displayed in the Google Pay sheet.                                                                                                                                                                                                      |
| **`allowedPaymentMethods`**     | <code>GooglePayAllowedPaymentMethod[]</code>                                                      | Allowed payment method configurations.                                                                                                                                                                                                                       |
| **`transactionInfo`**           | <code><a href="#googlepaytransactioninfo">GooglePayTransactionInfo</a></code>                     | Transaction details such as amount, currency, and checkout behavior.                                                                                                                                                                                         |
| **`emailRequired`**             | <code>boolean</code>                                                                              | Whether the buyer email address should be returned.                                                                                                                                                                                                          |
| **`shippingAddressRequired`**   | <code>boolean</code>                                                                              | Whether a shipping address should be collected.                                                                                                                                                                                                              |
| **`shippingAddressParameters`** | <code><a href="#googlepayshippingaddressparameters">GooglePayShippingAddressParameters</a></code> | Shipping-address restrictions used when `shippingAddressRequired` is `true`.                                                                                                                                                                                 |
| **`offerInfo`**                 | <code><a href="#googlepayofferinfo">GooglePayOfferInfo</a></code>                                 | Merchant-provided offers to pre-populate in the Google Pay sheet. This is part of the official web request object and may not be supported by every native Android flow.                                                                                     |
| **`shippingOptionRequired`**    | <code>boolean</code>                                                                              | Whether the Google Pay sheet should collect a shipping option. This is part of the official web request object and is used with dynamic price updates.                                                                                                       |
| **`shippingOptionParameters`**  | <code><a href="#googlepayshippingoptionparameters">GooglePayShippingOptionParameters</a></code>   | Default shipping options for the Google Pay sheet. This is part of the official web request object and is used with dynamic price updates.                                                                                                                   |
| **`callbackIntents`**           | <code>GooglePayCallbackIntent[]</code>                                                            | Callback intents for dynamic price updates and payment authorization on the web. These values are included for completeness with the official Google Pay request object, but the Capacitor plugin does not currently expose the corresponding web callbacks. |


#### GooglePayMerchantInfo

| Prop               | Type                                                                    | Description                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **`merchantId`**   | <code>string</code>                                                     | Google merchant identifier. This is required for recognized production web integrations and may also be supplied on Android. |
| **`merchantName`** | <code>string</code>                                                     | Merchant name displayed in the Google Pay sheet.                                                                             |
| **`softwareInfo`** | <code><a href="#googlepaysoftwareinfo">GooglePaySoftwareInfo</a></code> | Optional metadata about the software integrating with Google Pay.                                                            |


#### GooglePaySoftwareInfo

| Prop          | Type                | Description                                                                        |
| ------------- | ------------------- | ---------------------------------------------------------------------------------- |
| **`id`**      | <code>string</code> | Identifier for the software integrating with Google Pay, such as your domain name. |
| **`version`** | <code>string</code> | Version of the integrating software.                                               |


#### GooglePayTransactionInfo

| Prop                   | Type                                                                            | Description                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`transactionId`**    | <code>string</code>                                                             | Merchant-generated correlation identifier for the transaction.                                                                                        |
| **`currencyCode`**     | <code>string</code>                                                             | ISO 4217 alphabetic currency code. Google Pay requires this for chargeable payment requests.                                                          |
| **`countryCode`**      | <code>string</code>                                                             | ISO 3166-1 alpha-2 country code where the transaction is processed. This is required for EEA/SCA flows and recommended for country-specific behavior. |
| **`totalPrice`**       | <code>string</code>                                                             | Total transaction price using an optional decimal precision of two decimal places.                                                                    |
| **`totalPriceLabel`**  | <code>string</code>                                                             | Custom total label shown with `displayItems`.                                                                                                         |
| **`totalPriceStatus`** | <code><a href="#googlepaytotalpricestatus">GooglePayTotalPriceStatus</a></code> | Status of the total price.                                                                                                                            |
| **`transactionNote`**  | <code>string</code>                                                             | Optional transaction note. Some payment methods, such as UPI on web, require this.                                                                    |
| **`checkoutOption`**   | <code><a href="#googlepaycheckoutoption">GooglePayCheckoutOption</a></code>     | Controls the submit button label shown in the Google Pay sheet.                                                                                       |
| **`displayItems`**     | <code>GooglePayDisplayItem[]</code>                                             | Optional cart line items shown in the Google Pay sheet.                                                                                               |


#### GooglePayDisplayItem

| Prop         | Type                                                                              | Description                                                                                          |
| ------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **`label`**  | <code>string</code>                                                               | User-visible line-item label.                                                                        |
| **`type`**   | <code><a href="#googlepaydisplayitemtype">GooglePayDisplayItemType</a></code>     | Category of the line item.                                                                           |
| **`price`**  | <code>string</code>                                                               | Monetary value for the item. Google Pay accepts an optional decimal precision of two decimal places. |
| **`status`** | <code><a href="#googlepaydisplayitemstatus">GooglePayDisplayItemStatus</a></code> | Whether this line item is final or still pending.                                                    |


#### GooglePayShippingAddressParameters

| Prop                      | Type                                                                                      | Description                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **`allowedCountryCodes`** | <code>string[]</code>                                                                     | Restricts shipping addresses to the provided ISO 3166-1 alpha-2 country codes.                                                 |
| **`phoneNumberRequired`** | <code>boolean</code>                                                                      | Whether a phone number should be collected with the shipping address.                                                          |
| **`format`**              | <code><a href="#googlepayshippingaddressformat">GooglePayShippingAddressFormat</a></code> | Shipping address format to return when `shippingAddressRequired` is `true`. `MIN` is not a valid value for shipping addresses. |


#### GooglePayOfferInfo

| Prop         | Type                                | Description                                               |
| ------------ | ----------------------------------- | --------------------------------------------------------- |
| **`offers`** | <code>GooglePayOfferDetail[]</code> | Merchant-provided offers available for the current order. |


#### GooglePayOfferDetail

| Prop                 | Type                | Description                                |
| -------------------- | ------------------- | ------------------------------------------ |
| **`redemptionCode`** | <code>string</code> | Redemption code that identifies the offer. |
| **`description`**    | <code>string</code> | User-visible description for the offer.    |


#### GooglePayShippingOptionParameters

| Prop                          | Type                                    | Description                                         |
| ----------------------------- | --------------------------------------- | --------------------------------------------------- |
| **`shippingOptions`**         | <code>GooglePaySelectionOption[]</code> | Available shipping options presented to the buyer.  |
| **`defaultSelectedOptionId`** | <code>string</code>                     | Identifier of the default selected shipping option. |


#### GooglePaySelectionOption

| Prop              | Type                | Description                                           |
| ----------------- | ------------------- | ----------------------------------------------------- |
| **`id`**          | <code>string</code> | Unique identifier for the option.                     |
| **`label`**       | <code>string</code> | User-visible label for the option.                    |
| **`description`** | <code>string</code> | Optional secondary description shown under the label. |


#### PluginListenerHandle

| Prop         | Type                                      |
| ------------ | ----------------------------------------- |
| **`remove`** | <code>() =&gt; Promise&lt;void&gt;</code> |


#### GooglePayAuthorizedEvent

| Prop           | Type                                                                      | Description                                           |
| -------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| **`platform`** | <code>'android'</code>                                                    | Platform that emitted the authorized payment payload. |
| **`google`**   | <code><a href="#googlepaypaymentresult">GooglePayPaymentResult</a></code> | Authorized Google Pay payload.                        |


#### GooglePayPaymentResult

| Prop              | Type                                                                  | Description                          |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------ |
| **`paymentData`** | <code><a href="#googlepaypaymentdata">GooglePayPaymentData</a></code> | Payment data returned by Google Pay. |


#### GooglePayPaymentData

| Prop                     | Type                                                                                  | Description                                                    |
| ------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **`apiVersion`**         | <code>number</code>                                                                   | Google Pay API major version returned in the response.         |
| **`apiVersionMinor`**    | <code>number</code>                                                                   | Google Pay API minor version returned in the response.         |
| **`email`**              | <code>string</code>                                                                   | Buyer email address when `emailRequired` was requested.        |
| **`shippingAddress`**    | <code><a href="#googlepayaddress">GooglePayAddress</a></code>                         | Shipping address when `shippingAddressRequired` was requested. |
| **`paymentMethodData`**  | <code><a href="#googlepaypaymentmethoddata">GooglePayPaymentMethodData</a></code>     | Selected payment method details and tokenized payload.         |
| **`offerData`**          | <code><a href="#googlepayofferdata">GooglePayOfferData</a></code>                     | Offer redemption data when an offer was applied.               |
| **`shippingOptionData`** | <code><a href="#googlepayselectionoptiondata">GooglePaySelectionOptionData</a></code> | Selected shipping option data when shipping options were used. |


#### GooglePayAddress

| Prop                            | Type                | Description                                                                         |
| ------------------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| **`name`**                      | <code>string</code> | Recipient or cardholder name.                                                       |
| **`address1`**                  | <code>string</code> | First address line.                                                                 |
| **`address2`**                  | <code>string</code> | Second address line.                                                                |
| **`address3`**                  | <code>string</code> | Third address line.                                                                 |
| **`locality`**                  | <code>string</code> | City or locality.                                                                   |
| **`administrativeArea`**        | <code>string</code> | State, province, or other administrative area.                                      |
| **`countryCode`**               | <code>string</code> | Two-letter ISO 3166-1 alpha-2 country code.                                         |
| **`postalCode`**                | <code>string</code> | Postal or ZIP code.                                                                 |
| **`sortingCode`**               | <code>string</code> | Sorting code used in some countries.                                                |
| **`phoneNumber`**               | <code>string</code> | Phone number returned when it was requested.                                        |
| **`iso3166AdministrativeArea`** | <code>string</code> | ISO 3166-2 code for the administrative area when `FULL-ISO3166` formatting is used. |


#### GooglePayPaymentMethodData

| Prop                   | Type                                                                                                      | Description                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **`type`**             | <code><a href="#googlepaypaymentmethodtype">GooglePayPaymentMethodType</a></code>                         | Payment method type returned by Google Pay.                   |
| **`info`**             | <code><a href="#googlepaycardinfo">GooglePayCardInfo</a></code>                                           | Additional information about the selected card.               |
| **`description`**      | <code>string</code>                                                                                       | User-facing description of the selected funding source.       |
| **`tokenizationData`** | <code><a href="#googlepaypaymentmethodtokenizationdata">GooglePayPaymentMethodTokenizationData</a></code> | Tokenized payment data you send to your backend or processor. |


#### GooglePayCardInfo

| Prop                    | Type                                                                              | Description                                                                        |
| ----------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **`assuranceDetails`**  | <code><a href="#googlepayassurancedetails">GooglePayAssuranceDetails</a></code>   | Optional assurance details returned when `assuranceDetailsRequired` was requested. |
| **`cardNetwork`**       | <code><a href="#googlepaycardnetwork">GooglePayCardNetwork</a></code>             | Card network for the selected payment method.                                      |
| **`cardDetails`**       | <code>string</code>                                                               | Card details, typically the last four digits.                                      |
| **`billingAddress`**    | <code><a href="#googlepayaddress">GooglePayAddress</a></code>                     | Billing address returned when `billingAddressRequired` was requested.              |
| **`cardFundingSource`** | <code><a href="#googlepaycardfundingsource">GooglePayCardFundingSource</a></code> | Funding source for the selected card when available.                               |


#### GooglePayAssuranceDetails

| Prop                          | Type                 | Description                                                                    |
| ----------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| **`accountVerified`**         | <code>boolean</code> | Whether Google verified account possession for the selected card.              |
| **`cardHolderAuthenticated`** | <code>boolean</code> | Whether cardholder authentication or ID&V was completed for the selected card. |


#### GooglePayPaymentMethodTokenizationData

| Prop        | Type                                                                            | Description                                             |
| ----------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **`type`**  | <code><a href="#googlepaytokenizationtype">GooglePayTokenizationType</a></code> | Tokenization type used for the selected payment method. |
| **`token`** | <code>string</code>                                                             | Serialized payment token or gateway payload.            |


#### GooglePayOfferData

| Prop                  | Type                  | Description                                  |
| --------------------- | --------------------- | -------------------------------------------- |
| **`redemptionCodes`** | <code>string[]</code> | Offer redemption codes applied by the buyer. |


#### GooglePaySelectionOptionData

| Prop     | Type                | Description                        |
| -------- | ------------------- | ---------------------------------- |
| **`id`** | <code>string</code> | Identifier of the selected option. |


#### GooglePayCanceledEvent

| Prop                       | Type                    | Description                                                   |
| -------------------------- | ----------------------- | ------------------------------------------------------------- |
| **`platform`**             | <code>'android'</code>  | Platform that emitted the Google Pay event.                   |
| **`statusCode`**           | <code>'CANCELED'</code> | Normalized plugin status code for cancellations.              |
| **`message`**              | <code>string</code>     | Human-readable cancellation message.                          |
| **`reason`**               | <code>'CANCELED'</code> | Normalized cancellation reason.                               |
| **`googleStatusCode`**     | <code>number</code>     | Google Play services status code when Google provided one.    |
| **`googleStatusCodeName`** | <code>string</code>     | Name for the Google Play services status code when available. |
| **`googleStatusMessage`**  | <code>string</code>     | Raw Google status message when available.                     |


#### GooglePayErrorEvent

| Prop                       | Type                                                                              | Description                                                      |
| -------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **`platform`**             | <code>'android'</code>                                                            | Platform that emitted the Google Pay event.                      |
| **`statusCode`**           | <code>'ERROR'</code>                                                              | Normalized plugin status code for Google Pay errors.             |
| **`message`**              | <code>string</code>                                                               | Human-readable error message.                                    |
| **`reason`**               | <code><a href="#googlepaypluginerrorreason">GooglePayPluginErrorReason</a></code> | Normalized plugin reason describing where the failure came from. |
| **`googleStatusCode`**     | <code>number</code>                                                               | Google Play services status code when Google provided one.       |
| **`googleStatusCodeName`** | <code>string</code>                                                               | Name for the Google Play services status code when available.    |
| **`googleStatusMessage`**  | <code>string</code>                                                               | Raw Google status message when available.                        |
| **`resolvable`**           | <code>boolean</code>                                                              | Whether Google Play services reported the error as resolvable.   |


### Type Aliases


#### PayPlatform

<code>'ios' | 'android' | 'web'</code>


#### ApplePayNetwork

<code>'AmEx' | 'amex' | 'Bancomat' | 'Bancontact' | 'PagoBancomat' | 'CarteBancaire' | 'CarteBancaires' | 'CartesBancaires' | 'ChinaUnionPay' | 'Dankort' | 'Discover' | 'discover' | 'Eftpos' | 'Electron' | 'Elo' | 'girocard' | 'Himyan' | 'Interac' | 'iD' | 'Jaywan' | 'JCB' | 'jcb' | 'mada' | 'Maestro' | 'maestro' | 'MasterCard' | 'masterCard' | 'Meeza' | 'Mir' | 'MyDebit' | 'NAPAS' | 'BankAxept' | 'PostFinanceAG' | 'PrivateLabel' | 'QUICPay' | 'Suica' | 'Visa' | 'visa' | 'VPay' | 'vPay'</code>


#### GooglePayEnvironment

<code>'test' | 'production'</code>


#### GooglePayPaymentMethodType

<code>'CARD' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### Record

Construct a type with a set of properties K of type T

<code>{ [P in K]: T; }</code>


#### GooglePayAuthMethod

<code>'PAN_ONLY' | 'CRYPTOGRAM_3DS' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayCardNetwork

<code>'AMEX' | 'DISCOVER' | 'ELECTRON' | 'ELO' | 'ELO_DEBIT' | 'INTERAC' | 'JCB' | 'MAESTRO' | 'MASTERCARD' | 'VISA' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayBillingAddressFormat

<code>'MIN' | 'FULL' | 'FULL-ISO3166' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayTokenizationSpecification

<code><a href="#googlepaygatewaytokenizationspecification">GooglePayGatewayTokenizationSpecification</a> | <a href="#googlepaydirecttokenizationspecification">GooglePayDirectTokenizationSpecification</a> | <a href="#googlepaycustomtokenizationspecification">GooglePayCustomTokenizationSpecification</a></code>


#### GooglePayTokenizationType

<code>'PAYMENT_GATEWAY' | 'DIRECT' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### PayPaymentResult

<code><a href="#applepayrequestpaymentresult">ApplePayRequestPaymentResult</a> | <a href="#googlepayrequestpaymentresult">GooglePayRequestPaymentResult</a></code>


#### ApplePaySummaryItemType

<code>'final' | 'pending'</code>


#### ApplePayMerchantCapability

<code>'3DS' | 'credit' | 'debit' | 'emv'</code>


#### ApplePayContactField

<code>'emailAddress' | 'name' | 'phoneNumber' | 'postalAddress'</code>


#### ApplePayShippingType

<code>'shipping' | 'delivery' | 'servicePickup' | 'storePickup'</code>


#### ApplePayRecurringPaymentIntervalUnit

<code>'day' | 'week' | 'month' | 'year'</code>


#### GooglePayTotalPriceStatus

<code>'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayCheckoutOption

<code>'DEFAULT' | 'COMPLETE_IMMEDIATE_PURCHASE' | 'CONTINUE_TO_REVIEW' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayDisplayItemType

<code>'LINE_ITEM' | 'SUBTOTAL' | 'TAX' | 'DISCOUNT' | 'SHIPPING_OPTION' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayDisplayItemStatus

<code>'FINAL' | 'PENDING' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayShippingAddressFormat

<code>'FULL' | 'FULL-ISO3166' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayCallbackIntent

<code>'OFFER' | 'PAYMENT_AUTHORIZATION' | 'SHIPPING_ADDRESS' | 'SHIPPING_OPTION' | 'PAYMENT_METHOD' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayCardFundingSource

<code>'UNKNOWN' | 'CREDIT' | 'DEBIT' | 'PREPAID' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayPluginErrorReason

<code>'CANCELED' | 'EMPTY_PAYMENT_DATA' | 'GOOGLE_PAY_API_ERROR' | 'NO_RESULT_DATA' | 'PARSE_ERROR' | 'UNEXPECTED_ACTIVITY_RESULT' | 'UNKNOWN' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>

</docgen-api>
