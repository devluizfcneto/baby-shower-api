import type { EntityManager, Repository } from 'typeorm'

import type { GiftMarketplace } from '#entities/gift'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { AppDataSource } from '#services/database_service'

export type CreatePurchaseConfirmationInput = {
  giftId: number
  guestName: string
  guestEmail: string
  quantity: number
  orderNumber: string | null
  notes: string | null
}

export type PurchaseConfirmationCreateResult = {
  id: number
  giftId: number
  guestName: string
  guestEmail: string
  quantity: number
  orderNumber: string | null
  notes: string | null
  confirmedAt: Date
}

export type AdminPurchaseConfirmationSortBy = 'confirmedAt' | 'giftName' | 'guestName' | 'quantity'
export type AdminPurchaseConfirmationSortDir = 'asc' | 'desc'
export type AdminPurchaseConfirmationMarketplace = GiftMarketplace

export type AdminPurchaseConfirmationFilters = {
  eventId: number
  page: number
  perPage: number
  search?: string
  giftId?: number
  marketplace?: AdminPurchaseConfirmationMarketplace
  confirmedFrom?: Date
  confirmedTo?: Date
  sortBy: AdminPurchaseConfirmationSortBy
  sortDir: AdminPurchaseConfirmationSortDir
}

export type AdminPurchaseConfirmationProjection = {
  confirmationId: number
  giftId: number
  giftName: string
  marketplace: AdminPurchaseConfirmationMarketplace
  guestName: string
  guestEmail: string
  orderNumber: string | null
  quantity: number
  notes: string | null
  confirmedAt: Date
}

export type AdminPurchaseConfirmationSummary = {
  confirmations: number
  unitsConfirmed: number
  buyersUnique: number
}

export class PurchaseConfirmationRepository {
  constructor(
    private readonly repository: Repository<PurchaseConfirmation> = AppDataSource.getRepository(
      PurchaseConfirmation
    )
  ) {}

  async createConfirmation(
    input: CreatePurchaseConfirmationInput,
    manager?: EntityManager
  ): Promise<PurchaseConfirmationCreateResult> {
    const activeRepository = manager ? manager.getRepository(PurchaseConfirmation) : this.repository

    const result = await activeRepository
      .createQueryBuilder()
      .insert()
      .into(PurchaseConfirmation)
      .values({
        giftId: input.giftId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        quantity: input.quantity,
        orderNumber: input.orderNumber,
        notes: input.notes,
        confirmedAt: new Date(),
      })
      .returning([
        'id',
        'gift_id',
        'guest_name',
        'guest_email',
        'quantity',
        'order_number',
        'notes',
        'confirmed_at',
      ])
      .execute()

    const row = result.raw[0] as {
      id: number
      gift_id?: number
      giftId?: number
      guest_name?: string
      guestName?: string
      guest_email?: string
      guestEmail?: string
      quantity: number
      order_number?: string | null
      orderNumber?: string | null
      notes?: string | null
      confirmed_at?: string | Date
      confirmedAt?: string | Date
    }

    const confirmedAtRaw = row.confirmed_at ?? row.confirmedAt

    return {
      id: Number(row.id),
      giftId: Number(row.gift_id ?? row.giftId ?? input.giftId),
      guestName: row.guest_name ?? row.guestName ?? input.guestName,
      guestEmail: row.guest_email ?? row.guestEmail ?? input.guestEmail,
      quantity: Number(row.quantity),
      orderNumber: row.order_number ?? row.orderNumber ?? input.orderNumber,
      notes: row.notes ?? input.notes,
      confirmedAt: confirmedAtRaw ? new Date(confirmedAtRaw) : new Date(),
    }
  }

  async findAdminPurchaseConfirmations(
    filters: AdminPurchaseConfirmationFilters
  ): Promise<AdminPurchaseConfirmationProjection[]> {
    const offset = (filters.page - 1) * filters.perPage

    const query = this.repository
      .createQueryBuilder('confirmation')
      .innerJoin('gifts', 'gift', 'gift.id = confirmation.gift_id')
      .select([
        'confirmation.id AS confirmation_id',
        'confirmation.gift_id AS gift_id',
        'gift.name AS gift_name',
        'gift.marketplace AS marketplace',
        'confirmation.guest_name AS guest_name',
        'confirmation.guest_email AS guest_email',
        'confirmation.order_number AS order_number',
        'confirmation.quantity AS quantity',
        'confirmation.notes AS notes',
        'confirmation.confirmed_at AS confirmed_at',
      ])
      .where('gift.event_id = :eventId', { eventId: filters.eventId })

    this.applyAdminFilters(query, filters)
    this.applyAdminSorting(query, filters.sortBy, filters.sortDir)

    const rows = await query.limit(filters.perPage).offset(offset).getRawMany<{
      confirmation_id: number | string
      gift_id: number | string
      gift_name: string
      marketplace: AdminPurchaseConfirmationMarketplace
      guest_name: string
      guest_email: string
      order_number: string | null
      quantity: number | string
      notes: string | null
      confirmed_at: Date | string
    }>()

    return rows.map((row) => ({
      confirmationId: Number(row.confirmation_id),
      giftId: Number(row.gift_id),
      giftName: row.gift_name,
      marketplace: row.marketplace,
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      orderNumber: row.order_number,
      quantity: Number(row.quantity),
      notes: row.notes,
      confirmedAt: new Date(row.confirmed_at),
    }))
  }

  async countAdminPurchaseConfirmations(
    filters: Omit<AdminPurchaseConfirmationFilters, 'page' | 'perPage'>
  ): Promise<number> {
    const query = this.repository
      .createQueryBuilder('confirmation')
      .innerJoin('gifts', 'gift', 'gift.id = confirmation.gift_id')
      .select('COUNT(confirmation.id)', 'total')
      .where('gift.event_id = :eventId', { eventId: filters.eventId })

    this.applyAdminFilters(query, filters)

    const row = await query.getRawOne<{ total?: number | string }>()
    return Number(row?.total ?? 0)
  }

  async summarizeAdminPurchaseConfirmations(
    filters: Omit<AdminPurchaseConfirmationFilters, 'page' | 'perPage'>
  ): Promise<AdminPurchaseConfirmationSummary> {
    const query = this.repository
      .createQueryBuilder('confirmation')
      .innerJoin('gifts', 'gift', 'gift.id = confirmation.gift_id')
      .select('COUNT(confirmation.id)', 'confirmations')
      .addSelect('COALESCE(SUM(confirmation.quantity), 0)', 'units_confirmed')
      .addSelect('COUNT(DISTINCT LOWER(confirmation.guest_email))', 'buyers_unique')
      .where('gift.event_id = :eventId', { eventId: filters.eventId })

    this.applyAdminFilters(query, filters)

    const row = await query.getRawOne<{
      confirmations?: number | string
      units_confirmed?: number | string
      buyers_unique?: number | string
    }>()

    return {
      confirmations: Number(row?.confirmations ?? 0),
      unitsConfirmed: Number(row?.units_confirmed ?? 0),
      buyersUnique: Number(row?.buyers_unique ?? 0),
    }
  }

  private applyAdminFilters(
    query: ReturnType<Repository<PurchaseConfirmation>['createQueryBuilder']>,
    filters: Pick<
      AdminPurchaseConfirmationFilters,
      'search' | 'giftId' | 'marketplace' | 'confirmedFrom' | 'confirmedTo'
    >
  ): void {
    if (filters.search) {
      query.andWhere(
        `(
          LOWER(confirmation.guest_name) LIKE :search
          OR LOWER(confirmation.guest_email) LIKE :search
          OR LOWER(COALESCE(confirmation.order_number, '')) LIKE :search
          OR LOWER(gift.name) LIKE :search
        )`,
        {
          search: `%${filters.search.toLowerCase()}%`,
        }
      )
    }

    if (filters.giftId) {
      query.andWhere('confirmation.gift_id = :giftId', { giftId: filters.giftId })
    }

    if (filters.marketplace) {
      query.andWhere('gift.marketplace = :marketplace', {
        marketplace: filters.marketplace,
      })
    }

    if (filters.confirmedFrom) {
      query.andWhere('confirmation.confirmed_at >= :confirmedFrom', {
        confirmedFrom: filters.confirmedFrom,
      })
    }

    if (filters.confirmedTo) {
      query.andWhere('confirmation.confirmed_at <= :confirmedTo', {
        confirmedTo: filters.confirmedTo,
      })
    }
  }

  private applyAdminSorting(
    query: ReturnType<Repository<PurchaseConfirmation>['createQueryBuilder']>,
    sortBy: AdminPurchaseConfirmationSortBy,
    sortDir: AdminPurchaseConfirmationSortDir
  ): void {
    const columnBySort: Record<AdminPurchaseConfirmationSortBy, string> = {
      confirmedAt: 'confirmation.confirmed_at',
      giftName: 'gift.name',
      guestName: 'confirmation.guest_name',
      quantity: 'confirmation.quantity',
    }

    query.orderBy(columnBySort[sortBy], sortDir.toUpperCase() as 'ASC' | 'DESC')
    query.addOrderBy('confirmation.id', 'ASC')
  }
}
