import Capacitor
import Contacts
import Foundation
import PassKit

@objc(PayPlugin)
public class PayPlugin: CAPPlugin, CAPBridgedPlugin, PKPaymentAuthorizationControllerDelegate {
    private let pluginVersion: String = "8.1.24"
    public let identifier = "PayPlugin"
    public let jsName = "Pay"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isPayAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPayment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateApplePayShipping", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPluginVersion", returnType: CAPPluginReturnPromise)
    ]

    private let shippingContactSelectedEvent = "applePayShippingContactSelected"
    private let shippingMethodSelectedEvent = "applePayShippingMethodSelected"
    private let shippingUpdateTimeout: TimeInterval = 20
    private let shippingMethodListenerRequired =
        "Listen to `applePayShippingMethodSelected` when `shippingMethods` have different amounts."

    private var pendingApplePayCall: CAPPluginCall?
    private var pendingApplePayment: PKPayment?
    private var applePayController: PKPaymentAuthorizationController?
    private var currentSummaryItems: [PKPaymentSummaryItem] = []
    private var currentShippingMethods: [PKShippingMethod] = []
    private var pendingShippingSelectionId: String?
    private var pendingShippingContactUpdate: ((PKPaymentRequestShippingContactUpdate) -> Void)?
    private var pendingShippingMethodUpdate: ((PKPaymentRequestShippingMethodUpdate) -> Void)?
    private var shippingUpdateTimeoutWorkItem: DispatchWorkItem?

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
            currentSummaryItems = request.paymentSummaryItems
            currentShippingMethods = request.shippingMethods ?? []

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

    public func paymentAuthorizationController(
        _ controller: PKPaymentAuthorizationController,
        didSelectShippingContact contact: PKContact,
        handler completion: @escaping (PKPaymentRequestShippingContactUpdate) -> Void
    ) {
        guard hasListeners(shippingContactSelectedEvent) else {
            completion(PKPaymentRequestShippingContactUpdate(
                errors: nil,
                paymentSummaryItems: currentSummaryItems,
                shippingMethods: currentShippingMethods
            ))
            return
        }

        pendingShippingContactUpdate = completion
        startShippingSelection(event: shippingContactSelectedEvent, data: contactDictionary(from: contact) ?? [:])
    }

    public func paymentAuthorizationController(
        _ controller: PKPaymentAuthorizationController,
        didSelectShippingMethod shippingMethod: PKShippingMethod,
        handler completion: @escaping (PKPaymentRequestShippingMethodUpdate) -> Void
    ) {
        guard hasListeners(shippingMethodSelectedEvent) else {
            completion(PKPaymentRequestShippingMethodUpdate(paymentSummaryItems: currentSummaryItems))
            return
        }

        pendingShippingMethodUpdate = completion
        startShippingSelection(event: shippingMethodSelectedEvent, data: shippingMethodDictionary(from: shippingMethod))
    }

    @objc func updateApplePayShipping(_ call: CAPPluginCall) {
        guard let selectionId = call.getString("selectionId") else {
            call.reject("`selectionId` is required.")
            return
        }

        let summaryItems = paymentSummaryItems(from: call.getArray("paymentSummaryItems"))
        guard !summaryItems.isEmpty else {
            call.reject("`paymentSummaryItems` must include at least one item.")
            return
        }

        let shippingMethodsValue = call.getArray("shippingMethods")
        let hasShippingMethods = shippingMethodsValue != nil
        let shippingMethods: [PKShippingMethod]
        do {
            shippingMethods = try validatedShippingMethods(from: shippingMethodsValue)
        } catch {
            call.reject(error.localizedDescription)
            return
        }

        DispatchQueue.main.async {
            guard selectionId == self.pendingShippingSelectionId else {
                call.reject("No Apple Pay shipping selection is waiting for this update.")
                return
            }

            let contactCompletion = self.pendingShippingContactUpdate
            let methodCompletion = self.pendingShippingMethodUpdate
            self.clearPendingShippingSelection()
            self.currentSummaryItems = summaryItems
            if hasShippingMethods {
                self.currentShippingMethods = shippingMethods
            }

            if let completion = contactCompletion {
                let errors = hasShippingMethods && shippingMethods.isEmpty
                    ? [PKPaymentRequest.paymentShippingAddressUnserviceableError(withLocalizedDescription: nil)]
                    : nil
                completion(PKPaymentRequestShippingContactUpdate(
                    errors: errors,
                    paymentSummaryItems: summaryItems,
                    shippingMethods: self.currentShippingMethods
                ))
            } else if let completion = methodCompletion {
                let update = PKPaymentRequestShippingMethodUpdate(paymentSummaryItems: summaryItems)
                if hasShippingMethods {
                    update.shippingMethods = shippingMethods
                }
                completion(update)
            }

            call.resolve()
        }
    }

    private func startShippingSelection(event: String, data: [String: Any]) {
        let selectionId = UUID().uuidString
        pendingShippingSelectionId = selectionId

        shippingUpdateTimeoutWorkItem?.cancel()
        let timeout = DispatchWorkItem { [weak self] in
            self?.failShippingSelection(selectionId)
        }
        shippingUpdateTimeoutWorkItem = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + shippingUpdateTimeout, execute: timeout)

        var eventData = data
        eventData["selectionId"] = selectionId
        notifyListeners(event, data: eventData)
    }

    private func failShippingSelection(_ selectionId: String) {
        guard selectionId == pendingShippingSelectionId else {
            return
        }

        let contactCompletion = pendingShippingContactUpdate
        let methodCompletion = pendingShippingMethodUpdate
        clearPendingShippingSelection()

        if let completion = contactCompletion {
            completion(PKPaymentRequestShippingContactUpdate(
                errors: [PKPaymentRequest.paymentShippingAddressUnserviceableError(withLocalizedDescription: nil)],
                paymentSummaryItems: currentSummaryItems,
                shippingMethods: currentShippingMethods
            ))
        } else if let completion = methodCompletion {
            let update = PKPaymentRequestShippingMethodUpdate(paymentSummaryItems: currentSummaryItems)
            update.status = .failure
            completion(update)
        }
    }

    private func clearPendingShippingSelection() {
        shippingUpdateTimeoutWorkItem?.cancel()
        shippingUpdateTimeoutWorkItem = nil
        pendingShippingSelectionId = nil
        pendingShippingContactUpdate = nil
        pendingShippingMethodUpdate = nil
    }

    private func validatedShippingMethods(from value: Any?) throws -> [PKShippingMethod] {
        let shippingMethods = try parseShippingMethods(from: value)
        guard let firstAmount = shippingMethods.first?.amount, !hasListeners(shippingMethodSelectedEvent) else {
            return shippingMethods
        }

        if shippingMethods.contains(where: { $0.amount.compare(firstAmount) != .orderedSame }) {
            throw PayPluginError.invalidConfiguration(shippingMethodListenerRequired)
        }

        return shippingMethods
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

        let shippingMethods = try validatedShippingMethods(from: options["shippingMethods"])
        if !shippingMethods.isEmpty {
            paymentRequest.shippingMethods = shippingMethods
        }

        if let supportedCountries = options["supportedCountries"] as? [String], !supportedCountries.isEmpty {
            paymentRequest.supportedCountries = Set(supportedCountries)
        }

        if let applicationDataString = options["applicationData"] as? String {
            if let data = Data(base64Encoded: applicationDataString) ?? applicationDataString.data(using: .utf8) {
                paymentRequest.applicationData = data
            }
        }

        if let recurringOptions = options["recurringPaymentRequest"] as? [String: Any] {
            if #available(iOS 16.0, *) {
                paymentRequest.recurringPaymentRequest = try buildRecurringPaymentRequest(from: recurringOptions)
            } else {
                throw PayPluginError.invalidConfiguration("`recurringPaymentRequest` requires iOS 16 or later.")
            }
        }

        return paymentRequest
    }

    @available(iOS 16.0, *)
    /// Builds a PassKit recurring payment request (`PKRecurringPaymentRequest`) from the JS options object.
    private func buildRecurringPaymentRequest(from options: [String: Any]) throws -> PKRecurringPaymentRequest {
        guard let paymentDescription = options["paymentDescription"] as? String, !paymentDescription.isEmpty else {
            throw PayPluginError.invalidConfiguration("`recurringPaymentRequest.paymentDescription` is required.")
        }

        let regularBilling = try recurringPaymentSummaryItem(from: options["regularBilling"], fieldName: "recurringPaymentRequest.regularBilling")

        guard let managementURLString = options["managementURL"] as? String,
              let managementURL = URL(string: managementURLString) else {
            throw PayPluginError.invalidConfiguration("`recurringPaymentRequest.managementURL` must be a valid URL string.")
        }

        let recurringRequest = PKRecurringPaymentRequest(
            paymentDescription: paymentDescription,
            regularBilling: regularBilling,
            managementURL: managementURL
        )

        if let billingAgreement = options["billingAgreement"] as? String, !billingAgreement.isEmpty {
            recurringRequest.billingAgreement = billingAgreement
        }

        if let tokenNotificationURLValue = options["tokenNotificationURL"] {
            guard let tokenNotificationURLString = tokenNotificationURLValue as? String,
                  let tokenNotificationURL = URL(string: tokenNotificationURLString) else {
                throw PayPluginError.invalidConfiguration(
                    "`recurringPaymentRequest.tokenNotificationURL` must be a valid URL string when provided."
                )
            }
            recurringRequest.tokenNotificationURL = tokenNotificationURL
        }

        if let trialBillingRaw = options["trialBilling"] {
            recurringRequest.trialBilling = try recurringPaymentSummaryItem(
                from: trialBillingRaw,
                fieldName: "recurringPaymentRequest.trialBilling"
            )
        }

        return recurringRequest
    }

    @available(iOS 16.0, *)
    /// Parses and validates a recurring payment summary item (regular or trial billing).
    private func recurringPaymentSummaryItem(from value: Any?, fieldName: String) throws -> PKRecurringPaymentSummaryItem {
        guard let rawItem = value as? [String: Any],
              let label = rawItem["label"] as? String,
              let amountString = rawItem["amount"] as? String else {
            throw PayPluginError.invalidConfiguration("`\(fieldName)` must include `label` and `amount`.")
        }

        let amount = NSDecimalNumber(string: amountString)
        if amount == NSDecimalNumber.notANumber {
            throw PayPluginError.invalidConfiguration("`\(fieldName).amount` must be a valid decimal string.")
        }

        let item = PKRecurringPaymentSummaryItem(label: label, amount: amount)

        if let typeString = rawItem["type"] as? String {
            switch typeString.lowercased() {
            case "pending":
                item.type = .pending
            default:
                item.type = .final
            }
        }

        if let intervalUnitRaw = rawItem["intervalUnit"] ?? rawItem["recurringPaymentIntervalUnit"],
           let intervalUnit = parseRecurringIntervalUnit(from: intervalUnitRaw) {
            item.intervalUnit = intervalUnit
        } else {
            throw PayPluginError.invalidConfiguration("`\(fieldName).intervalUnit` is required.")
        }

        if let intervalCountRaw = rawItem["intervalCount"] ?? rawItem["recurringPaymentIntervalCount"] {
            if let intervalCount = parseInt(from: intervalCountRaw), intervalCount > 0 {
                item.intervalCount = intervalCount
            } else {
                throw PayPluginError.invalidConfiguration("`\(fieldName).intervalCount` must be a positive integer.")
            }
        } else {
            throw PayPluginError.invalidConfiguration("`\(fieldName).intervalCount` is required.")
        }

        if let startDateRaw = rawItem["startDate"] ?? rawItem["recurringPaymentStartDate"] {
            guard let startDate = parseDate(from: startDateRaw) else {
                throw PayPluginError.invalidConfiguration("`\(fieldName).startDate` must be a valid date.")
            }
            item.startDate = startDate
        }

        if let endDateRaw = rawItem["endDate"] ?? rawItem["recurringPaymentEndDate"] {
            guard let endDate = parseDate(from: endDateRaw) else {
                throw PayPluginError.invalidConfiguration("`\(fieldName).endDate` must be a valid date.")
            }
            item.endDate = endDate
        }

        return item
    }

    @available(iOS 16.0, *)
    /// Maps string values used by Apple Pay on the Web to `NSCalendar.Unit` values required by PassKit.
    private func parseRecurringIntervalUnit(from value: Any) -> NSCalendar.Unit? {
        guard let stringValue = value as? String else {
            return nil
        }

        switch stringValue.lowercased() {
        case "day":
            return .day
        case "week":
            return .weekOfYear
        case "month":
            return .month
        case "year":
            return .year
        default:
            return nil
        }
    }

    /// Parses a positive integer from common JS number representations.
    private func parseInt(from value: Any) -> Int? {
        if let intValue = value as? Int {
            return intValue
        }
        if let doubleValue = value as? Double {
            guard doubleValue.isFinite,
                  doubleValue.rounded() == doubleValue,
                  doubleValue >= Double(Int.min),
                  doubleValue <= Double(Int.max) else {
                return nil
            }
            return Int(doubleValue)
        }
        if let stringValue = value as? String {
            return Int(stringValue)
        }
        return nil
    }

    /// Parses a date from a JS value.
    /// - For numbers, expects **milliseconds since Unix epoch**.
    /// - For strings, accepts ISO 8601 and `yyyy-MM-dd` (UTC) formats.
    private func parseDate(from value: Any) -> Date? {
        if let doubleValue = value as? Double {
            return parseDate(fromUnixNumeric: doubleValue)
        }
        if let intValue = value as? Int {
            return parseDate(fromUnixNumeric: Double(intValue))
        }
        if let stringValue = value as? String {
            let iso = ISO8601DateFormatter()
            if let parsed = iso.date(from: stringValue) {
                return parsed
            }

            // Common "YYYY-MM-DD" input used by Apple Pay examples.
            let df = DateFormatter()
            df.locale = Locale(identifier: "en_US_POSIX")
            df.timeZone = TimeZone(secondsFromGMT: 0)
            df.dateFormat = "yyyy-MM-dd"
            return df.date(from: stringValue)
        }

        return nil
    }

    /// Parses a numeric date as **milliseconds since Unix epoch** (per the public TS contract).
    private func parseDate(fromUnixNumeric value: Double) -> Date? {
        guard value.isFinite else {
            return nil
        }
        return Date(timeIntervalSince1970: value / 1000.0)
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
                return PKPaymentNetwork(rawValue: normalizePaymentNetwork(stringValue))
            }
            return nil
        }
    }

    private func normalizePaymentNetwork(_ value: String) -> String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        let key = trimmed.lowercased()

        // Accept common Apple Pay on the Web identifiers too.
        // PassKit network raw values are case-sensitive (for example "Visa", "MasterCard", "AmEx").
        switch key {
        case "visa":
            return PKPaymentNetwork.visa.rawValue
        case "mastercard":
            return PKPaymentNetwork.masterCard.rawValue
        case "amex":
            return PKPaymentNetwork.amex.rawValue
        case "discover":
            return PKPaymentNetwork.discover.rawValue
        case "jcb":
            return PKPaymentNetwork.JCB.rawValue
        case "vpay":
            return PKPaymentNetwork.vPay.rawValue
        case "maestro":
            return PKPaymentNetwork.maestro.rawValue
        case "girocard":
            return PKPaymentNetwork.girocard.rawValue
        case "mada":
            return PKPaymentNetwork.mada.rawValue
        default:
            return trimmed
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

        if let shippingMethod = payment.shippingMethod {
            appleResult["shippingMethod"] = shippingMethodDictionary(from: shippingMethod)
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
        currentSummaryItems = []
        currentShippingMethods = []
        clearPendingShippingSelection()
    }

    private func parseShippingMethods(from value: Any?) throws -> [PKShippingMethod] {
        guard let methods = value as? [Any] else {
            return []
        }

        return try methods.map { rawMethod in
            guard let method = rawMethod as? [String: Any],
                  let identifier = method["identifier"] as? String,
                  let label = method["label"] as? String,
                  let amountString = method["amount"] as? String else {
                throw PayPluginError.invalidConfiguration("Each shipping method must include `identifier`, `label` and `amount`.")
            }

            let amount = NSDecimalNumber(string: amountString)
            if amount == NSDecimalNumber.notANumber {
                throw PayPluginError.invalidConfiguration("Shipping method `amount` must be a valid decimal string.")
            }

            let shippingMethod = PKShippingMethod(label: label, amount: amount)
            shippingMethod.identifier = identifier
            shippingMethod.detail = method["detail"] as? String

            if let startDateRaw = method["startDate"], let endDateRaw = method["endDate"],
               let startDate = parseDate(from: startDateRaw), let endDate = parseDate(from: endDateRaw) {
                var calendar = Calendar(identifier: .gregorian)
                calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? calendar.timeZone
                shippingMethod.dateComponentsRange = PKDateComponentsRange(
                    start: calendar.dateComponents([.calendar, .year, .month, .day], from: startDate),
                    end: calendar.dateComponents([.calendar, .year, .month, .day], from: endDate)
                )
            }

            return shippingMethod
        }
    }

    private func shippingMethodDictionary(from shippingMethod: PKShippingMethod) -> [String: Any] {
        var result: [String: Any] = [
            "identifier": shippingMethod.identifier ?? "",
            "label": shippingMethod.label,
            "amount": shippingMethod.amount.stringValue
        ]

        if let detail = shippingMethod.detail {
            result["detail"] = detail
        }

        if let range = shippingMethod.dateComponentsRange,
           let startDate = shippingDateString(from: range.startDateComponents),
           let endDate = shippingDateString(from: range.endDateComponents) {
            result["startDate"] = startDate
            result["endDate"] = endDate
        }

        return result
    }

    private func shippingDateString(from components: DateComponents) -> String? {
        guard let year = components.year, let month = components.month, let day = components.day else {
            return nil
        }

        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    @objc func getPluginVersion(_ call: CAPPluginCall) {
        call.resolve(["version": self.pluginVersion])
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
}
