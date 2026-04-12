import type { AdminPurchaseConfirmationProjection } from '#repositories/purchase_confirmation_repository'

export type AdminPurchaseConfirmationOutput = {
  confirmationId: number
  giftId: number
  giftName: string
  marketplace: 'amazon' | 'mercadolivre' | 'shopee'
  guestName: string
  guestEmail: string
  orderNumber: string | null
  quantity: number
  notes: string | null
  confirmedAt: string
}

export class PurchaseConfirmationPayloadMapperService {
  toAdminListData(row: AdminPurchaseConfirmationProjection): AdminPurchaseConfirmationOutput {
    return {
      confirmationId: row.confirmationId,
      giftId: row.giftId,
      giftName: row.giftName,
      marketplace: row.marketplace,
      guestName: row.guestName,
      guestEmail: row.guestEmail,
      orderNumber: row.orderNumber,
      quantity: row.quantity,
      notes: row.notes,
      confirmedAt: row.confirmedAt.toISOString(),
    }
  }
}
