import type { HttpContext } from '@adonisjs/core/http'

import { DonationService } from '#services/donation_service'
import { donationValidator } from '#validators/donation_validator'
import { inject } from '@adonisjs/core'

@inject()
export default class DonationController {
  constructor(private readonly donationService: DonationService) {}

  async store({ request, response }: HttpContext) {
    const payload = await donationValidator.validate(request.all())

    const result = await this.donationService.registerDonation({
      donorName: payload.donorName,
      donorEmail: payload.donorEmail,
      amount: payload.amount,
      pixDestination: payload.pixDestination,
    })

    return response.created(result)
  }
}
