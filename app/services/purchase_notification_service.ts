type PurchaseNotificationPayload = {
  giftId: number
  giftName: string
  guestName: string
  guestEmail: string
  quantity: number
  orderNumber: string | null
  confirmedAt: Date
}

export class PurchaseNotificationService {
  async sendAdminPurchaseNotification(payload: PurchaseNotificationPayload) {
    // Placeholder for SMTP integration; keep best-effort flow to avoid blocking purchase persistence.
    console.info('[purchase_notification] admin notification queued', {
      giftId: payload.giftId,
      giftName: payload.giftName,
      guestName: payload.guestName,
      guestEmail: payload.guestEmail,
      quantity: payload.quantity,
      orderNumber: payload.orderNumber,
      confirmedAt: payload.confirmedAt.toISOString(),
    })
  }
}
