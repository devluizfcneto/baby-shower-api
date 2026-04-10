import { Event } from '#entities/event'
import { AppDataSource } from '#services/database_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

import type { Seeder } from './contracts.js'

export default class EventsTableSeeder implements Seeder {
  name = 'events'
  private readonly inputSanitizerService = new InputSanitizerService()

  async run() {
    const eventRepository = AppDataSource.getRepository(Event)
    const existingEvent = await eventRepository.findOne({ where: {} })

    if (existingEvent) {
      return
    }

    const event = eventRepository.create({
      code: (process.env.SEED_EVENT_CODE ?? 'babyshower2026event1').trim(),
      name: this.inputSanitizerService.normalizeRequiredText(
        process.env.SEED_EVENT_NAME ?? 'Cha de bebe da Maria'
      ),
      date: new Date(process.env.SEED_EVENT_DATE ?? '2026-08-15T15:00:00.000Z'),
      venueAddress: this.inputSanitizerService.normalizeRequiredText(
        process.env.SEED_EVENT_VENUE_ADDRESS ?? 'Rua das Flores, 100 - Centro'
      ),
      deliveryAddress: this.inputSanitizerService.normalizeOptionalText(
        process.env.SEED_EVENT_DELIVERY_ADDRESS ?? 'Rua das Flores, 100 - Centro'
      ),
      mapsLink: this.inputSanitizerService.normalizeOptionalText(
        process.env.SEED_EVENT_MAPS_LINK ?? 'https://maps.google.com/?q=Rua%20das%20Flores%2C%20100'
      ),
      coverImageUrl: this.inputSanitizerService.normalizeOptionalText(
        process.env.SEED_EVENT_COVER_URL
      ),
      pixKeyDad: this.inputSanitizerService.normalizeOptionalText(
        process.env.SEED_EVENT_PIX_KEY_DAD
      ),
      pixKeyMom: this.inputSanitizerService.normalizeOptionalText(
        process.env.SEED_EVENT_PIX_KEY_MOM
      ),
      pixQrcodeDad: this.inputSanitizerService.normalizeOptionalText(
        process.env.SEED_EVENT_PIX_QRCODE_DAD
      ),
      pixQrcodeMom: this.inputSanitizerService.normalizeOptionalText(
        process.env.SEED_EVENT_PIX_QRCODE_MOM
      ),
    })

    await eventRepository.save(event)
  }
}
