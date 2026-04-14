import { inject } from '@adonisjs/core'

import { MailDispatcherService } from '#services/mail_dispatcher_service'

type RsvpNotificationPayload = {
  eventName?: string
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
  constructor(private readonly mailDispatcherService: MailDispatcherService) {}

  async sendGuestConfirmation(payload: RsvpNotificationPayload) {
    await this.mailDispatcherService.sendLater({
      to: payload.guestEmail,
      subject: 'Confirmacao de presenca recebida',
      html: `<h1>Presenca confirmada</h1><p>Ola, ${payload.guestFullName}.</p><p>Sua confirmacao para ${payload.eventName ?? 'o evento'} foi recebida.</p>`,
      text: `Presenca confirmada\n\nOla, ${payload.guestFullName}. Sua confirmacao para ${payload.eventName ?? 'o evento'} foi recebida.`,
    })
  }

  async sendAdminNotification(payload: RsvpNotificationPayload) {
    if (!payload.adminEmail) {
      return
    }

    await this.mailDispatcherService.sendLater({
      to: payload.adminEmail,
      subject: 'Nova confirmacao de presenca',
      html: `<h1>Novo RSVP</h1><p>Convidado: ${payload.guestFullName} (${payload.guestEmail})</p><p>Acompanhantes: ${payload.companions.length}</p>`,
      text: `Novo RSVP\n\nConvidado: ${payload.guestFullName} (${payload.guestEmail})\nAcompanhantes: ${payload.companions.length}`,
    })
  }

  async sendCompanionConfirmation(
    payload: RsvpNotificationPayload,
    companion: RsvpNotificationPayload['companions'][number]
  ) {
    await this.mailDispatcherService.sendLater({
      to: companion.email,
      subject: 'Confirmacao de participacao como acompanhante',
      html: `<h1>Participacao confirmada</h1><p>Ola, ${companion.fullName}.</p><p>Seu convite como acompanhante foi registrado junto com ${payload.guestFullName}.</p>`,
      text: `Participacao confirmada\n\nOla, ${companion.fullName}. Seu convite como acompanhante foi registrado junto com ${payload.guestFullName}.`,
    })
  }
}
