import type { EntityManager, Repository } from 'typeorm'

import { Donation, type DonationPixDestination } from '#entities/donation'
import { AppDataSource } from '#services/database_service'

export type CreateDonationInput = {
  eventId: number
  donorName: string | null
  donorEmail: string | null
  amount: number | null
  pixDestination: DonationPixDestination | null
}

export type DonationCreateResult = {
  id: number
  donorName: string | null
  donorEmail: string | null
  amount: number | null
  pixDestination: DonationPixDestination | null
  donatedAt: Date
}

export type DonationsPageParams = {
  eventId: number
  page: number
  perPage: number
  pixDestination?: DonationPixDestination
}

export type DonationsPageItem = {
  id: number
  donorName: string | null
  donorEmail: string | null
  amount: number | null
  pixDestination: DonationPixDestination | null
  donatedAt: Date
}

export type DonationsPageResult = {
  data: DonationsPageItem[]
  total: number
  page: number
  perPage: number
}

export type AdminDonationSortBy = 'donatedAt' | 'donorName' | 'amount' | 'pixDestination'
export type AdminDonationSortDir = 'asc' | 'desc'

export type AdminDonationFilters = {
  eventId: number
  page: number
  perPage: number
  search?: string
  pixDestination?: DonationPixDestination
  donatedFrom?: Date
  donatedTo?: Date
  sortBy: AdminDonationSortBy
  sortDir: AdminDonationSortDir
}

export type AdminDonationProjection = {
  donationId: number
  donorName: string | null
  donorEmail: string | null
  amount: number | null
  pixDestination: DonationPixDestination | null
  donatedAt: Date
}

export type AdminDonationSummary = {
  donations: number
  declaredAmountTotal: number
  declaredAmountAverage: number
  donorsUnique: number
}

export class DonationRepository {
  constructor(
    private readonly repository: Repository<Donation> = AppDataSource.getRepository(Donation)
  ) {}

  async createDonation(
    input: CreateDonationInput,
    manager?: EntityManager
  ): Promise<DonationCreateResult> {
    const activeRepository = manager ? manager.getRepository(Donation) : this.repository

    const result = await activeRepository
      .createQueryBuilder()
      .insert()
      .into(Donation)
      .values({
        eventId: input.eventId,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        amount: input.amount !== null ? input.amount.toFixed(2) : null,
        pixDestination: input.pixDestination,
        donatedAt: new Date(),
      })
      .returning(['id', 'donor_name', 'donor_email', 'amount', 'pix_destination', 'donated_at'])
      .execute()

    const row = result.raw[0] as {
      id: number
      donor_name?: string | null
      donorName?: string | null
      donor_email?: string | null
      donorEmail?: string | null
      amount?: string | number | null
      pix_destination?: DonationPixDestination | null
      pixDestination?: DonationPixDestination | null
      donated_at?: string | Date
      donatedAt?: string | Date
    }

    const donatedAtRaw = row.donated_at ?? row.donatedAt

    return {
      id: Number(row.id),
      donorName: row.donor_name ?? row.donorName ?? input.donorName,
      donorEmail: row.donor_email ?? row.donorEmail ?? input.donorEmail,
      amount: this.parseAmount(row.amount, input.amount),
      pixDestination: row.pix_destination ?? row.pixDestination ?? input.pixDestination,
      donatedAt: donatedAtRaw ? new Date(donatedAtRaw) : new Date(),
    }
  }

  async listDeclaredByEvent(params: DonationsPageParams): Promise<DonationsPageResult> {
    const offset = (params.page - 1) * params.perPage

    const query = this.repository
      .createQueryBuilder('donation')
      .select([
        'donation.id AS id',
        'donation.donor_name AS donor_name',
        'donation.donor_email AS donor_email',
        'donation.amount AS amount',
        'donation.pix_destination AS pix_destination',
        'donation.donated_at AS donated_at',
      ])
      .where('donation.event_id = :eventId', { eventId: params.eventId })

    if (params.pixDestination) {
      query.andWhere('donation.pix_destination = :pixDestination', {
        pixDestination: params.pixDestination,
      })
    }

    const [rows, total] = await Promise.all([
      query
        .clone()
        .orderBy('donation.donated_at', 'DESC')
        .addOrderBy('donation.id', 'DESC')
        .offset(offset)
        .limit(params.perPage)
        .getRawMany<{
          id: number
          donor_name: string | null
          donor_email: string | null
          amount: string | number | null
          pix_destination: DonationPixDestination | null
          donated_at: string | Date
        }>(),
      query.clone().getCount(),
    ])

    return {
      data: rows.map((row) => ({
        id: Number(row.id),
        donorName: row.donor_name,
        donorEmail: row.donor_email,
        amount: this.parseAmount(row.amount, null),
        pixDestination: row.pix_destination,
        donatedAt: new Date(row.donated_at),
      })),
      total,
      page: params.page,
      perPage: params.perPage,
    }
  }

  async findAdminDonations(filters: AdminDonationFilters): Promise<AdminDonationProjection[]> {
    const offset = (filters.page - 1) * filters.perPage

    const query = this.repository
      .createQueryBuilder('donation')
      .select([
        'donation.id AS donation_id',
        'donation.donor_name AS donor_name',
        'donation.donor_email AS donor_email',
        'donation.amount AS amount',
        'donation.pix_destination AS pix_destination',
        'donation.donated_at AS donated_at',
      ])
      .where('donation.event_id = :eventId', { eventId: filters.eventId })

    this.applyAdminFilters(query, filters)
    this.applyAdminSorting(query, filters.sortBy, filters.sortDir)

    const rows = await query.limit(filters.perPage).offset(offset).getRawMany<{
      donation_id: number | string
      donor_name: string | null
      donor_email: string | null
      amount: string | number | null
      pix_destination: DonationPixDestination | null
      donated_at: Date | string
    }>()

    return rows.map((row) => ({
      donationId: Number(row.donation_id),
      donorName: row.donor_name,
      donorEmail: row.donor_email,
      amount: this.parseAmount(row.amount, null),
      pixDestination: row.pix_destination,
      donatedAt: new Date(row.donated_at),
    }))
  }

  async countAdminDonations(
    filters: Omit<AdminDonationFilters, 'page' | 'perPage'>
  ): Promise<number> {
    const query = this.repository
      .createQueryBuilder('donation')
      .select('COUNT(donation.id)', 'total')
      .where('donation.event_id = :eventId', { eventId: filters.eventId })

    this.applyAdminFilters(query, filters)

    const row = await query.getRawOne<{ total?: number | string }>()
    return Number(row?.total ?? 0)
  }

  async summarizeAdminDonations(
    filters: Omit<AdminDonationFilters, 'page' | 'perPage'>
  ): Promise<AdminDonationSummary> {
    const query = this.repository
      .createQueryBuilder('donation')
      .select('COUNT(donation.id)', 'donations')
      .addSelect('COALESCE(SUM(donation.amount), 0)', 'declared_amount_total')
      .addSelect('COALESCE(AVG(donation.amount), 0)', 'declared_amount_average')
      .addSelect("COUNT(DISTINCT LOWER(NULLIF(donation.donor_email, '')))", 'donors_unique')
      .where('donation.event_id = :eventId', { eventId: filters.eventId })

    this.applyAdminFilters(query, filters)

    const row = await query.getRawOne<{
      donations?: number | string
      declared_amount_total?: number | string
      declared_amount_average?: number | string
      donors_unique?: number | string
    }>()

    return {
      donations: Number(row?.donations ?? 0),
      declaredAmountTotal: Number(row?.declared_amount_total ?? 0),
      declaredAmountAverage: Number(row?.declared_amount_average ?? 0),
      donorsUnique: Number(row?.donors_unique ?? 0),
    }
  }

  private applyAdminFilters(
    query: ReturnType<Repository<Donation>['createQueryBuilder']>,
    filters: Pick<AdminDonationFilters, 'search' | 'pixDestination' | 'donatedFrom' | 'donatedTo'>
  ): void {
    if (filters.search) {
      query.andWhere(
        `(
          LOWER(COALESCE(donation.donor_name, '')) LIKE :search
          OR LOWER(COALESCE(donation.donor_email, '')) LIKE :search
        )`,
        {
          search: `%${filters.search.toLowerCase()}%`,
        }
      )
    }

    if (filters.pixDestination) {
      query.andWhere('donation.pix_destination = :pixDestination', {
        pixDestination: filters.pixDestination,
      })
    }

    if (filters.donatedFrom) {
      query.andWhere('donation.donated_at >= :donatedFrom', {
        donatedFrom: filters.donatedFrom,
      })
    }

    if (filters.donatedTo) {
      query.andWhere('donation.donated_at <= :donatedTo', {
        donatedTo: filters.donatedTo,
      })
    }
  }

  private applyAdminSorting(
    query: ReturnType<Repository<Donation>['createQueryBuilder']>,
    sortBy: AdminDonationSortBy,
    sortDir: AdminDonationSortDir
  ): void {
    const columnBySort: Record<AdminDonationSortBy, string> = {
      donatedAt: 'donation.donated_at',
      donorName: 'donation.donor_name',
      amount: 'donation.amount',
      pixDestination: 'donation.pix_destination',
    }

    query.orderBy(columnBySort[sortBy], sortDir.toUpperCase() as 'ASC' | 'DESC')
    query.addOrderBy('donation.id', 'ASC')
  }

  private parseAmount(
    rawAmount: string | number | null | undefined,
    fallback: number | null
  ): number | null {
    if (rawAmount === null || rawAmount === undefined) {
      return fallback
    }

    const parsed = Number(rawAmount)
    return Number.isNaN(parsed) ? fallback : parsed
  }
}
