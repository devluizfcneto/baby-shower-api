import { EventNotFoundException, GiftListFetchFailedException } from '#exceptions/domain_exceptions'
import { GiftRepository } from '#repositories/gift_repository'
import { GiftPayloadMapperService } from '#services/gift_payload_mapper_service'
import { inject } from '@adonisjs/core'

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

@inject()
export class GiftService {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftPayloadMapperService: GiftPayloadMapperService
  ) {}

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

    const data = result.gifts.map((gift) => this.giftPayloadMapperService.toPublicGiftData(gift))

    return {
      data,
      meta: {
        eventCode,
        total: data.length,
        source: 'database',
      },
    }
  }
}
