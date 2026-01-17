# Google Pay Setup Guide

Follow this checklist to enable Google Pay for the Android implementation of `@capgo/capacitor-pay`.

## 1. Requirements

- A Google Play Console account with the correct app package name registered.
- Access to the Google Pay & Wallet Console using the same Google account.
- Android Studio Hedgehog (or newer) with the latest Android SDK tools.
- Test devices running Google Play services.

### Supported card networks
For `allowedCardNetworks` options, the possible values are:
- `AMEX`: American Express card network.
- `DISCOVER`: Discover card network.
- `ELECTRON`: Visa's Electron card network.
  - Note that this option can only be set when `transactionInfo.countryCode` is set to `"BR"`, and `allowedCardNetworks` must also contain `VISA`
  - For processing purposes, you should use this as an indication that the card must be processed through the Electron debit network.
- `ELO`: Elo card network.
  - Note that this option can only be set when `transactionInfo.countryCode` is set to `"BR"`.
- `ELO_DEBIT`: Elo's debit network rail.
  - Note that this option can only be set when `transactionInfo.countryCode` is set to `"BR"`, and `allowedCardNetworks` must also contain `ELO`
  - For processing purposes, you should use this as an indication that the card must be processed through the ELO debit network.
- `INTERAC`: Interac card network.
- `JCB`: JCB card network.
- `MAESTRO`: Maestro card network.
  - Note that this option can only be set when `transactionInfo.countryCode` is set to `"BR"`, and `allowedCardNetworks` must also contain `MASTERCARD`
  - For processing purposes, you should use this as an indication that the card must be processed through the Maestro debit network.
- `MASTERCARD`: Mastercard card network.
- `VISA`: Visa card network.
[Read more about supported card networks in Google Pay.](https://developers.google.com/pay/api/web/reference/request-objects#CardParameters)

## 2. Create a Google Pay business profile

1. Open the [Google Pay & Wallet Console](https://pay.google.com/business/console/).
2. Create or select a business profile that matches your legal entity.
3. Provide the merchant name that will appear in the Google Pay sheet.
4. Verify any requested documentation to enable production processing.

![Google Pay docs header logo](images/google-pay-logo.svg)

## 3. Configure payment processing

Decide between a **gateway** (e.g., Stripe, Adyen, Braintree) or **direct** processor integration:

- For gateway tokenization, collect the `gateway` and `gatewayMerchantId` values.
- For direct tokenization, create and store your public/private key pair and obtain your processor’s parameters.

Document these values because they must be inserted into the `paymentDataRequest.tokenizationSpecification`.

## 4. Register test cards and test users

1. In the Google Pay console, add testing cards or enable the demo cards.
2. On every test device, add one of the sandbox cards to Google Wallet.
3. Install the latest Google Play services if prompted.

## 5. Backend token processing

Handle the encrypted payment data server-side before charging the customer:

- Receive the JSON payload from the `onAuthorized` listener after `Pay.requestPayment`. The `paymentData` object includes the payment method, tokenization type, and gateway payload.
- Forward the payment token to your payment processor's SDK over HTTPS. For gateway integrations, pass the `paymentMethodData.tokenizationSpecification.parameters` unchanged.
- Validate essential fields (transaction amount, currency, merchant identifiers) against your order database before capturing payment.
- Log the Google Pay transaction IDs securely for reconciliation and dispute handling; avoid storing full PAN or raw token data.

## 6. Configure the Android project in Android Studio

1. Open the Android module in Android Studio and make sure the Google Maven repository is available in both the project and app `build.gradle` files.
2. Confirm `com.google.android.gms:play-services-wallet` is present (the plugin adds it by default) and that the Android Gradle Plugin is v8.0 or newer.
3. In `android/app/src/main/AndroidManifest.xml`, set the minimum SDK to 23+ and ensure `uses-permission android:name="android.permission.INTERNET"` is present.
4. If you rely on clear-text HTTP endpoints during development, define a `network_security_config` resource and reference it from the manifest. Production builds should use HTTPS exclusively.
5. Generate a release keystore and upload the SHA-1 certificates for every signing key (debug and release) to the Google Pay business console so request signatures match the client.
6. Clean/rebuild the project to let Gradle register the wallet dependency and verify no build warnings remain.

## 7. Update the Android project

1. Ensure `com.google.android.gms:play-services-wallet` is included in `android/build.gradle` (already added by the plugin).
2. In your app code, build a `paymentDataRequest` JSON matching the processor configuration:
   - `apiVersion` and `apiVersionMinor`
   - `allowedPaymentMethods` with card networks and authentication methods
   - `transactionInfo` containing price, currency, and country
   - `merchantInfo` for user-facing display
3. Provide this JSON to `Pay.requestPayment({ google: { ... } })`.

## 8. Use the correct environment

- During development, set `environment: 'test'` and rely on test card numbers.
- For production builds, switch to `environment: 'production'` and ensure your business profile is approved.

## 9. Add required app manifest entries

Google Pay itself does not require additional manifest permissions beyond Internet access, but your processor may require network security configuration or HTTPS endpoints. Confirm:

- `android:usesCleartextTraffic="false"` (or a network security config for dev environments).
- Any callback URLs you use are served over HTTPS.

## 10. Test on device

1. Build and install the Android app on a device with the sandbox card.
2. Call `Pay.isPayAvailable` with the same `isReadyToPayRequest` JSON you will use in production.
3. Confirm the method returns `available: true` and `google.isReady: true`.
4. Add event listeners for `onAuthorized`, `onCanceled`, and `onError` to handle different Google Pay results.
5. Trigger `Pay.requestPayment` and complete a transaction with a test card.
6. Verify the payment token is received by `onAuthorized` event and can be processed by your backend.

## 11. Launch to production

1. Submit your app for Google Play review with Google Pay screenshots or screen recordings if requested.
2. Promote the business profile to production in the Google Pay & Wallet Console.
3. Make sure you handle all Google Pay events (`onAuthorized` and `onCanceled`) and errors (`onError`) gracefully in your app.
4. Switch the runtime configuration to the production environment and merchant details.

Completing these steps prepares your Android app to process payments through Google Pay using the Capacitor plugin.
