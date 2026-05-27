# In-App Purchase Integration

## StoreKit Configuration

```swift
import StoreKit

class IAPManager: NSObject, SKProductsRequestDelegate, SKPaymentTransactionObserver {
    static let shared = IAPManager()
    private var products: [String: SKProduct] = [:]
    private var completionHandlers: [String: (Bool) -> Void] = [:]

    override private init() {
        super.init()
        SKPaymentQueue.default().add(self)
    }

    func fetchProducts(productIdentifiers: Set<String>) async throws -> [SKProduct] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = SKProductsRequest(productIdentifiers: productIdentifiers)
            request.delegate = self

            self.productsRequestCompletion = { result in
                switch result {
                case .success(let products):
                    products.forEach { self.products[$0.productIdentifier] = $0 }
                    continuation.resume(returning: products)
                case .failure(let error):
                    continuation.resume(throwing: error)
                }
            }

            request.start()
        }
    }

    func purchase(product identifier: String) async throws -> Bool {
        guard let product = products[identifier] else {
            throw IAPError.productNotFound
        }

        return try await withCheckedThrowingContinuation { continuation in
            let payment = SKPayment(product: product)
            SKPaymentQueue.default().add(payment)
            completionHandlers[identifier] = { success in
                continuation.resume(returning: success)
            }
        }
    }

    func restorePurchases() async throws -> [String] {
        return try await withCheckedThrowingContinuation { continuation in
            self.restoreCompletion = { result in
                continuation.resume(with: result)
            }
            SKPaymentQueue.default().restoreCompletedTransactions()
        }
    }

    func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        for transaction in transactions {
            switch transaction.transactionState {
            case .purchased:
                complete(transaction: transaction)
            case .restored:
                complete(transaction: transaction)
            case .failed:
                fail(transaction: transaction)
            case .deferred:
                break
            case .purchasing:
                break
            @unknown default:
                break
            }
        }
    }

    private func complete(transaction: SKPaymentTransaction) {
        let productId = transaction.payment.productIdentifier
        receiptValidation(for: productId) { valid in
            self.completionHandlers[productId]?(valid)
            self.completionHandlers.removeValue(forKey: productId)
        }
        SKPaymentQueue.default().finishTransaction(transaction)
    }

    private func fail(transaction: SKPaymentTransaction) {
        let productId = transaction.payment.productIdentifier
        completionHandlers[productId]?(false)
        completionHandlers.removeValue(forKey: productId)
        SKPaymentQueue.default().finishTransaction(transaction)
    }
}
```

## Receipt Validation

```swift
class ReceiptValidator {
    func validateReceipt(productId: String) async throws -> Bool {
        guard let receiptURL = Bundle.main.appStoreReceiptURL,
              let receiptData = try? Data(contentsOf: receiptURL) else {
            return false
        }

        let receiptString = receiptData.base64EncodedString()
        let requestBody: [String: Any] = [
            "receipt-data": receiptString,
            "password": "shared_secret",
            "exclude-old-transactions": true,
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: requestBody)
        let url = URL(string: "https://buy.itunes.apple.com/verifyReceipt")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = jsonData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(ReceiptResponse.self, from: data)

        return response.status == 0 && response.receipt.inApp.contains {
            $0.productId == productId
        }
    }
}
```

## Key Points

- Use StoreKit for iOS in-app purchases
- Validate receipts on server-side for security
- Handle purchase interruptions gracefully
- Implement receipt refresh for restored purchases
- Support consumable, non-consumable, and subscription types
- Use SKAdNetwork for attribution
- Implement promotional offers for subscriptions
- Handle payment queue with observer pattern
- Test with Sandbox environment and TestFlight
- Monitor subscription status with webhooks
- Implement introductory pricing for new users
- Handle billing retry and grace periods
