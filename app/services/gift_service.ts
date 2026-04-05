import { EventNotFoundException, GiftListFetchFailedException } from '#exceptions/domain_exceptions'
import { GiftRepository, type GiftPublicProjection } from '#repositories/gift_repository'

type GiftPublicStatus = 'available' | 'limit_reached' | 'blocked'

type PublicGiftListResponse = {
  data: Array<{
    id: number
    name: string
    description: string | null
    imageUrl: string | null
    marketplace: string
    marketplaceUrl: string
    maxQuantity: number
    confirmedQuantity: number
    remainingQuantity: number
    status: GiftPublicStatus
    isBlocked: boolean
    sortOrder: number
  }>
  meta: {
    eventCode: string
    total: number
    source: 'database'
  }
}

export class GiftService {
  constructor(private readonly giftRepository: GiftRepository = new GiftRepository()) {}

  async listPublicGifts(eventCode: string): Promise<PublicGiftListResponse> {
    let result: Awaited<ReturnType<GiftRepository['findPublicByEventCode']>>

    try {
      result = await this.giftRepository.findPublicByEventCode(eventCode)
    } catch {
      throw new GiftListFetchFailedException()
    }

    if (!result.eventFound) {
      throw new EventNotFoundException()
    }

    const data = result.gifts.map((gift) => this.mapGift(gift))

    return {
      data,
      meta: {
        eventCode,
        total: data.length,
        source: 'database',
      },
    }
  }

  private mapGift(gift: GiftPublicProjection) {
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
      status: this.resolveGiftStatus(gift),
      isBlocked: gift.isBlocked,
      sortOrder: gift.sortOrder,
    }
  }

  private resolveGiftStatus(gift: GiftPublicProjection): GiftPublicStatus {
    if (gift.isBlocked) {
      return 'blocked'
    }

    if (gift.confirmedQuantity >= gift.maxQuantity) {
      return 'limit_reached'
    }

    return 'available'
  }
}
