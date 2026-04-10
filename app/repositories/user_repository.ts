import type { Repository } from 'typeorm'

import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

type CreateUserInput = {
  name: string
  email: string
  password: string
}

export class UserRepository {
  constructor(private readonly repository: Repository<User> = AppDataSource.getRepository(User)) {}

  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email', { email })
      .getOne()
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email })
      .getOne()
  }

  async findById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id } })
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const user = this.repository.create(input)
    return this.repository.save(user)
  }
}
