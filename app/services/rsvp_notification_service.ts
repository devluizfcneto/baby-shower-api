import { inject } from '@adonisjs/core'

import { DateTimeFormatterService } from '#services/date_time_formatter_service'
import { MailDispatcherService } from '#services/mail_dispatcher_service'

type RsvpNotificationPayload = {
  eventName?: string
  eventStartAt?: Date
  eventVenueAddress?: string
  adminEmail?: string | null
  guestFullName: string
  guestEmail: string
  companions: Array<{
    fullName: string
    email: string
  }>
  confirmedAt: Date
}

@inject()
export class RsvpNotificationService {
  constructor(
    private readonly mailDispatcherService: MailDispatcherService,
    private readonly dateTimeFormatterService: DateTimeFormatterService
  ) {}

  async sendGuestConfirmation(payload: RsvpNotificationPayload) {
    const eventStartText = payload.eventStartAt
      ? this.formatDateForEndUser(payload.eventStartAt)
      : 'Horario a confirmar'
    const eventLocationText = payload.eventVenueAddress?.trim() || 'Local a confirmar'

    await this.mailDispatcherService.sendLater({
      to: payload.guestEmail,
      subject: 'Confirmacao de presenca recebida',
      view: 'emails/rsvp_guest_confirmation',
      viewData: {
        guestFullName: payload.guestFullName,
        eventName: payload.eventName ?? 'Nosso evento',
        eventStartText,
        eventLocationText,
        companions: payload.companions,
      },
      text: this.buildGuestConfirmationText({
        guestFullName: payload.guestFullName,
        eventName: payload.eventName ?? 'Nosso evento',
        eventStartText,
        eventLocationText,
        companions: payload.companions,
      }),
    })
  }

  async sendAdminNotification(payload: RsvpNotificationPayload) {
    if (!payload.adminEmail) {
      return
    }

    const confirmedAtText = this.formatDateForEndUser(payload.confirmedAt)

    await this.mailDispatcherService.sendLater({
      to: payload.adminEmail,
      subject: 'Nova confirmacao de presenca',
      html: `<h1>Novo RSVP</h1><p>Convidado: ${payload.guestFullName} (${payload.guestEmail})</p><p>Acompanhantes: ${payload.companions.length}</p><p>Confirmado em: ${confirmedAtText}</p>`,
      text: `Novo RSVP\n\nConvidado: ${payload.guestFullName} (${payload.guestEmail})\nAcompanhantes: ${payload.companions.length}\nConfirmado em: ${confirmedAtText}`,
    })
  }

  async sendCompanionConfirmation(
    payload: RsvpNotificationPayload,
    companion: RsvpNotificationPayload['companions'][number]
  ) {
    const eventStartText = payload.eventStartAt
      ? this.formatDateForEndUser(payload.eventStartAt)
      : 'Horario a confirmar'
    const eventLocationText = payload.eventVenueAddress?.trim() || 'Local a confirmar'

    await this.mailDispatcherService.sendLater({
      to: companion.email,
      subject: 'Confirmacao de participacao como acompanhante',
      view: 'emails/rsvp_companion_confirmation',
      viewData: {
        companionFullName: companion.fullName,
        hostGuestFullName: payload.guestFullName,
        eventName: payload.eventName ?? 'Nosso evento',
        eventStartText,
        eventLocationText,
      },
      text: this.buildCompanionConfirmationText({
        companionFullName: companion.fullName,
        hostGuestFullName: payload.guestFullName,
        eventName: payload.eventName ?? 'Nosso evento',
        eventStartText,
        eventLocationText,
      }),
    })
  }

  private formatDateForEndUser(date: Date): string {
    return this.dateTimeFormatterService.formatForEndUser(date)
  }

  private buildGuestConfirmationText(input: {
    guestFullName: string
    eventName: string
    eventStartText: string
    eventLocationText: string
    companions: Array<{
      fullName: string
      email: string
    }>
  }): string {
    const companionsLines =
      input.companions.length > 0
        ? input.companions.map((companion) => `- ${companion.fullName} <${companion.email}>`)
        : ['- Nenhum acompanhante informado']

    return [
      'Presenca confirmada',
      '',
      `Ola, ${input.guestFullName}.`,
      `Sua confirmacao para ${input.eventName} foi recebida.`,
      `Inicio: ${input.eventStartText}`,
      `Local: ${input.eventLocationText}`,
      '',
      'Acompanhantes informados:',
      ...companionsLines,
    ].join('\n')
  }

  private buildCompanionConfirmationText(input: {
    companionFullName: string
    hostGuestFullName: string
    eventName: string
    eventStartText: string
    eventLocationText: string
  }): string {
    return [
      'Participacao confirmada',
      '',
      `Ola, ${input.companionFullName}.`,
      `Seu convite foi registrado junto com ${input.hostGuestFullName}.`,
      `Evento: ${input.eventName}`,
      `Inicio: ${input.eventStartText}`,
      `Local: ${input.eventLocationText}`,
    ].join('\n')
  }
}
