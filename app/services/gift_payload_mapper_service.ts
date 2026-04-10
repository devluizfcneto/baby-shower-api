import { inject } from '@adonisjs/core'

import type { GiftAdminProjection, GiftPublicProjection } from '#repositories/gift_repository'

export type GiftStatus = 'available' | 'limit_reached' | 'blocked'

@inject()
export class GiftPayloadMapperService {
  toPublicGiftData(gift: GiftPublicProjection) {
    const remainingQuantity = Math.max(gift.maxQuantity - gift.confirmedQuantity, 0)

    return {
      id: gift.id,
      name: gift.name,
      description: gift.description,
      imageUrl: gift.imageUrl,
      marketplace: gift.marketplace,
      marketplaceUrl: gift.marketplaceUrl,
      maxQuantity: gift.maxQuantity,
      confirmedQuantity: gift.confirmedQuantity,
      remainingQuantity,
      status: this.resolveStatus(gift),
      isBlocked: gift.isBlocked,
      sortOrder: gift.sortOrder,
    }
  }

  toAdminGiftData(gift: GiftAdminProjection) {
    const remainingQuantity = Math.max(gift.maxQuantity - gift.confirmedQuantity, 0)

    return {
      id: gift.id,
      eventId: gift.eventId,
      name: gift.name,
      description: gift.description,
      imageUrl: gift.imageUrl,
      marketplace: gift.marketplace,
      marketplaceUrl: gift.marketplaceUrl,
      affiliateLinks: {
        amazon: gift.affiliateLinkAmazon,
        mercadolivre: gift.affiliateLinkMl,
        shopee: gift.affiliateLinkShopee,
      },
      asin: gift.asin,
      maxQuantity: gift.maxQuantity,
      confirmedQuantity: gift.confirmedQuantity,
      remainingQuantity,
      isBlocked: gift.isBlocked,
      status: this.resolveStatus(gift),
      sortOrder: gift.sortOrder,
      createdAt: gift.createdAt.toISOString(),
      updatedAt: gift.updatedAt.toISOString(),
    }
  }

  resolveStatus(
    gift: Pick<GiftPublicProjection, 'isBlocked' | 'confirmedQuantity' | 'maxQuantity'>
  ) {
    if (gift.isBlocked) {
      return 'blocked' as const
    }

    if (gift.confirmedQuantity >= gift.maxQuantity) {
      return 'limit_reached' as const
    }

    return 'available' as const
  }
}
