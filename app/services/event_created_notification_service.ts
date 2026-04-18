import { inject } from '@adonisjs/core'

import env from '#start/env'
import { EventRepository } from '#repositories/event_repository'
import { DateTimeFormatterService } from '#services/date_time_formatter_service'
import { MailDispatcherService } from '#services/mail_dispatcher_service'

type EventCreatedPayload = {
  eventCode: string
  eventName: string
  eventDate: Date
}

@inject()
export class EventCreatedNotificationService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly dateTimeFormatterService: DateTimeFormatterService,
    private readonly mailDispatcherService: MailDispatcherService
  ) {}

  async sendAdminEventCreated(payload: EventCreatedPayload): Promise<void> {
    const eventContext = await this.eventRepository.findMailContextByCode(payload.eventCode)

    if (!eventContext?.adminEmail) {
      return
    }

    const publicUrl = `${env.get('APP_URL')}evento/${payload.eventCode}`
    const eventDateText = this.dateTimeFormatterService.formatForEndUser(payload.eventDate)

    await this.mailDispatcherService.sendLater({
      to: eventContext.adminEmail,
      subject: `Evento criado: ${payload.eventName}`,
      html: `<h1>Evento criado com sucesso</h1><p>Seu evento <strong>${payload.eventName}</strong> foi criado.</p><p>Data: ${eventDateText}</p><p>Link publico: <a href="${publicUrl}">${publicUrl}</a></p>`,
      text: `Evento criado com sucesso\n\nNome: ${payload.eventName}\nData: ${eventDateText}\nLink publico: ${publicUrl}`,
    })
  }
}
