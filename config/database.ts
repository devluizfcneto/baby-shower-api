import type { DataSourceOptions } from 'typeorm'

import env from '#start/env'

import { User } from '../app/entities/user.js'

const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: env.get('DB_HOST'),
  port: env.get('DB_PORT'),
  username: env.get('DB_USER'),
  password: env.get('DB_PASSWORD'),
  database: env.get('DB_NAME'),
  synchronize: env.get('DB_SYNCHRONIZE'),
  logging: env.get('DB_LOGGING'),
  entities: [User],
}

export default databaseConfig
