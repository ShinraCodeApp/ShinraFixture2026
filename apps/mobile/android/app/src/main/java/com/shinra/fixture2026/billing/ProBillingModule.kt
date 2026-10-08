package com.shinra.fixture2026.billing

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Compra única "Pro – sin anuncios" con Google Play Billing 8.
 * Solo productos únicos (INAPP, no consumibles): la compra queda asociada a la
 * cuenta de Google y se recupera en otro celular con restore().
 */
class ProBillingModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx), PurchasesUpdatedListener {

  override fun getName() = "ProBilling"

  private var pendingPurchase: Promise? = null
  private var pendingProductId: String? = null

  private val client: BillingClient = BillingClient.newBuilder(ctx)
    .setListener(this)
    .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
    .enableAutoServiceReconnection()
    .build()

  private fun withConnection(promise: Promise, block: () -> Unit) {
    if (client.isReady) return block()
    client.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(result: BillingResult) {
        if (result.responseCode == BillingClient.BillingResponseCode.OK) block()
        else promise.reject("billing_unavailable", result.debugMessage)
      }
      override fun onBillingServiceDisconnected() {}
    })
  }

  private fun queryProduct(productId: String, promise: Promise, onFound: (ProductDetails) -> Unit) {
    val params = QueryProductDetailsParams.newBuilder()
      .setProductList(
        listOf(
          QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        )
      ).build()
    client.queryProductDetailsAsync(params) { result, details ->
      val product = details.productDetailsList.firstOrNull()
      if (result.responseCode != BillingClient.BillingResponseCode.OK || product == null) {
        promise.reject("product_not_found", "Producto $productId no disponible (${result.debugMessage})")
      } else onFound(product)
    }
  }

  /** Precio formateado en la moneda del usuario (p. ej. "ARS 2.999,00"). */
  @ReactMethod
  fun getPrice(productId: String, promise: Promise) = withConnection(promise) {
    queryProduct(productId, promise) { product ->
      promise.resolve(product.oneTimePurchaseOfferDetails?.formattedPrice)
    }
  }

  /** Abre la hoja de pago de Google. Resuelve true si quedó comprado. */
  @ReactMethod
  fun purchase(productId: String, promise: Promise) = withConnection(promise) {
    val activity = ctx.currentActivity ?: return@withConnection promise.reject("no_activity", "Sin pantalla activa")
    queryProduct(productId, promise) { product ->
      pendingPurchase?.reject("superseded", "Nueva compra iniciada")
      pendingPurchase = promise
      pendingProductId = productId
      val flow = BillingFlowParams.newBuilder()
        .setProductDetailsParamsList(
          listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).build())
        ).build()
      activity.runOnUiThread {
        val result = client.launchBillingFlow(activity, flow)
        if (result.responseCode != BillingClient.BillingResponseCode.OK) {
          finishPurchase(result.responseCode == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED, result)
        }
      }
    }
  }

  /** ¿La cuenta de Google ya tiene el producto? (restaurar compra / al abrir la app) */
  @ReactMethod
  fun isOwned(productId: String, promise: Promise) = withConnection(promise) {
    val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
    client.queryPurchasesAsync(params) { result, purchases ->
      if (result.responseCode != BillingClient.BillingResponseCode.OK) {
        promise.reject("query_failed", result.debugMessage)
        return@queryPurchasesAsync
      }
      val owned = purchases.filter {
        it.products.contains(productId) && it.purchaseState == Purchase.PurchaseState.PURCHASED
      }
      owned.forEach { acknowledge(it) }
      promise.resolve(owned.isNotEmpty())
    }
  }

  override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
    val code = result.responseCode
    val bought = purchases.orEmpty().filter {
      it.products.contains(pendingProductId) && it.purchaseState == Purchase.PurchaseState.PURCHASED
    }
    bought.forEach { acknowledge(it) }
    if (code == BillingClient.BillingResponseCode.OK && bought.isEmpty() &&
      purchases.orEmpty().any { it.purchaseState == Purchase.PurchaseState.PENDING }) {
      pendingPurchase?.reject("pending", "El pago quedó pendiente; Pro se activa cuando se acredite.")
      pendingPurchase = null
      return
    }
    finishPurchase(bought.isNotEmpty() || code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED, result)
  }

  private fun finishPurchase(owned: Boolean, result: BillingResult) {
    val promise = pendingPurchase ?: return
    pendingPurchase = null
    when {
      owned -> promise.resolve(true)
      result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED -> promise.resolve(false)
      else -> promise.reject("purchase_failed", "Error ${result.responseCode}: ${result.debugMessage}")
    }
  }

  // Google reembolsa solo la compra si no se confirma en 3 días
  private fun acknowledge(purchase: Purchase) {
    if (purchase.isAcknowledged) return
    val params = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()
    client.acknowledgePurchase(params) {}
  }

  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Int) {}
}
