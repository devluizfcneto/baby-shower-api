import vine from '@vinejs/vine'

export const giftPublicListQueryValidator = vine.create({
  search: vine.string().trim().maxLength(120).optional(),
  marketplace: vine.enum(['amazon', 'mercadolivre', 'shopee']).optional(),
  sortBy: vine
    .enum(['sortOrder', 'name', 'description', 'marketplace', 'maxQuantity', 'confirmedQuantity'])
    .optional(),
  sortDir: vine.enum(['asc', 'desc']).optional(),
})
