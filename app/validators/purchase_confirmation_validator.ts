import vine from '@vinejs/vine'

export const purchaseConfirmationValidator = vine.create({
  guestName: vine.string().trim().minLength(2).maxLength(200),
  guestEmail: vine.string().trim().email().maxLength(200),
  quantity: vine.number().withoutDecimals().min(1).max(20).optional(),
  orderNumber: vine.string().trim().maxLength(100).optional(),
  notes: vine.string().trim().maxLength(1000).optional(),
})
