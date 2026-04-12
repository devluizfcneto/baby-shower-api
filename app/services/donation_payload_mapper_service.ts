import { inject } from '@adonisjs/core'

import type { AdminDonationProjection } from '#repositories/donation_repository'

export type AdminDonationOutput = {
  donationId: number
  donorName: string | null
  donorEmail: string | null
  amount: number | null
  pixDestination: 'dad' | 'mom' | null
  donatedAt: string
}

@inject()
export class DonationPayloadMapperService {
  toAdminListData(input: AdminDonationProjection): AdminDonationOutput {
    return {
      donationId: input.donationId,
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      amount: input.amount,
      pixDestination: input.pixDestination,
      donatedAt: input.donatedAt.toISOString(),
    }
  }
}
