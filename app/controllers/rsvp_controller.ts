import type { HttpContext } from '@adonisjs/core/http'

import { RsvpService } from '#services/rsvp_service'
import { eventCodeQueryValidator } from '#validators/event_code_query_validator'
import { rsvpValidator } from '#validators/rsvp_validator'

export default class RsvpController {
  constructor(private readonly rsvpService: RsvpService = new RsvpService()) {}

  async store({ request, response }: HttpContext) {
    const { eventCode } = await eventCodeQueryValidator.validate(request.params())
    const payload = await rsvpValidator.validate(request.all())

    const result = await this.rsvpService.confirmPresence(eventCode, {
      fullName: payload.fullName,
      email: payload.email,
      companions: (payload.companions ?? []).map((companion) => ({
        fullName: companion.fullName,
        email: companion.email,
      })),
    })

    return response.created(result)
  }
}
