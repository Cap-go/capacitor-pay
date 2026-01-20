package app.capgo.pay;

import android.app.Activity;
import android.content.Intent;
import androidx.annotation.Nullable;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Status;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.wallet.AutoResolveHelper;
import com.google.android.gms.wallet.IsReadyToPayRequest;
import com.google.android.gms.wallet.PaymentData;
import com.google.android.gms.wallet.PaymentDataRequest;
import com.google.android.gms.wallet.PaymentsClient;
import com.google.android.gms.wallet.Wallet;
import com.google.android.gms.wallet.WalletConstants;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "Pay")
public class PayPlugin extends Plugin {

    private final String pluginVersion = "8.0.7";

    private static final int LOAD_PAYMENT_DATA_REQUEST_CODE = 8001;

    private PluginCall pendingPaymentCall;

    @PluginMethod
    public void isPayAvailable(PluginCall call) {
        JSObject googleOptions = call.getObject("google");
        int environment = parseEnvironment(googleOptions != null ? googleOptions.getString("environment", "test") : "test");

        JSONObject requestJson;
        try {
            requestJson = getIsReadyToPayRequest(googleOptions);
        } catch (JSONException ex) {
            call.reject("Invalid Google Pay `isReadyToPayRequest`.", ex);
            return;
        }

        if (requestJson == null) {
            JSObject result = buildAvailabilityResult(false);
            call.resolve(result);
            return;
        }

        PaymentsClient client = createPaymentsClient(environment);

        try {
            IsReadyToPayRequest request = IsReadyToPayRequest.fromJson(requestJson.toString());
            Task<Boolean> readyTask = client.isReadyToPay(request);
            readyTask.addOnCompleteListener((task) -> {
                boolean isReady = false;
                if (task.isSuccessful()) {
                    Boolean value = task.getResult();
                    isReady = value != null && value;
                } else {
                    Exception exception = task.getException();
                    if (exception instanceof ApiException) {
                        Logger.debug("PayPlugin", "Google Pay isReadyToPay ApiException: " + exception.getLocalizedMessage());
                    } else if (exception != null) {
                        Logger.debug("PayPlugin", "Google Pay isReadyToPay error: " + exception.getLocalizedMessage());
                    }
                }

                JSObject result = buildAvailabilityResult(isReady);
                call.resolve(result);
            });
        } catch (Exception ex) {
            call.reject("Failed to check Google Pay availability.", ex);
        }
    }

    @PluginMethod
    public void requestPayment(PluginCall call) {
        if (pendingPaymentCall != null) {
            call.reject("Another Google Pay request is already in progress.");
            return;
        }

        JSObject googleOptions = call.getObject("google");
        if (googleOptions == null) {
            call.reject("Google Pay configuration is required on Android.");
            return;
        }

        JSObject paymentDataRequestObj = googleOptions.getJSObject("paymentDataRequest");

        if (paymentDataRequestObj == null || paymentDataRequestObj.length() == 0) {
            call.reject("`paymentDataRequest` is required.");
            return;
        }

        int environment = parseEnvironment(googleOptions.getString("environment", "test"));
        PaymentsClient client = createPaymentsClient(environment);

        JSONObject paymentRequestJson;
        try {
            paymentRequestJson = new JSONObject(paymentDataRequestObj.toString());
        } catch (JSONException ex) {
            call.reject("Invalid `paymentDataRequest`.", ex);
            return;
        }

        try {
            PaymentDataRequest request = PaymentDataRequest.fromJson(paymentRequestJson.toString());
            if (request == null) {
                call.reject("Invalid `paymentDataRequest`.");
                return;
            }

            pendingPaymentCall = call;
            Task<PaymentData> task = client.loadPaymentData(request);
            Activity activity = getActivity();
            if (activity == null) {
                pendingPaymentCall = null;
                call.reject("No active activity to present Google Pay.");
                return;
            }
            AutoResolveHelper.resolveTask(task, activity, LOAD_PAYMENT_DATA_REQUEST_CODE);
        } catch (Exception ex) {
            pendingPaymentCall = null;
            call.reject("Failed to launch Google Pay.", ex);
        }
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        if (requestCode != LOAD_PAYMENT_DATA_REQUEST_CODE) {
            return;
        }

        if (pendingPaymentCall == null) {
            return;
        }

        PluginCall call = pendingPaymentCall;
        pendingPaymentCall = null;

        if (resultCode == Activity.RESULT_OK) {
            if (data == null) {
                call.reject("Google Pay returned no data.");
                return;
            }

            PaymentData paymentData = PaymentData.getFromIntent(data);
            if (paymentData == null) {
                call.reject("Google Pay returned empty payment data.");
                return;
            }

            try {
                String json = paymentData.toJson();
                JSONObject paymentDataJson = json != null ? new JSONObject(json) : new JSONObject();
                JSObject googleResult = new JSObject();
                googleResult.put("paymentData", JSObject.fromJSONObject(paymentDataJson));

                JSObject result = new JSObject();
                result.put("platform", "android");
                result.put("google", googleResult);

                call.resolve(result);
            } catch (JSONException ex) {
                call.reject("Failed to parse Google Pay result.", ex);
            }
        } else if (resultCode == Activity.RESULT_CANCELED) {
            call.reject("Payment canceled.");
        } else if (resultCode == AutoResolveHelper.RESULT_ERROR) {
            Status status = AutoResolveHelper.getStatusFromIntent(data);
            String message = status != null && status.getStatusMessage() != null
                ? status.getStatusMessage()
                : "Google Pay returned an error.";
            call.reject(message);
        } else {
            call.reject("Unexpected activity result: " + resultCode);
        }
    }

    private JSObject buildAvailabilityResult(boolean isReady) {
        JSObject google = new JSObject();
        google.put("isReady", isReady);

        JSObject result = new JSObject();
        result.put("available", isReady);
        result.put("platform", "android");
        result.put("google", google);

        return result;
    }

    private PaymentsClient createPaymentsClient(int environment) {
        Wallet.WalletOptions options = new Wallet.WalletOptions.Builder().setEnvironment(environment).build();
        return Wallet.getPaymentsClient(getContext(), options);
    }

    private int parseEnvironment(@Nullable String environment) {
        if (environment != null && environment.equalsIgnoreCase("production")) {
            return WalletConstants.ENVIRONMENT_PRODUCTION;
        }
        return WalletConstants.ENVIRONMENT_TEST;
    }

    @Nullable
    private JSONObject getIsReadyToPayRequest(@Nullable JSObject googleOptions) throws JSONException {
        if (googleOptions != null) {
            JSObject requestObj = googleOptions.getJSObject("isReadyToPayRequest");
            if (requestObj != null && requestObj.length() > 0) {
                return new JSONObject(requestObj.toString());
            }
        }
        return GooglePayRequestFactory.defaultIsReadyToPayRequest();
    }

    private static final class GooglePayRequestFactory {

        private static JSONObject defaultIsReadyToPayRequest() throws JSONException {
            JSONObject cardPaymentMethod = new JSONObject();
            cardPaymentMethod.put("type", "CARD");

            JSONObject parameters = new JSONObject();
            parameters.put("allowedAuthMethods", new JSONArray().put("PAN_ONLY").put("CRYPTOGRAM_3DS"));
            parameters.put("allowedCardNetworks", new JSONArray().put("AMEX").put("DISCOVER").put("MASTERCARD").put("VISA"));
            cardPaymentMethod.put("parameters", parameters);

            JSONObject request = new JSONObject();
            request.put("allowedPaymentMethods", new JSONArray().put(cardPaymentMethod));

            return request;
        }
    }

    @PluginMethod
    public void getPluginVersion(final PluginCall call) {
        try {
            final JSObject ret = new JSObject();
            ret.put("version", this.pluginVersion);
            call.resolve(ret);
        } catch (final Exception e) {
            call.reject("Could not get plugin version", e);
        }
    }
}
