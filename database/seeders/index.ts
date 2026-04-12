import AdminDonationsTableSeeder from './admin_donations_table_seeder.ts'
import AdminGuestConfirmationsTableSeeder from './admin_guest_confirmations_table_seeder.js'
import AdminPurchaseConfirmationsTableSeeder from './admin_purchase_confirmations_table_seeder.js'
import CompanionsTableSeeder from './companions_table_seeder.js'
import DonationsTableSeeder from './donations_table_seeder.js'
import EventsTableSeeder from './events_table_seeder.js'
import GiftsTableSeeder from './gifts_table_seeder.js'
import GuestsTableSeeder from './guests_table_seeder.js'
import PurchaseConfirmationsTableSeeder from './purchase_confirmations_table_seeder.js'
import UsersTableSeeder from './users_table_seeder.js'

import type { SeederConstructor } from './contracts.js'

export const seeders: SeederConstructor[] = [
  UsersTableSeeder,
  EventsTableSeeder,
  GiftsTableSeeder,
  PurchaseConfirmationsTableSeeder,
  GuestsTableSeeder,
  CompanionsTableSeeder,
  AdminGuestConfirmationsTableSeeder,
  AdminPurchaseConfirmationsTableSeeder,
  AdminDonationsTableSeeder,
  DonationsTableSeeder,
]
