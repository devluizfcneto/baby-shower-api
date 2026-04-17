import type { EntityManager, Repository } from 'typeorm'

import { Guest } from '#entities/guest'
import { AppDataSource } from '#services/database_service'

export type CreateGuestInput = {
  eventId: number
  fullName: string
  email: string
}

export type GuestCreateResult = {
  id: number
  fullName: string
  email: string
  confirmedAt: Date
}

export type AdminGuestSortBy = 'confirmedAt' | 'fullName' | 'email'
export type AdminGuestSortDir = 'asc' | 'desc'

export type AdminGuestListFilters = {
  eventId: number
  page: number
  perPage: number
  search?: string
  confirmedFrom?: Date
  confirmedTo?: Date
  sortBy: AdminGuestSortBy
  sortDir: AdminGuestSortDir
}

export type AdminGuestListProjection = {
  guestId: number
  fullName: string
  email: string
  confirmedAt: Date
  companionsCount: number
  companionName: string | null
}

export type AdminConfirmedPersonType = 'guest' | 'companion'

export type AdminConfirmedPersonProjection = {
  personId: number
  guestId: number
  fullName: string
  email: string | null
  confirmedAt: Date
  personType: AdminConfirmedPersonType
}

export type AdminCompanionProjection = {
  id: number
  guestId: number
  fullName: string
}

export type AdminGuestExportFilters = {
  eventId: number
  search?: string
  confirmedFrom?: Date
  confirmedTo?: Date
  limit: number
}

export type AdminGuestExportProjection = {
  guestId: number
  fullName: string
  email: string
  companionsCount: number
  totalPeople: number
  companionsNames: string
  confirmedAt: Date
}

export class GuestRepository {
  constructor(
    private readonly repository: Repository<Guest> = AppDataSource.getRepository(Guest)
  ) {}

  async createGuest(input: CreateGuestInput, manager?: EntityManager): Promise<GuestCreateResult> {
    const activeRepository = manager ? manager.getRepository(Guest) : this.repository

    const result = await activeRepository
      .createQueryBuilder()
      .insert()
      .into(Guest)
      .values({
        eventId: input.eventId,
        fullName: input.fullName,
        email: input.email,
        confirmedAt: new Date(),
      })
      .returning(['id', 'full_name', 'email', 'confirmed_at'])
      .execute()

    const row = result.raw[0] as {
      id: number
      full_name?: string
      fullName?: string
      email: string
      confirmed_at?: Date | string
      confirmedAt?: Date | string
    }

    const confirmedAtRaw = row.confirmed_at ?? row.confirmedAt
    const confirmedAt = confirmedAtRaw ? new Date(confirmedAtRaw) : new Date()

    return {
      id: Number(row.id),
      fullName: row.full_name ?? row.fullName ?? input.fullName,
      email: row.email,
      confirmedAt,
    }
  }

  async existsByEventAndEmail(eventId: number, email: string): Promise<boolean> {
    const rows = await this.repository.query(
      `
      SELECT 1
      FROM (
        SELECT 1
        FROM guests guest
        WHERE guest.event_id = $1
          AND LOWER(guest.email) = LOWER($2)
        UNION ALL
        SELECT 1
        FROM companions companion
        WHERE companion.event_id = $1
          AND companion.email IS NOT NULL
          AND LOWER(companion.email) = LOWER($2)
      ) AS email_conflicts
      LIMIT 1
      `,
      [eventId, email]
    )

    return rows.length > 0
  }

  async findAdminGuestConfirmations(
    filters: AdminGuestListFilters
  ): Promise<AdminGuestListProjection[]> {
    const { eventId, page, perPage } = filters
    const offset = (page - 1) * perPage

    const query = this.repository
      .createQueryBuilder('guest')
      .leftJoin('companions', 'companion', 'companion.guest_id = guest.id')
      .select([
        'guest.id AS guest_id',
        'guest.full_name AS full_name',
        'guest.email AS email',
        'guest.confirmed_at AS confirmed_at',
        'COALESCE(COUNT(companion.id), 0) AS companions_count',
        'MIN(companion.full_name) AS companion_name',
      ])
      .where('guest.event_id = :eventId', { eventId })

    this.applyAdminFilters(query, filters)

    query
      .groupBy('guest.id')
      .addGroupBy('guest.full_name')
      .addGroupBy('guest.email')
      .addGroupBy('guest.confirmed_at')

    this.applyAdminSorting(query, filters.sortBy, filters.sortDir)

    const rows = await query.limit(perPage).offset(offset).getRawMany<{
      guest_id: number | string
      full_name: string
      email: string
      confirmed_at: Date | string
      companions_count: number | string
      companion_name: string | null
    }>()

    return rows.map((row) => ({
      guestId: Number(row.guest_id),
      fullName: row.full_name,
      email: row.email,
      confirmedAt: new Date(row.confirmed_at),
      companionsCount: Number(row.companions_count),
      companionName: row.companion_name,
    }))
  }

  async countAdminGuestConfirmations(filters: Omit<AdminGuestListFilters, 'page' | 'perPage'>) {
    const query = this.repository
      .createQueryBuilder('guest')
      .select('COUNT(guest.id)', 'total')
      .where('guest.event_id = :eventId', { eventId: filters.eventId })

    this.applyAdminFilters(query, filters)

    const row = await query.getRawOne<{ total?: string | number }>()
    return Number(row?.total ?? 0)
  }

  async findCompanionsByGuestIds(guestIds: number[]): Promise<AdminCompanionProjection[]> {
    if (guestIds.length === 0) {
      return []
    }

    const rows = await this.repository.query(
      `
      SELECT companion.id, companion.guest_id, companion.full_name
      FROM companions companion
      WHERE companion.guest_id = ANY($1)
      ORDER BY companion.guest_id ASC, companion.id ASC
      `,
      [guestIds]
    )

    return (rows as Array<{ id: number; guest_id: number; full_name: string }>).map((row) => ({
      id: Number(row.id),
      guestId: Number(row.guest_id),
      fullName: row.full_name,
    }))
  }

  async findAdminConfirmedPeople(
    filters: AdminGuestListFilters
  ): Promise<AdminConfirmedPersonProjection[]> {
    const query = this.buildAdminConfirmedPeopleQuery(filters, false)
    const rows = await this.repository.query(query.sql, query.params)

    return (
      rows as Array<{
        person_id: number | string
        guest_id: number | string
        full_name: string
        email: string | null
        confirmed_at: Date | string
        person_type: AdminConfirmedPersonType
      }>
    ).map((row) => ({
      personId: Number(row.person_id),
      guestId: Number(row.guest_id),
      fullName: row.full_name,
      email: row.email,
      confirmedAt: new Date(row.confirmed_at),
      personType: row.person_type,
    }))
  }

  async countAdminConfirmedPeople(filters: AdminGuestListFilters): Promise<number> {
    const query = this.buildAdminConfirmedPeopleQuery(filters, true)
    const rows = await this.repository.query(query.sql, query.params)
    return Number(rows[0]?.total ?? 0)
  }

  async findAdminGuestsForExport(
    filters: AdminGuestExportFilters
  ): Promise<AdminGuestExportProjection[]> {
    const query = this.repository
      .createQueryBuilder('guest')
      .leftJoin('companions', 'companion', 'companion.guest_id = guest.id')
      .select([
        'guest.id AS guest_id',
        'guest.full_name AS full_name',
        'guest.email AS email',
        'guest.confirmed_at AS confirmed_at',
        'COALESCE(COUNT(companion.id), 0) AS companions_count',
        "COALESCE(STRING_AGG(companion.full_name, ' | ' ORDER BY companion.id), '') AS companions_names",
      ])
      .where('guest.event_id = :eventId', { eventId: filters.eventId })

    this.applyAdminFilters(query, filters)

    query
      .groupBy('guest.id')
      .addGroupBy('guest.full_name')
      .addGroupBy('guest.email')
      .addGroupBy('guest.confirmed_at')
      .orderBy('guest.confirmed_at', 'DESC')
      .addOrderBy('guest.id', 'ASC')
      .limit(filters.limit)

    const rows = await query.getRawMany<{
      guest_id: number | string
      full_name: string
      email: string
      confirmed_at: Date | string
      companions_count: number | string
      companions_names: string
    }>()

    return rows.map((row) => {
      const companionsCount = Number(row.companions_count)

      return {
        guestId: Number(row.guest_id),
        fullName: row.full_name,
        email: row.email,
        companionsCount,
        totalPeople: companionsCount + 1,
        companionsNames: row.companions_names,
        confirmedAt: new Date(row.confirmed_at),
      }
    })
  }

  private applyAdminFilters(
    query: ReturnType<Repository<Guest>['createQueryBuilder']>,
    filters: Pick<AdminGuestListFilters, 'search' | 'confirmedFrom' | 'confirmedTo'>
  ) {
    if (filters.search) {
      query.andWhere('(LOWER(guest.full_name) LIKE :search OR LOWER(guest.email) LIKE :search)', {
        search: `%${filters.search.toLowerCase()}%`,
      })
    }

    if (filters.confirmedFrom) {
      query.andWhere('guest.confirmed_at >= :confirmedFrom', {
        confirmedFrom: filters.confirmedFrom,
      })
    }

    if (filters.confirmedTo) {
      query.andWhere('guest.confirmed_at <= :confirmedTo', {
        confirmedTo: filters.confirmedTo,
      })
    }
  }

  private applyAdminSorting(
    query: ReturnType<Repository<Guest>['createQueryBuilder']>,
    sortBy: AdminGuestSortBy = 'confirmedAt',
    sortDir: AdminGuestSortDir = 'desc'
  ) {
    const columnBySort: Record<AdminGuestSortBy, string> = {
      confirmedAt: 'guest.confirmed_at',
      fullName: 'guest.full_name',
      email: 'guest.email',
    }

    query.orderBy(columnBySort[sortBy], sortDir.toUpperCase() as 'ASC' | 'DESC')
    query.addOrderBy('guest.id', 'ASC')
  }

  private buildAdminConfirmedPeopleQuery(
    filters: AdminGuestListFilters,
    countOnly: boolean
  ): { sql: string; params: Array<string | number | Date> } {
    const params: Array<string | number | Date> = []
    const addParam = (value: string | number | Date) => {
      params.push(value)
      return `$${params.length}`
    }

    const eventIdParam = addParam(filters.eventId)

    const baseSql = `
      SELECT
        guest.id AS person_id,
        guest.id AS guest_id,
        guest.full_name AS full_name,
        guest.email AS email,
        guest.confirmed_at AS confirmed_at,
        'guest' AS person_type
      FROM guests guest
      WHERE guest.event_id = ${eventIdParam}

      UNION ALL

      SELECT
        companion.id AS person_id,
        companion.guest_id AS guest_id,
        companion.full_name AS full_name,
        companion.email AS email,
        guest.confirmed_at AS confirmed_at,
        'companion' AS person_type
      FROM companions companion
      INNER JOIN guests guest ON guest.id = companion.guest_id
      WHERE guest.event_id = ${eventIdParam}
    `

    const conditions: string[] = []

    if (filters.search) {
      const searchParam = addParam(`%${filters.search.toLowerCase()}%`)
      conditions.push(
        `(LOWER(full_name) LIKE ${searchParam} OR LOWER(COALESCE(email, '')) LIKE ${searchParam})`
      )
    }

    if (filters.confirmedFrom) {
      const confirmedFromParam = addParam(filters.confirmedFrom)
      conditions.push(`confirmed_at >= ${confirmedFromParam}`)
    }

    if (filters.confirmedTo) {
      const confirmedToParam = addParam(filters.confirmedTo)
      conditions.push(`confirmed_at <= ${confirmedToParam}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    if (countOnly) {
      return {
        sql: `
          SELECT COUNT(*)::int AS total
          FROM (
            ${baseSql}
          ) AS confirmed_people
          ${whereClause}
        `,
        params,
      }
    }

    const sortByColumn: Record<AdminGuestSortBy, string> = {
      confirmedAt: 'confirmed_at',
      fullName: 'full_name',
      email: 'email',
    }

    const orderBy = sortByColumn[filters.sortBy]
    const sortDir = filters.sortDir.toUpperCase() as 'ASC' | 'DESC'
    const limitParam = addParam(filters.perPage)
    const offsetParam = addParam((filters.page - 1) * filters.perPage)

    return {
      sql: `
        SELECT *
        FROM (
          ${baseSql}
        ) AS confirmed_people
        ${whereClause}
        ORDER BY ${orderBy} ${sortDir}, guest_id ASC, CASE WHEN person_type = 'guest' THEN 0 ELSE 1 END ASC, person_id ASC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      params,
    }
  }
}
