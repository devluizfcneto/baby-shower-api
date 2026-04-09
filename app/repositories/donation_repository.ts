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
