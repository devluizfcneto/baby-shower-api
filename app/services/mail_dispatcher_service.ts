import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'

type DispatchMailInput = {
  to: string
  subject: string
  html: string
  text: string
}

@inject()
export class MailDispatcherService {
  async sendLater(input: DispatchMailInput): Promise<void> {
    await mail.sendLater((message) => {
      message.to(input.to).subject(input.subject).html(input.html).text(input.text)
    })
  }
}
