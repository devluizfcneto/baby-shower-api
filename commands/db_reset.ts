import { BaseCommand, flags } from '@adonisjs/core/ace'

import { AppDataSource } from '#services/database_service'

export default class DbReset extends BaseCommand {
  static commandName = 'db:reset'
  static description = 'Drop public schema and recreate database using migrations and seeders'
  static options = {
    startApp: true,
  }

  @flags.boolean({
    description: 'Confirm destructive database reset',
    alias: 'f',
  })
  declare force: boolean

  async run() {
    if (!this.force) {
      this.logger.error('This command is destructive. Re-run with --force to continue.')
      return
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }

    await AppDataSource.query('DROP SCHEMA IF EXISTS public CASCADE')
    await AppDataSource.query('CREATE SCHEMA public')

    this.logger.info('Public schema dropped and recreated')

    const executedMigrations = await AppDataSource.runMigrations()

    if (executedMigrations.length === 0) {
      this.logger.info('No pending migrations found after reset')
    } else {
      this.logger.success(`Executed ${executedMigrations.length} migration(s)`)
      for (const migration of executedMigrations) {
        this.logger.info(`- ${migration.name}`)
      }
    }

    await this.kernel.exec('db:seed', [])

    this.logger.success('Database reset completed')
  }
}
