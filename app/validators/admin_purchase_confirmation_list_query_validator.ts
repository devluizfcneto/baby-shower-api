import vine from '@vinejs/vine'

const positiveInteger = vine
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform((value) => Number(value))

export const adminPurchaseConfirmationListQueryValidator = vine.create({
  page: positiveInteger.optional(),
  perPage: positiveInteger.optional(),
  search: vine.string().trim().maxLength(120).optional(),
  giftId: positiveInteger.optional(),
  marketplace: vine.enum(['amazon', 'mercadolivre', 'shopee']).optional(),
  confirmedFrom: vine.string().trim().maxLength(40).optional(),
  confirmedTo: vine.string().trim().maxLength(40).optional(),
  sortBy: vine.enum(['confirmedAt', 'giftName', 'guestName', 'quantity']).optional(),
  sortDir: vine.enum(['asc', 'desc']).optional(),
})
