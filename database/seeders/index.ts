import CompanionsTableSeeder from './companions_table_seeder.js'
import EventsTableSeeder from './events_table_seeder.js'
import GiftsTableSeeder from './gifts_table_seeder.js'
import GuestsTableSeeder from './guests_table_seeder.js'
import UsersTableSeeder from './users_table_seeder.js'

import type { SeederConstructor } from './contracts.js'

export const seeders: SeederConstructor[] = [
  UsersTableSeeder,
  EventsTableSeeder,
  GiftsTableSeeder,
  GuestsTableSeeder,
  CompanionsTableSeeder,
]
