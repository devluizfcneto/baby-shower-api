import vine from '@vinejs/vine'

const marketplace = vine.enum(['amazon', 'mercadolivre', 'shopee'])

export const adminGiftUpdateValidator = vine.create({
  name: vine.string().trim().minLength(3).maxLength(200).optional(),
  description: vine.string().trim().maxLength(2000).optional(),
  imageUrl: vine.string().trim().url().maxLength(2000).optional(),
  marketplace: marketplace.optional(),
  marketplaceUrl: vine.string().trim().url().maxLength(2000).optional(),
  asin: vine.string().trim().maxLength(20).optional(),
  affiliateLinkAmazon: vine.string().trim().url().maxLength(2000).optional(),
  affiliateLinkMl: vine.string().trim().url().maxLength(2000).optional(),
  affiliateLinkShopee: vine.string().trim().url().maxLength(2000).optional(),
  maxQuantity: vine.number().withoutDecimals().min(1).max(999).optional(),
  sortOrder: vine.number().withoutDecimals().min(0).max(100000).optional(),
})
