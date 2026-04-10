import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { EventConfigService } from '#services/event_config_service'
import { eventConfigValidator } from '#validators/event_config_validator'

@inject()
export default class EventAdminController {
  constructor(private readonly eventConfigService: EventConfigService) {}

  async show({ response }: HttpContext) {
    const payload = await this.eventConfigService.getCurrentConfig()
    return response.ok(payload)
  }

  async update({ request, response }: HttpContext) {
    const payload = await eventConfigValidator.validate(request.all())

    const result = await this.eventConfigService.updateConfig({
      name: payload.name,
      date: payload.date,
      venueAddress: payload.venueAddress,
      deliveryAddress: payload.deliveryAddress,
      mapsLink: payload.mapsLink,
      coverImageUrl: payload.coverImageUrl,
      pix: payload.pix
        ? {
            dadKey: payload.pix.dadKey,
            momKey: payload.pix.momKey,
            dadQrCode: payload.pix.dadQrCode,
            momQrCode: payload.pix.momQrCode,
          }
        : undefined,
    })

    return response.ok(result)
  }
}
