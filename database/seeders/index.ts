import EventsTableSeeder from './events_table_seeder.js'
import UsersTableSeeder from './users_table_seeder.js'

import type { SeederConstructor } from './contracts.js'

export const seeders: SeederConstructor[] = [UsersTableSeeder, EventsTableSeeder]
