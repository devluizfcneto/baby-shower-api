import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { EventConfigService } from '#services/event_config_service'
import { adminEventIdParamValidator } from '#validators/admin_event_id_param_validator'
import { eventConfigValidator } from '#validators/event_config_validator'

@inject()
export default class EventAdminController {
  constructor(private readonly eventConfigService: EventConfigService) {}

  async show({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const payload = await this.eventConfigService.getConfigById(eventId)
    return response.ok(payload)
  }

  async update({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const payload = await eventConfigValidator.validate(request.all())

    const result = await this.eventConfigService.updateConfig(eventId, {
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
