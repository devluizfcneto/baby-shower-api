import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import type { Secret, SignOptions } from 'jsonwebtoken'

import env from '#start/env'
import { AppDataSource } from '#services/database_service'

import { User } from '../entities/user.js'

type AuthPayload = JwtPayload & {
  sub: number
  email: string
}

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const { name, email, password } = request.only(['name', 'email', 'password'])

    if (!name || !email || !password) {
      return response.badRequest({ message: 'name, email and password are required' })
    }

    const userRepository = AppDataSource.getRepository(User)
    const existingUser = await userRepository.findOne({ where: { email } })

    if (existingUser) {
      return response.conflict({ message: 'Email already in use' })
    }

    const hashedPassword = await hash.make(password)
    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
    })

    await userRepository.save(user)

    return response.created({
      user: this.toPublicUser(user),
      token: this.signToken(user),
    })
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    if (!email || !password) {
      return response.badRequest({ message: 'email and password are required' })
    }

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne()

    if (!user) {
      return response.unauthorized({ message: 'Invalid credentials' })
    }

    const passwordMatches = await hash.verify(user.password, password)

    if (!passwordMatches) {
      return response.unauthorized({ message: 'Invalid credentials' })
    }

    return response.ok({
      user: this.toPublicUser(user),
      token: this.signToken(user),
    })
  }

  async me({ request, response }: HttpContext) {
    const authHeader = request.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return response.unauthorized({ message: 'Missing bearer token' })
    }

    const token = authHeader.slice(7)

    try {
      const payload = jwt.verify(token, env.get('JWT_SECRET')) as AuthPayload

      const userRepository = AppDataSource.getRepository(User)
      const user = await userRepository.findOne({ where: { id: payload.sub } })

      if (!user) {
        return response.notFound({ message: 'User not found' })
      }

      return response.ok({ user: this.toPublicUser(user) })
    } catch {
      return response.unauthorized({ message: 'Invalid or expired token' })
    }
  }

  private signToken(user: User) {
    const secret = env.get('JWT_SECRET') as Secret
    const expiresIn = env.get('JWT_EXPIRES_IN') as SignOptions['expiresIn']

    return jwt.sign({ email: user.email }, secret, {
      subject: String(user.id),
      expiresIn,
    })
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
