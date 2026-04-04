import { BaseCommand } from '@adonisjs/core/ace'

import { AppDataSource } from '#services/database_service'

export default class DbMigrate extends BaseCommand {
  static commandName = 'db:migrate'
  static description = 'Run pending TypeORM migrations'
  static options = {
    startApp: true,
  }

  async run() {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }

    const executedMigrations = await AppDataSource.runMigrations()

    if (executedMigrations.length === 0) {
      this.logger.info('No pending migrations found')
      return
    }

    this.logger.success(`Executed ${executedMigrations.length} migration(s)`)

    for (const migration of executedMigrations) {
      this.logger.info(`- ${migration.name}`)
    }
  }
}
