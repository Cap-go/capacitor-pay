package app.capgo.pay;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.ResolvableApiException;
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

    private final String pluginVersion = "8.0.6";

    private boolean paymentInProgress = false;
    private boolean resolutionInProgress = false;
    private ActivityResultLauncher<IntentSenderRequest> googlePayLauncher;
    private PaymentsClient paymentsClient;
    private int lastEnv = -1;

    @Override
    public void load() {
        this.ensureLauncher();
    }

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
        if (this.paymentInProgress) {
            call.reject("Another Google Pay request is already in progress.");
            return;
        }

        if (!ensureLauncher()) {
            call.reject("No active activity to start Google Pay.");
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
            this.paymentInProgress = true;
            client.loadPaymentData(request).addOnSuccessListener(this::emitAuthorized).addOnFailureListener(this::emitError);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Failed to launch Google Pay.", ex);
        }
    }

    private boolean ensureLauncher() {
        if (googlePayLauncher != null) return true;

        AppCompatActivity activity = getActivity();
        if (activity == null) {
            return false;
        }

        googlePayLauncher = activity.registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            this::handleGooglePayResult
        );
        return true;
    }

    private void handleGooglePayResult(ActivityResult activityResult) {
        resolutionInProgress = false;
        paymentInProgress = false; // important: user interaction ended

        int resultCode = activityResult.getResultCode();
        Intent data = activityResult.getData();

        Logger.debug("PayPlugin", "GooglePay resultCode=" + resultCode);

        if (resultCode == Activity.RESULT_OK) {
            emitAuthorizedFromIntent(data);
            return;
        }

        if (resultCode == Activity.RESULT_CANCELED) {
            this.emitCancel();
            return;
        }

        String message = "Google Pay returned unexpected result code: " + resultCode;
        if (resultCode == AutoResolveHelper.RESULT_ERROR) {
            Status status = AutoResolveHelper.getStatusFromIntent(data);
            message = (status != null && status.getStatusMessage() != null)
                    ? status.getStatusMessage()
                    : "Google Pay returned an error.";
        }

        Exception ex = new Exception(message);
        this.emitError(ex);
    }

    private void emitAuthorizedFromIntent(Intent data) {
        if (data == null) {
            Exception ex = new Exception("Google Pay returned no data.");
            this.emitError(ex);
            return;
        }

        PaymentData paymentData = PaymentData.getFromIntent(data);
        if (paymentData == null) {
            Exception ex = new Exception("Google Pay returned empty payment data.");
            this.emitError(ex);
            return;
        }

        emitAuthorized(paymentData);
    }

    private void emitAuthorized(PaymentData paymentData) {
        try {
            String json = paymentData.toJson();
            JSONObject paymentDataJson = new JSONObject(json);

            JSObject googleResult = new JSObject();
            googleResult.put("paymentData", JSObject.fromJSONObject(paymentDataJson));

            JSObject result = new JSObject();
            result.put("platform", "android");
            result.put("google", googleResult);

            Logger.debug("PayPlugin", "Payment authorized");
            notifyListeners("onAuthorized", result, true);

            this.paymentInProgress = false;
        } catch (JSONException ex) {
            this.emitError(ex);
        }
    }

    private void emitError(Exception ex) {
        if (ex instanceof ResolvableApiException rae) {
            if (this.resolutionInProgress) {
                // don't relaunch; treat as error
                this.resolutionInProgress = false;
            } else {
                this.resolutionInProgress = true;
                IntentSenderRequest isr = new IntentSenderRequest.Builder(rae.getResolution()).build();
                googlePayLauncher.launch(isr);
                return;
            }
        }

        this.paymentInProgress = false;
        this.resolutionInProgress = false;

        JSObject error = new JSObject();
        String message = ex.getMessage() != null ? ex.getMessage() : "Google Pay failed.";

        if (ex instanceof JSONException) {
            message = "Failed to parse Google Pay result.";
        }

        error.put("message", message);
        error.put("platform", "android");
        error.put("statusCode", "ERROR");

        Logger.error("PayPlugin", message, ex);
        notifyListeners("onError", error, true);
    }

    private void emitCancel() {
        this.paymentInProgress = false;
        JSObject result = new JSObject();
        String message = "Payment canceled";
        result.put("message", message);
        result.put("platform", "android");
        result.put("statusCode", "CANCELED");

        Logger.debug("PayPlugin", message);
        notifyListeners("onCanceled", result, true);
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
        if (paymentsClient == null || lastEnv != environment) {
            Wallet.WalletOptions options = new Wallet.WalletOptions.Builder().setEnvironment(environment).build();
            paymentsClient = Wallet.getPaymentsClient(getContext(), options);
            lastEnv = environment;
        }
        return paymentsClient;
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
