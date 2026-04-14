import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'

type DispatchMailInput = {
  to: string
  subject: string
  html?: string
  text: string
  view?: string
  viewData?: Record<string, unknown>
}

@inject()
export class MailDispatcherService {
  async sendLater(input: DispatchMailInput): Promise<void> {
    const startedAt = Date.now()

    try {
      await mail.sendLater((message) => {
        message.to(input.to).subject(input.subject).text(input.text)

        if (input.view) {
          message.htmlView(input.view, input.viewData ?? {})
          return
        }

        if (input.html) {
          message.html(input.html)
        }
      })

      logger.info({
        event: 'mail.dispatcher.send_later.success',
        to: input.to,
        subject: input.subject,
        view: input.view ?? null,
        durationMs: Date.now() - startedAt,
      })
    } catch (error) {
      logger.error({
        event: 'mail.dispatcher.send_later.failed',
        to: input.to,
        subject: input.subject,
        view: input.view ?? null,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }
}
