import type { DataSource, EntityManager, Repository } from 'typeorm'

import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
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

export type GiftAdminProjection = GiftPublicProjection & {
  eventId: number
  asin: string | null
  affiliateLinkAmazon: string | null
  affiliateLinkMl: string | null
  affiliateLinkShopee: string | null
  createdAt: Date
  updatedAt: Date
}

export type GiftListByEventResult = {
  eventFound: boolean
  gifts: GiftPublicProjection[]
}

export type CreateGiftInput = {
  eventId: number
  name: string
  description: string | null
  imageUrl: string | null
  marketplace: 'amazon' | 'mercadolivre' | 'shopee'
  marketplaceUrl: string
  asin: string | null
  affiliateLinkAmazon: string | null
  affiliateLinkMl: string | null
  affiliateLinkShopee: string | null
  maxQuantity: number
  sortOrder: number
}

export type UpdateGiftInput = Partial<Omit<CreateGiftInput, 'eventId'>> & {
  isBlocked?: boolean
}

type GiftAdminRaw = {
  id: number | string
  event_id?: number | string
  eventId?: number | string
  name: string
  description: string | null
  image_url?: string | null
  imageUrl?: string | null
  marketplace: string
  marketplace_url?: string
  marketplaceUrl?: string
  asin: string | null
  affiliate_link_amazon?: string | null
  affiliateLinkAmazon?: string | null
  affiliate_link_ml?: string | null
  affiliateLinkMl?: string | null
  affiliate_link_shopee?: string | null
  affiliateLinkShopee?: string | null
  max_quantity?: number | string
  maxQuantity?: number | string
  confirmed_quantity?: number | string
  confirmedQuantity?: number | string
  is_blocked?: boolean
  isBlocked?: boolean
  sort_order?: number | string
  sortOrder?: number | string
  created_at?: string | Date
  createdAt?: string | Date
  updated_at?: string | Date
  updatedAt?: string | Date
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

  async findAdminByEventId(eventId: number): Promise<GiftAdminProjection[]> {
    const rawRows = await this.repository
      .createQueryBuilder('gift')
      .select([
        'gift.id AS id',
        'gift.event_id AS event_id',
        'gift.name AS name',
        'gift.description AS description',
        'gift.image_url AS image_url',
        'gift.marketplace AS marketplace',
        'gift.marketplace_url AS marketplace_url',
        'gift.asin AS asin',
        'gift.affiliate_link_amazon AS affiliate_link_amazon',
        'gift.affiliate_link_ml AS affiliate_link_ml',
        'gift.affiliate_link_shopee AS affiliate_link_shopee',
        'gift.max_quantity AS max_quantity',
        'gift.confirmed_quantity AS confirmed_quantity',
        'gift.is_blocked AS is_blocked',
        'gift.sort_order AS sort_order',
        'gift.created_at AS created_at',
        'gift.updated_at AS updated_at',
      ])
      .where('gift.event_id = :eventId', { eventId })
      .orderBy('gift.sort_order', 'ASC')
      .addOrderBy('gift.id', 'ASC')
      .getRawMany<GiftAdminRaw>()

    return rawRows.map((row) => this.mapAdminRaw(row))
  }

  async findById(giftId: number): Promise<GiftAdminProjection | null> {
    const raw = await this.repository
      .createQueryBuilder('gift')
      .select([
        'gift.id AS id',
        'gift.event_id AS event_id',
        'gift.name AS name',
        'gift.description AS description',
        'gift.image_url AS image_url',
        'gift.marketplace AS marketplace',
        'gift.marketplace_url AS marketplace_url',
        'gift.asin AS asin',
        'gift.affiliate_link_amazon AS affiliate_link_amazon',
        'gift.affiliate_link_ml AS affiliate_link_ml',
        'gift.affiliate_link_shopee AS affiliate_link_shopee',
        'gift.max_quantity AS max_quantity',
        'gift.confirmed_quantity AS confirmed_quantity',
        'gift.is_blocked AS is_blocked',
        'gift.sort_order AS sort_order',
        'gift.created_at AS created_at',
        'gift.updated_at AS updated_at',
      ])
      .where('gift.id = :giftId', { giftId })
      .getRawOne<GiftAdminRaw>()

    return raw ? this.mapAdminRaw(raw) : null
  }

  async createGift(input: CreateGiftInput): Promise<GiftAdminProjection> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(Gift)
      .values({
        eventId: input.eventId,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        marketplace: input.marketplace,
        marketplaceUrl: input.marketplaceUrl,
        asin: input.asin,
        affiliateLinkAmazon: input.affiliateLinkAmazon,
        affiliateLinkMl: input.affiliateLinkMl,
        affiliateLinkShopee: input.affiliateLinkShopee,
        maxQuantity: input.maxQuantity,
        confirmedQuantity: 0,
        isBlocked: false,
        sortOrder: input.sortOrder,
      })
      .returning('id')
      .execute()

    const insertedId = Number(result.raw[0]?.id)
    const created = await this.findById(insertedId)

    if (!created) {
      throw new Error('Failed to read gift after creation')
    }

    return created
  }

  async updateGiftById(
    giftId: number,
    input: UpdateGiftInput
  ): Promise<GiftAdminProjection | null> {
    const updatePayload = this.removeUndefinedFields({
      ...input,
      updatedAt: new Date(),
    })

    const result = await this.repository
      .createQueryBuilder()
      .update(Gift)
      .set(updatePayload)
      .where('id = :giftId', { giftId })
      .execute()

    if ((result.affected ?? 0) === 0) {
      return null
    }

    return this.findById(giftId)
  }

  async hasPurchaseConfirmations(giftId: number): Promise<boolean> {
    const row = await this.dataSource
      .getRepository(PurchaseConfirmation)
      .createQueryBuilder('confirmation')
      .select('1', 'exists')
      .where('confirmation.giftId = :giftId', { giftId })
      .limit(1)
      .getRawOne<{ exists?: unknown }>()

    if (row?.exists === undefined || row.exists === null) {
      return false
    }

    const normalized = String(row.exists)
    return normalized === '1' || normalized.toLowerCase() === 'true'
  }

  async deleteGiftById(giftId: number): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Gift)
      .where('id = :giftId', { giftId })
      .execute()

    return (result.affected ?? 0) > 0
  }

  async findByIdForUpdate(giftId: number, manager: EntityManager): Promise<Gift | null> {
    return manager
      .getRepository(Gift)
      .createQueryBuilder('gift')
      .where('gift.id = :giftId', { giftId })
      .setLock('pessimistic_write')
      .getOne()
  }

  async findByIdForUpdateAndEventCode(
    giftId: number,
    eventCode: string,
    manager: EntityManager
  ): Promise<Gift | null> {
    return manager
      .getRepository(Gift)
      .createQueryBuilder('gift')
      .innerJoin(Event, 'event', 'event.id = gift.event_id')
      .where('gift.id = :giftId', { giftId })
      .andWhere('event.code = :eventCode', { eventCode })
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

  private removeUndefinedFields<T extends Record<string, unknown>>(input: T): T {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T
  }

  private mapAdminRaw(raw: GiftAdminRaw): GiftAdminProjection {
    const createdAtRaw = raw.created_at ?? raw.createdAt ?? new Date()
    const updatedAtRaw = raw.updated_at ?? raw.updatedAt ?? new Date()

    return {
      id: Number(raw.id),
      eventId: Number(raw.event_id ?? raw.eventId ?? 0),
      name: raw.name,
      description: raw.description,
      imageUrl: raw.image_url ?? raw.imageUrl ?? null,
      marketplace: raw.marketplace,
      marketplaceUrl: raw.marketplace_url ?? raw.marketplaceUrl ?? '',
      asin: raw.asin,
      affiliateLinkAmazon: raw.affiliate_link_amazon ?? raw.affiliateLinkAmazon ?? null,
      affiliateLinkMl: raw.affiliate_link_ml ?? raw.affiliateLinkMl ?? null,
      affiliateLinkShopee: raw.affiliate_link_shopee ?? raw.affiliateLinkShopee ?? null,
      maxQuantity: Number(raw.max_quantity ?? raw.maxQuantity ?? 0),
      confirmedQuantity: Number(raw.confirmed_quantity ?? raw.confirmedQuantity ?? 0),
      isBlocked: raw.is_blocked ?? raw.isBlocked ?? false,
      sortOrder: Number(raw.sort_order ?? raw.sortOrder ?? 0),
      createdAt: new Date(createdAtRaw),
      updatedAt: new Date(updatedAtRaw),
    }
  }
}
