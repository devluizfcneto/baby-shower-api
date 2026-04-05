import type { DataSource, EntityManager, Repository } from 'typeorm'

import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { AppDataSource } from '#services/database_service'

type GiftListRawRow = {
  event_id: number
  gift_id: number | null
  gift_name: string | null
  gift_description: string | null
  gift_image_url: string | null
  gift_marketplace: string | null
  gift_marketplace_url: string | null
  gift_max_quantity: number | string | null
  gift_confirmed_quantity: number | string | null
  gift_is_blocked: boolean | null
  gift_sort_order: number | string | null
}

export type GiftPublicProjection = {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  marketplace: string
  marketplaceUrl: string
  maxQuantity: number
  confirmedQuantity: number
  isBlocked: boolean
  sortOrder: number
}

export type GiftListByEventResult = {
  eventFound: boolean
  gifts: GiftPublicProjection[]
}

export class GiftRepository {
  private readonly repository: Repository<Gift>

  constructor(private readonly dataSource: DataSource = AppDataSource) {
    this.repository = this.dataSource.getRepository(Gift)
  }

  async findPublicByEventCode(eventCode: string): Promise<GiftListByEventResult> {
    const rows = await this.dataSource
      .getRepository(Event)
      .createQueryBuilder('event')
      .leftJoin(Gift, 'gift', 'gift.event_id = event.id')
      .select([
        'event.id AS event_id',
        'gift.id AS gift_id',
        'gift.name AS gift_name',
        'gift.description AS gift_description',
        'gift.image_url AS gift_image_url',
        'gift.marketplace AS gift_marketplace',
        'gift.marketplace_url AS gift_marketplace_url',
        'gift.max_quantity AS gift_max_quantity',
        'gift.confirmed_quantity AS gift_confirmed_quantity',
        'gift.is_blocked AS gift_is_blocked',
        'gift.sort_order AS gift_sort_order',
      ])
      .where('event.code = :eventCode', { eventCode })
      .orderBy('gift.sort_order', 'ASC')
      .addOrderBy('gift.id', 'ASC')
      .getRawMany<GiftListRawRow>()

    if (rows.length === 0) {
      return { eventFound: false, gifts: [] }
    }

    const gifts = rows
      .filter((row) => row.gift_id !== null)
      .map((row) => ({
        id: Number(row.gift_id),
        name: row.gift_name ?? '',
        description: row.gift_description,
        imageUrl: row.gift_image_url,
        marketplace: row.gift_marketplace ?? '',
        marketplaceUrl: row.gift_marketplace_url ?? '',
        maxQuantity: Number(row.gift_max_quantity ?? 0),
        confirmedQuantity: Number(row.gift_confirmed_quantity ?? 0),
        isBlocked: row.gift_is_blocked ?? false,
        sortOrder: Number(row.gift_sort_order ?? 0),
      }))

    return { eventFound: true, gifts }
  }

  async findByIdForUpdate(giftId: number, manager: EntityManager): Promise<Gift | null> {
    return manager
      .getRepository(Gift)
      .createQueryBuilder('gift')
      .where('gift.id = :giftId', { giftId })
      .setLock('pessimistic_write')
      .getOne()
  }

  async updateConfirmedQuantity(
    giftId: number,
    confirmedQuantity: number,
    manager?: EntityManager
  ): Promise<void> {
    const activeRepository = manager ? manager.getRepository(Gift) : this.repository

    await activeRepository
      .createQueryBuilder()
      .update(Gift)
      .set({ confirmedQuantity, updatedAt: new Date() })
      .where('id = :giftId', { giftId })
      .execute()
  }
}
