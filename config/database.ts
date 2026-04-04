import type { DataSourceOptions } from 'typeorm'
import { join } from 'node:path'

import env from '#start/env'

import { Event } from '../app/entities/event.js'
import { UserSession } from '../app/entities/user_session.js'
import { User } from '../app/entities/user.js'

const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: env.get('DB_HOST'),
  port: env.get('DB_PORT'),
  username: env.get('DB_USER'),
  password: env.get('DB_PASSWORD'),
  database: env.get('DB_NAME'),
  synchronize: env.get('NODE_ENV') === 'production' ? false : env.get('DB_SYNCHRONIZE'),
  logging: env.get('DB_LOGGING'),
  entities: [User, Event, UserSession],
  migrations: [
    join(process.cwd(), 'database/migrations/*.{ts,js}'),
    join(process.cwd(), 'build/database/migrations/*.js'),
  ],
  migrationsTableName: 'typeorm_migrations',
}

export default databaseConfig
