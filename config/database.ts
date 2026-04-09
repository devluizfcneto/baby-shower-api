import type { DataSourceOptions } from 'typeorm'
import { join } from 'node:path'

import env from '#start/env'

import { Companion } from '../app/entities/companion.js'
import { Donation } from '../app/entities/donation.js'
import { Event } from '../app/entities/event.js'
import { Gift } from '../app/entities/gift.js'
import { Guest } from '../app/entities/guest.js'
import { PurchaseConfirmation } from '../app/entities/purchase_confirmation.js'
import { UserSession } from '../app/entities/user_session.js'
import { User } from '../app/entities/user.js'

const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: env.get('DB_HOST'),
  port: env.get('DB_PORT'),
  username: env.get('DB_USER'),
  password: env.get('DB_PASSWORD'),
  database: env.get('DB_NAME'),
  synchronize: false,
  logging: env.get('DB_LOGGING'),
  entities: [User, Event, UserSession, Guest, Companion, Gift, PurchaseConfirmation, Donation],
  migrations: [
    join(process.cwd(), 'database/migrations/*.{ts,js}'),
    join(process.cwd(), 'build/database/migrations/*.js'),
  ],
  migrationsTableName: 'typeorm_migrations',
}

export default databaseConfig
