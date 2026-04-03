import type { ApplicationService } from '@adonisjs/core/types'

import { AppDataSource } from '#services/database_service'

export default class TypeormProvider {
  private isShuttingDown = false
  private retryTimer?: NodeJS.Timeout
  private initializingPromise: Promise<void> | null = null

  constructor(protected app: ApplicationService) {}

  async boot() {
    await this.tryInitialize()

    if (!AppDataSource.isInitialized) {
      this.scheduleReconnect()
    }
  }

  async shutdown() {
    this.isShuttingDown = true

    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }

    if (this.initializingPromise) {
      await this.initializingPromise.catch(() => undefined)
    }

    if (!AppDataSource.isInitialized) {
      return
    }

    try {
      await AppDataSource.destroy()
    } catch (error) {
      this.logError('typeorm shutdown failed', error)
    }
  }

  private async tryInitialize() {
    if (this.isShuttingDown || AppDataSource.isInitialized) {
      return
    }

    if (this.initializingPromise) {
      await this.initializingPromise
      return
    }

    this.initializingPromise = (async () => {
      try {
        await AppDataSource.initialize()
      } catch (error) {
        this.logError('typeorm initialization failed', error)
      } finally {
        this.initializingPromise = null
      }
    })()

    await this.initializingPromise
  }

  private scheduleReconnect() {
    if (this.isShuttingDown || AppDataSource.isInitialized || this.retryTimer) {
      return
    }

    this.retryTimer = setTimeout(async () => {
      this.retryTimer = undefined

      await this.tryInitialize()

      if (!AppDataSource.isInitialized) {
        this.scheduleReconnect()
      }
    }, 5000)

    this.retryTimer.unref?.()
  }

  private logError(message: string, error: unknown) {
    const details =
      error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error)
    process.stderr.write(`[typeorm_provider] ${message}: ${details}\n`)
  }
}
