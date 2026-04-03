import { DataSource } from 'typeorm'

import databaseConfig from '#config/database'

export const AppDataSource = new DataSource(databaseConfig)
