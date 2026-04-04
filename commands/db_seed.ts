import { BaseCommand } from '@adonisjs/core/ace'
import { seeders } from '#database/seeders/index'
import { AppDataSource } from '#services/database_service'

export default class DbSeed extends BaseCommand {
  static commandName = 'db:seed'
  static description = 'Run TypeORM seeders from database/seeders'
  static options = {
    startApp: true,
  }

  async run() {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }

    for (const Seeder of seeders) {
      const seeder = new Seeder()
      this.logger.info(`Running seeder: ${seeder.name}`)
      await seeder.run()
      this.logger.info(`Seeder finished: ${seeder.name}`)
    }

    this.logger.success(`Seed completed (${seeders.length} seeder(s))`)
  }
}
