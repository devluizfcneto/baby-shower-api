import vine from '@vinejs/vine'

export const adminExportGuestsQueryValidator = vine.create({
  search: vine.string().trim().maxLength(120).optional(),
  dateFrom: vine.string().trim().maxLength(40).optional(),
  dateTo: vine.string().trim().maxLength(40).optional(),
})

export const adminExportPurchasesQueryValidator = vine.create({
  search: vine.string().trim().maxLength(120).optional(),
  dateFrom: vine.string().trim().maxLength(40).optional(),
  dateTo: vine.string().trim().maxLength(40).optional(),
  marketplace: vine.enum(['amazon', 'mercadolivre', 'shopee']).optional(),
})
