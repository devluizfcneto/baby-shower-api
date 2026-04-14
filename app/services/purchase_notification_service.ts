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
  confirmedAt: Date
}

@inject()
export class PurchaseNotificationService {
  constructor(private readonly mailDispatcherService: MailDispatcherService) {}

  async sendAdminPurchaseNotification(payload: PurchaseNotificationPayload) {
    if (!payload.adminEmail) {
      return
    }

    await this.mailDispatcherService.sendLater({
      to: payload.adminEmail,
      subject: `Nova confirmacao de compra: ${payload.giftName}`,
      html: `<h1>Nova confirmacao de compra</h1><p>Evento: ${payload.eventName ?? 'N/D'}</p><p>Presente: ${payload.giftName}</p><p>Convidado: ${payload.guestName} (${payload.guestEmail})</p><p>Quantidade: ${payload.quantity}</p>`,
      text: `Nova confirmacao de compra\n\nEvento: ${payload.eventName ?? 'N/D'}\nPresente: ${payload.giftName}\nConvidado: ${payload.guestName} (${payload.guestEmail})\nQuantidade: ${payload.quantity}`,
    })
  }
}
