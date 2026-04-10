import vine from '@vinejs/vine'

const marketplace = vine.enum(['amazon', 'mercadolivre', 'shopee'])

export const adminGiftCreateValidator = vine.create({
  name: vine.string().trim().minLength(3).maxLength(200),
  description: vine.string().trim().maxLength(2000).optional(),
  imageUrl: vine.string().trim().url().maxLength(2000).optional(),
  marketplace,
  marketplaceUrl: vine.string().trim().url().maxLength(2000),
  asin: vine.string().trim().maxLength(20).optional(),
  affiliateLinkAmazon: vine.string().trim().url().maxLength(2000).optional(),
  affiliateLinkMl: vine.string().trim().url().maxLength(2000).optional(),
  affiliateLinkShopee: vine.string().trim().url().maxLength(2000).optional(),
  maxQuantity: vine.number().withoutDecimals().min(1).max(999),
  sortOrder: vine.number().withoutDecimals().min(0).max(100000).optional(),
})
