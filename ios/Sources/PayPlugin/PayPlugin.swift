import Capacitor
import Contacts
import Foundation
import PassKit

@objc(PayPlugin)
public class PayPlugin: CAPPlugin, CAPBridgedPlugin, PKPaymentAuthorizationControllerDelegate {
    private let PLUGIN_VERSION: String = "7.1.0"
    public let identifier = "PayPlugin"
    public let jsName = "Pay"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isPayAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPayment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPluginVersion", returnType: CAPPluginReturnPromise)
    ]

    private var pendingApplePayCall: CAPPluginCall?
    private var pendingApplePayment: PKPayment?
    private var applePayController: PKPaymentAuthorizationController?

    @objc func isPayAvailable(_ call: CAPPluginCall) {
        let appleOptions = call.getObject("apple") ?? [:]
        let requestedNetworks = networks(from: appleOptions["supportedNetworks"])

        let canMakePayments = PKPaymentAuthorizationController.canMakePayments()
        let canMakePaymentsUsingNetworks: Bool = requestedNetworks.isEmpty
            ? canMakePayments
            : PKPaymentAuthorizationController.canMakePayments(usingNetworks: requestedNetworks)

        let available = canMakePayments && (requestedNetworks.isEmpty ? canMakePayments : canMakePaymentsUsingNetworks)

        call.resolve([
            "available": available,
            "platform": "ios",
            "apple": [
                "canMakePayments": canMakePayments,
                "canMakePaymentsUsingNetworks": canMakePaymentsUsingNetworks
            ]
        ])
    }

    @objc func requestPayment(_ call: CAPPluginCall) {
        if pendingApplePayCall != nil {
            call.reject("Another Apple Pay request is already in progress.")
            return
        }

        guard let appleOptions = call.getObject("apple") else {
            call.reject("Apple Pay configuration is required on iOS.")
            return
        }

        do {
            let request = try buildPaymentRequest(from: appleOptions)

            guard PKPaymentAuthorizationController.canMakePayments() else {
                throw PayPluginError.invalidConfiguration("Apple Pay is not available on this device.")
            }

            if !request.supportedNetworks.isEmpty &&
                !PKPaymentAuthorizationController.canMakePayments(usingNetworks: request.supportedNetworks) {
                throw PayPluginError.invalidConfiguration("None of the requested payment networks are available on this device.")
            }

            pendingApplePayCall = call
            pendingApplePayment = nil

            let controller = PKPaymentAuthorizationController(paymentRequest: request)
            controller.delegate = self
            applePayController = controller

            DispatchQueue.main.async {
                controller.present { presented in
                    if !presented {
                        self.rejectPendingCall("Failed to present Apple Pay sheet.")
                    }
                }
            }
        } catch let error as PayPluginError {
            call.reject(error.localizedDescription)
        } catch {
            call.reject("Failed to configure Apple Pay request.", nil, error)
        }
    }

    // MARK: - PKPaymentAuthorizationControllerDelegate

    public func paymentAuthorizationController(
        _ controller: PKPaymentAuthorizationController,
        didAuthorizePayment payment: PKPayment,
        handler completion: @escaping (PKPaymentAuthorizationResult) -> Void
    ) {
        pendingApplePayment = payment
        completion(PKPaymentAuthorizationResult(status: .success, errors: nil))
    }

    public func paymentAuthorizationControllerDidFinish(_ controller: PKPaymentAuthorizationController) {
        controller.dismiss {
            guard let call = self.pendingApplePayCall else {
                self.cleanupPendingTransaction()
                return
            }

            defer { self.cleanupPendingTransaction() }

            guard let payment = self.pendingApplePayment else {
                call.reject("Payment canceled.")
                return
            }

            do {
                let result = try self.buildApplePayResult(from: payment)
                call.resolve(result)
            } catch {
                call.reject("Failed to serialize Apple Pay result.", nil, error)
            }
        }
    }

    // MARK: - Helpers

    private func buildPaymentRequest(from options: [String: Any]) throws -> PKPaymentRequest {
        guard let merchantIdentifier = options["merchantIdentifier"] as? String, !merchantIdentifier.isEmpty else {
            throw PayPluginError.invalidConfiguration("`merchantIdentifier` is required.")
        }

        guard let countryCode = options["countryCode"] as? String, !countryCode.isEmpty else {
            throw PayPluginError.invalidConfiguration("`countryCode` is required.")
        }

        guard let currencyCode = options["currencyCode"] as? String, !currencyCode.isEmpty else {
            throw PayPluginError.invalidConfiguration("`currencyCode` is required.")
        }

        let summaryItemsRaw = options["paymentSummaryItems"]
        let summaryItems = paymentSummaryItems(from: summaryItemsRaw)
        guard !summaryItems.isEmpty else {
            throw PayPluginError.invalidConfiguration("`paymentSummaryItems` must include at least one item.")
        }

        let supportedNetworksRaw = options["supportedNetworks"]
        let supportedNetworks = networks(from: supportedNetworksRaw)
        guard !supportedNetworks.isEmpty else {
            throw PayPluginError.invalidConfiguration("`supportedNetworks` must include at least one valid network.")
        }

        var merchantCapabilities: PKMerchantCapability = [.capability3DS]
        if let capabilityValues = options["merchantCapabilities"] as? [String] {
            let parsedCapabilities = parseMerchantCapabilities(from: capabilityValues)
            if !parsedCapabilities.isEmpty {
                merchantCapabilities = parsedCapabilities
            }
        }

        var shippingContactFields: Set<PKContactField> = []
        if let fields = options["requiredShippingContactFields"] as? [String] {
            shippingContactFields = parseContactFields(from: fields)
        }

        var billingContactFields: Set<PKContactField> = []
        if let fields = options["requiredBillingContactFields"] as? [String] {
            billingContactFields = parseContactFields(from: fields)
        }

        let paymentRequest = PKPaymentRequest()
        paymentRequest.merchantIdentifier = merchantIdentifier
        paymentRequest.countryCode = countryCode
        paymentRequest.currencyCode = currencyCode
        paymentRequest.paymentSummaryItems = summaryItems
        paymentRequest.supportedNetworks = supportedNetworks
        paymentRequest.merchantCapabilities = merchantCapabilities

        if !shippingContactFields.isEmpty {
            paymentRequest.requiredShippingContactFields = shippingContactFields
        }
        if !billingContactFields.isEmpty {
            paymentRequest.requiredBillingContactFields = billingContactFields
        }

        if let shippingTypeValue = options["shippingType"] as? String,
           let shippingType = parseShippingType(from: shippingTypeValue) {
            paymentRequest.shippingType = shippingType
        }

        if let supportedCountries = options["supportedCountries"] as? [String], !supportedCountries.isEmpty {
            paymentRequest.supportedCountries = Set(supportedCountries)
        }

        if let applicationDataString = options["applicationData"] as? String {
            if let data = Data(base64Encoded: applicationDataString) ?? applicationDataString.data(using: .utf8) {
                paymentRequest.applicationData = data
            }
        }

        return paymentRequest
    }

    private func paymentSummaryItems(from value: Any?) -> [PKPaymentSummaryItem] {
        guard let items = value as? [Any] else {
            return []
        }

        return items.compactMap { rawItem in
            guard let item = rawItem as? [String: Any],
                  let label = item["label"] as? String,
                  let amountString = item["amount"] as? String else {
                return nil
            }

            let amount = NSDecimalNumber(string: amountString)
            if amount == NSDecimalNumber.notANumber {
                return nil
            }
            let summaryItem = PKPaymentSummaryItem(label: label, amount: amount)

            if let typeString = item["type"] as? String {
                switch typeString.lowercased() {
                case "pending":
                    summaryItem.type = .pending
                default:
                    summaryItem.type = .final
                }
            }

            return summaryItem
        }
    }

    private func networks(from value: Any?) -> [PKPaymentNetwork] {
        guard let networkStrings = value as? [Any] else {
            return []
        }

        return networkStrings.compactMap { element in
            if let stringValue = element as? String {
                return PKPaymentNetwork(rawValue: stringValue)
            }
            return nil
        }
    }

    private func parseMerchantCapabilities(from values: [String]) -> PKMerchantCapability {
        var capabilities: PKMerchantCapability = []

        for value in values {
            switch value.lowercased() {
            case "3ds":
                capabilities.insert(.capability3DS)
            case "credit":
                capabilities.insert(.capabilityCredit)
            case "debit":
                capabilities.insert(.capabilityDebit)
            case "emv":
                capabilities.insert(.capabilityEMV)
            default:
                continue
            }
        }

        return capabilities
    }

    private func parseContactFields(from values: [String]) -> Set<PKContactField> {
        var fields = Set<PKContactField>()

        for value in values {
            switch value {
            case "emailAddress":
                fields.insert(.emailAddress)
            case "name":
                fields.insert(.name)
            case "phoneNumber":
                fields.insert(.phoneNumber)
            case "postalAddress":
                fields.insert(.postalAddress)
            default:
                continue
            }
        }

        return fields
    }

    private func parseShippingType(from value: String) -> PKShippingType? {
        switch value {
        case "shipping":
            return .shipping
        case "delivery":
            return .delivery
        case "servicePickup":
            return .servicePickup
        case "storePickup":
            return .storePickup
        default:
            return nil
        }
    }

    private func buildApplePayResult(from payment: PKPayment) throws -> [String: Any] {
        let paymentData = payment.token.paymentData
        let paymentDataBase64 = paymentData.base64EncodedString()
        let paymentString = String(data: paymentData, encoding: .utf8) ?? paymentDataBase64

        var paymentMethod: [String: Any] = [
            "type": mapPaymentMethodType(payment.token.paymentMethod.type)
        ]

        if let displayName = payment.token.paymentMethod.displayName {
            paymentMethod["displayName"] = displayName
        }

        if let network = payment.token.paymentMethod.network {
            paymentMethod["network"] = network.rawValue
        }

        var appleResult: [String: Any] = [
            "paymentData": paymentDataBase64,
            "paymentString": paymentString,
            "transactionIdentifier": payment.token.transactionIdentifier,
            "paymentMethod": paymentMethod
        ]

        if let shippingContact = contactDictionary(from: payment.shippingContact) {
            appleResult["shippingContact"] = shippingContact
        }

        if let billingContact = contactDictionary(from: payment.billingContact) {
            appleResult["billingContact"] = billingContact
        }

        return [
            "platform": "ios",
            "apple": appleResult
        ]
    }

    private func contactDictionary(from contact: PKContact?) -> [String: Any]? {
        guard let contact else {
            return nil
        }

        var result: [String: Any] = [:]

        if let nameComponents = contact.name {
            var name: [String: String] = [:]
            if let givenName = nameComponents.givenName {
                name["givenName"] = givenName
            }
            if let familyName = nameComponents.familyName {
                name["familyName"] = familyName
            }
            if let middleName = nameComponents.middleName {
                name["middleName"] = middleName
            }
            if let namePrefix = nameComponents.namePrefix {
                name["namePrefix"] = namePrefix
            }
            if let nameSuffix = nameComponents.nameSuffix {
                name["nameSuffix"] = nameSuffix
            }
            if let nickname = nameComponents.nickname {
                name["nickname"] = nickname
            }
            if !name.isEmpty {
                result["name"] = name
            }
        }

        if let email = contact.emailAddress {
            result["emailAddress"] = email
        }

        if let phone = contact.phoneNumber?.stringValue {
            result["phoneNumber"] = phone
        }

        if let postal = contact.postalAddress {
            var address: [String: String] = [:]
            if !postal.street.isEmpty {
                address["street"] = postal.street
            }
            if !postal.city.isEmpty {
                address["city"] = postal.city
            }
            if !postal.state.isEmpty {
                address["state"] = postal.state
            }
            if !postal.postalCode.isEmpty {
                address["postalCode"] = postal.postalCode
            }
            if !postal.country.isEmpty {
                address["country"] = postal.country
            }
            if !postal.isoCountryCode.isEmpty {
                address["isoCountryCode"] = postal.isoCountryCode
            }
            if !postal.subAdministrativeArea.isEmpty {
                address["subAdministrativeArea"] = postal.subAdministrativeArea
            }
            if !postal.subLocality.isEmpty {
                address["subLocality"] = postal.subLocality
            }
            if !address.isEmpty {
                result["postalAddress"] = address
            }
        }

        return result.isEmpty ? nil : result
    }

    private func mapPaymentMethodType(_ type: PKPaymentMethodType) -> String {
        switch type {
        case .debit:
            return "debit"
        case .credit:
            return "credit"
        case .prepaid:
            return "prepaid"
        case .store:
            return "store"
        default:
            return "unknown"
        }
    }

    private func rejectPendingCall(_ message: String, error: Error? = nil) {
        guard let call = pendingApplePayCall else {
            return
        }

        if let error {
            call.reject(message, nil, error)
        } else {
            call.reject(message)
        }
        cleanupPendingTransaction()
    }

    private func cleanupPendingTransaction() {
        pendingApplePayCall = nil
        pendingApplePayment = nil
        applePayController?.delegate = nil
        applePayController = nil
    }
}

private enum PayPluginError: LocalizedError {
    case invalidConfiguration(String)

    var errorDescription: String? {
        switch self {
        case let .invalidConfiguration(message):
            return message
        }
    }

    @objc func getPluginVersion(_ call: CAPPluginCall) {
        call.resolve(["version": self.PLUGIN_VERSION])
    }

}
