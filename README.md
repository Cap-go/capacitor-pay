# @capgo/capacitor-pay
 <a href="https://capgo.app/"><img src='https://raw.githubusercontent.com/Cap-go/capgo/main/assets/capgo_banner.png' alt='Capgo - Instant updates for capacitor'/></a>

<div align="center">
  <h2><a href="https://capgo.app/?ref=plugin_pay"> ➡️ Get Instant updates for your App with Capgo</a></h2>
  <h2><a href="https://capgo.app/consulting/?ref=plugin_pay"> Missing a feature? We’ll build the plugin for you 💪</a></h2>
</div>

Capacitor plugin to trigger native payments with Apple Pay and Google Pay using a unified JavaScript API.

## Documentation

The most complete doc is available here: https://capgo.app/docs/plugins/pay/

## Compatibility

| Plugin version | Capacitor compatibility | Maintained |
| -------------- | ----------------------- | ---------- |
| v8.\*.\*       | v8.\*.\*                | ✅          |
| v7.\*.\*       | v7.\*.\*                | On demand   |
| v6.\*.\*       | v6.\*.\*                | ❌          |
| v5.\*.\*       | v5.\*.\*                | ❌          |

> **Note:** The major version of this plugin follows the major version of Capacitor. Use the version that matches your Capacitor installation (e.g., plugin v8 for Capacitor 8). Only the latest major version is actively maintained.

## Install

```bash
bun add @capgo/capacitor-pay
bunx cap sync
```

## Platform setup

Before invoking the plugin, complete the native configuration documented in this repository:

- **Apple Pay (iOS):** see [`docs/apple-pay-setup.md`](docs/apple-pay-setup.md) for merchant ID creation, certificates, Xcode entitlements, and device testing.
- **Google Pay (Android):** follow [`docs/google-pay-setup.md`](docs/google-pay-setup.md) to configure the business profile, tokenization settings, and runtime JSON payloads.

Finish both guides once per app to unlock the native payment sheets on devices.

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
  const result = await Pay.requestPayment({
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
  console.log(result.google?.paymentData);
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

const result = await Pay.requestPayment({
  google: {
    environment: 'test',
    paymentDataRequest,
  },
});

// Send `result.google?.paymentData` to your backend and use your PSP to start the subscription.
```

## API

<docgen-index>

* [`isPayAvailable(...)`](#ispayavailable)
* [`requestPayment(...)`](#requestpayment)
* [`getPluginVersion()`](#getpluginversion)
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

| Prop          | Type                 | Description                                                                    |
| ------------- | -------------------- | ------------------------------------------------------------------------------ |
| **`isReady`** | <code>boolean</code> | Indicates whether the Google Pay API is available for the supplied parameters. |


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

Typed helper for the Google Pay `IsReadyToPayRequest` JSON.
The native Android implementation still accepts arbitrary JSON (forward compatible).

| Prop                        | Type                                         | Description                                                  |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| **`allowedPaymentMethods`** | <code>GooglePayAllowedPaymentMethod[]</code> | The list of payment methods you want to check for readiness. |


#### GooglePayAllowedPaymentMethod

| Prop                            | Type                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **`type`**                      | <code>(string & <a href="#record">Record</a>&lt;never, never&gt;) \| 'CARD'</code>                    |
| **`parameters`**                | <code><a href="#googlepaycardpaymentmethodparameters">GooglePayCardPaymentMethodParameters</a></code> |
| **`tokenizationSpecification`** | <code><a href="#googlepaytokenizationspecification">GooglePayTokenizationSpecification</a></code>     |


#### GooglePayCardPaymentMethodParameters

| Prop                           | Type                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| **`allowedAuthMethods`**       | <code>GooglePayAuthMethod[]</code>                                                              |
| **`allowedCardNetworks`**      | <code>GooglePayCardNetwork[]</code>                                                             |
| **`billingAddressRequired`**   | <code>boolean</code>                                                                            |
| **`billingAddressParameters`** | <code><a href="#googlepaybillingaddressparameters">GooglePayBillingAddressParameters</a></code> |


#### GooglePayBillingAddressParameters

| Prop                      | Type                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **`format`**              | <code>'MIN' \| 'FULL' \| (string & <a href="#record">Record</a>&lt;never, never&gt;)</code> |
| **`phoneNumberRequired`** | <code>boolean</code>                                                                        |


#### GooglePayTokenizationSpecification

| Prop             | Type                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| **`type`**       | <code>(string & <a href="#record">Record</a>&lt;never, never&gt;) \| 'PAYMENT_GATEWAY' \| 'DIRECT'</code> |
| **`parameters`** | <code><a href="#record">Record</a>&lt;string, string&gt;</code>                                           |


#### PayPaymentResult

| Prop           | Type                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **`platform`** | <code><a href="#exclude">Exclude</a>&lt;<a href="#payplatform">PayPlatform</a>, 'web'&gt;</code> |
| **`apple`**    | <code><a href="#applepaypaymentresult">ApplePayPaymentResult</a></code>                          |
| **`google`**   | <code><a href="#googlepaypaymentresult">GooglePayPaymentResult</a></code>                        |


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


#### GooglePayPaymentResult

| Prop              | Type                                                             | Description                          |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------ |
| **`paymentData`** | <code><a href="#record">Record</a>&lt;string, unknown&gt;</code> | Payment data returned by Google Pay. |


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

| Prop                | Type                                                                                                  | Description                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **`intervalUnit`**  | <code><a href="#applepayrecurringpaymentintervalunit">ApplePayRecurringPaymentIntervalUnit</a></code> | Unit of time between recurring payments.                                                      |
| **`intervalCount`** | <code>number</code>                                                                                   | Number of `intervalUnit` units between recurring payments (for example `1` month, `2` weeks). |
| **`startDate`**     | <code>number</code>                                                                                   | Start date of the recurring period, expressed as milliseconds since Unix epoch.               |
| **`endDate`**       | <code>number</code>                                                                                   | End date of the recurring period, expressed as milliseconds since Unix epoch.                 |


#### GooglePayPaymentOptions

| Prop                     | Type                                                                                | Description                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **`environment`**        | <code><a href="#googlepayenvironment">GooglePayEnvironment</a></code>               | Environment used to construct the Google Payments client. Defaults to `'test'`.                                                          |
| **`paymentDataRequest`** | <code><a href="#googlepaypaymentdatarequest">GooglePayPaymentDataRequest</a></code> | Raw `PaymentDataRequest` JSON as defined by the Google Pay API. Provide transaction details, merchant info, and tokenization parameters. |


#### GooglePayPaymentDataRequest

Typed helper for the Google Pay `PaymentDataRequest` JSON.
The native Android implementation still accepts arbitrary JSON (forward compatible).

| Prop                        | Type                                                                          | Description                                             |
| --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| **`apiVersion`**            | <code>number</code>                                                           | Google Pay API version, typically `2`.                  |
| **`apiVersionMinor`**       | <code>number</code>                                                           | Google Pay API minor version, typically `0`.            |
| **`allowedPaymentMethods`** | <code>GooglePayAllowedPaymentMethod[]</code>                                  | Allowed payment method configurations.                  |
| **`merchantInfo`**          | <code><a href="#googlepaymerchantinfo">GooglePayMerchantInfo</a></code>       | Merchant information displayed in the Google Pay sheet. |
| **`transactionInfo`**       | <code><a href="#googlepaytransactioninfo">GooglePayTransactionInfo</a></code> | Transaction details (amount, currency, etc).            |


#### GooglePayMerchantInfo

| Prop               | Type                |
| ------------------ | ------------------- |
| **`merchantId`**   | <code>string</code> |
| **`merchantName`** | <code>string</code> |


#### GooglePayTransactionInfo

| Prop                   | Type                                                                            |
| ---------------------- | ------------------------------------------------------------------------------- |
| **`totalPriceStatus`** | <code><a href="#googlepaytotalpricestatus">GooglePayTotalPriceStatus</a></code> |
| **`totalPrice`**       | <code>string</code>                                                             |
| **`currencyCode`**     | <code>string</code>                                                             |
| **`countryCode`**      | <code>string</code>                                                             |


### Type Aliases


#### PayPlatform

<code>'ios' | 'android' | 'web'</code>


#### ApplePayNetwork

<code>'AmEx' | 'amex' | 'Bancomat' | 'Bancontact' | 'PagoBancomat' | 'CarteBancaire' | 'CarteBancaires' | 'CartesBancaires' | 'ChinaUnionPay' | 'Dankort' | 'Discover' | 'discover' | 'Eftpos' | 'Electron' | 'Elo' | 'girocard' | 'Himyan' | 'Interac' | 'iD' | 'Jaywan' | 'JCB' | 'jcb' | 'mada' | 'Maestro' | 'maestro' | 'MasterCard' | 'masterCard' | 'Meeza' | 'Mir' | 'MyDebit' | 'NAPAS' | 'BankAxept' | 'PostFinanceAG' | 'PrivateLabel' | 'QUICPay' | 'Suica' | 'Visa' | 'visa' | 'VPay' | 'vPay'</code>


#### GooglePayEnvironment

<code>'test' | 'production'</code>


#### Record

Construct a type with a set of properties K of type T

<code>{ [P in K]: T; }</code>


#### GooglePayAuthMethod

<code>'PAN_ONLY' | 'CRYPTOGRAM_3DS' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### GooglePayCardNetwork

<code>'AMEX' | 'DISCOVER' | 'JCB' | 'MASTERCARD' | 'VISA' | (string & <a href="#record">Record</a>&lt;never, never&gt;)</code>


#### Exclude

<a href="#exclude">Exclude</a> from T those types that are assignable to U

<code>T extends U ? never : T</code>


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

</docgen-api>
