import { randomBytes } from 'node:crypto'
import { inject } from '@adonisjs/core'

import { EventRepository } from '#repositories/event_repository'

@inject()
export class EventCodeGeneratorService {
  constructor(private readonly eventRepository: EventRepository) {}

  async generateUniqueCode(eventName: string): Promise<string> {
    const base = this.toSlug(eventName)

    for (let attempt = 0; attempt < 3; attempt++) {
      const suffix = randomBytes(3).toString('hex')
      const candidate = `${base}-${suffix}`.slice(0, 20)
      const exists = await this.eventRepository.existsByCode(candidate)

      if (!exists) {
        return candidate
      }
    }

    throw new Error('Unable to generate a unique event code')
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 12)
  }
}
