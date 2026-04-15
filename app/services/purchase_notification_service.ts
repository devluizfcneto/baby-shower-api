import { inject } from '@adonisjs/core'

import { MailDispatcherService } from '#services/mail_dispatcher_service'

type PurchaseNotificationPayload = {
  adminEmail?: string | null
  eventName?: string
  giftId: number
  giftName: string
  guestName: string
  guestEmail: string
  quantity: number
  orderNumber: string | null
  notes: string | null
  confirmedAt: Date
}

@inject()
export class PurchaseNotificationService {
  constructor(private readonly mailDispatcherService: MailDispatcherService) {}

  async sendGuestPurchaseConfirmation(payload: PurchaseNotificationPayload) {
    await this.mailDispatcherService.sendLater({
      to: payload.guestEmail,
      subject: `Agradecimento pela lembranca: ${payload.giftName}`,
      view: 'emails/purchase_guest_confirmation',
      viewData: {
        guestName: payload.guestName,
        eventName: payload.eventName ?? 'Nosso evento',
        giftName: payload.giftName,
        quantity: payload.quantity,
      },
      text: this.buildGuestPurchaseConfirmationText({
        guestName: payload.guestName,
        eventName: payload.eventName ?? 'Nosso evento',
        giftName: payload.giftName,
        quantity: payload.quantity,
      }),
    })
  }

  async sendAdminPurchaseNotification(payload: PurchaseNotificationPayload) {
    if (!payload.adminEmail) {
      return
    }

    await this.mailDispatcherService.sendLater({
      to: payload.adminEmail,
      subject: `Nova confirmacao de compra: ${payload.giftName}`,
      view: 'emails/purchase_admin_notification',
      viewData: {
        eventName: payload.eventName ?? 'N/D',
        giftName: payload.giftName,
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        quantity: payload.quantity,
        notes: payload.notes,
      },
      text: this.buildAdminPurchaseNotificationText({
        eventName: payload.eventName ?? 'N/D',
        giftName: payload.giftName,
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        quantity: payload.quantity,
        notes: payload.notes,
      }),
    })
  }

  private buildGuestPurchaseConfirmationText(input: {
    guestName: string
    eventName: string
    giftName: string
    quantity: number
  }): string {
    return [
      'Lembranca confirmada',
      '',
      `Ola, ${input.guestName}.`,
      `Recebemos a confirmacao da sua compra para ${input.eventName}.`,
      `Produto: ${input.giftName}`,
      `Quantidade: ${input.quantity}`,
      '',
      'Os responsaveis agradecem pelo carinho e pela lembranca especial.',
    ].join('\n')
  }

  private buildAdminPurchaseNotificationText(input: {
    eventName: string
    giftName: string
    guestName: string
    guestEmail: string
    quantity: number
    notes: string | null
  }): string {
    return [
      'Nova confirmacao de compra',
      '',
      `Evento: ${input.eventName}`,
      `Convidado: ${input.guestName} (${input.guestEmail})`,
      `Produto: ${input.giftName}`,
      `Quantidade: ${input.quantity}`,
      `Mensagem de carinho: ${input.notes ?? 'Nao informada'}`,
    ].join('\n')
  }
}
