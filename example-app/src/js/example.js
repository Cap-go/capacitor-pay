import { Pay } from '@capgo/capacitor-pay';

const appleAvailabilityInput = document.getElementById('appleAvailability');
const googleAvailabilityInput = document.getElementById('googleAvailability');
const checkAvailabilityButton = document.getElementById('checkAvailabilityButton');

const applePaymentInput = document.getElementById('applePayment');
const googlePaymentInput = document.getElementById('googlePayment');
const requestPaymentButton = document.getElementById('requestPaymentButton');

const statusLine = document.getElementById('statusLine');
const outputLog = document.getElementById('outputLog');

const setStatus = (message) => {
  if (statusLine) {
    statusLine.textContent = `Status: ${message}`;
  }
};

const logResult = (data) => {
  if (outputLog) {
    outputLog.textContent = JSON.stringify(data, null, 2);
  }
};

const parseJsonInput = (inputElement, label) => {
  const raw = inputElement?.value?.trim();
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} JSON invalid: ${message}`);
  }
};

const isPaymentCanceled = (error) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const pluginError = /** @type {{ code?: string; message?: string; data?: { reason?: string } }} */ (error);
  return (
    pluginError.code === 'CANCELED' ||
    pluginError.data?.reason === 'CANCELED' ||
    pluginError.message === 'Payment canceled.'
  );
};

checkAvailabilityButton?.addEventListener('click', async () => {
  try {
    setStatus('Checking availability...');

    const availabilityOptions = {};
    const appleOptions = parseJsonInput(appleAvailabilityInput, 'Apple availability');
    const googleOptions = parseJsonInput(googleAvailabilityInput, 'Google availability');

    if (appleOptions) {
      availabilityOptions.apple = appleOptions;
    }
    if (googleOptions) {
      availabilityOptions.google = googleOptions;
    }

    const args = Object.keys(availabilityOptions).length ? availabilityOptions : undefined;
    const result = await Pay.isPayAvailable(args);
    setStatus('Availability resolved');
    logResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Availability failed: ${message}`);
    logResult({ error: message });
  }
});

requestPaymentButton?.addEventListener('click', async () => {
  try {
    setStatus('Requesting payment...');

    const paymentOptions = {};
    const appleOptions = parseJsonInput(applePaymentInput, 'Apple Pay');
    const googleOptions = parseJsonInput(googlePaymentInput, 'Google Pay');

    if (!appleOptions && !googleOptions) {
      throw new Error('Provide Apple Pay or Google Pay configuration JSON to continue.');
    }

    if (appleOptions) {
      paymentOptions.apple = appleOptions;
    }
    if (googleOptions) {
      paymentOptions.google = googleOptions;
    }

    const result = await Pay.requestPayment(paymentOptions);

    setStatus('Payment authorized');
    logResult({
      phase: 'requestPayment',
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isPaymentCanceled(error)) {
      setStatus('Payment canceled');
      logResult({
        phase: 'requestPayment',
        canceled: true,
        error,
      });
      return;
    }

    setStatus(`Payment failed: ${message}`);
    logResult({ error: message });
  }
});
