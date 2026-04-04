import hash from '@adonisjs/core/services/hash'

import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class UsersTableSeeder implements Seeder {
  name = 'users'

  async run() {
    const userRepository = AppDataSource.getRepository(User)

    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@baby-shower.local'
    const name = process.env.SEED_ADMIN_NAME ?? 'Admin'
    const password = process.env.SEED_ADMIN_PASSWORD ?? '12345678'

    const existingUser = await userRepository.findOne({ where: { email } })

    if (existingUser) {
      return
    }

    const hashedPassword = await hash.make(password)

    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
    })

    await userRepository.save(user)
  }
}
