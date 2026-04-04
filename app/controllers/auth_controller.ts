import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import type { Secret, SignOptions } from 'jsonwebtoken'

import { ErrorCode } from '#constants/error_code'
import { AppException } from '#exceptions/app_exception'
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '#exceptions/http_exceptions'
import env from '#start/env'
import { AppDataSource } from '#services/database_service'
import { loginValidator, registerValidator } from '#validators/auth_validator'

import { User } from '../entities/user.js'

type AuthPayload = JwtPayload & {
  sub: number
  email: string
}

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const { name, email, password } = await registerValidator.validate(request.all())

    const userRepository = AppDataSource.getRepository(User)
    const existingUser = await userRepository.findOne({ where: { email } })

    if (existingUser) {
      throw ConflictException.single(
        'Email already in use',
        ErrorCode.EMAIL_ALREADY_IN_USE,
        'email'
      )
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
    const { email, password } = await loginValidator.validate(request.all())

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne()

    if (!user) {
      throw UnauthorizedException.single('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
    }

    const passwordMatches = await hash.verify(user.password, password)

    if (!passwordMatches) {
      throw UnauthorizedException.single('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
    }

    return response.ok({
      user: this.toPublicUser(user),
      token: this.signToken(user),
    })
  }

  async me({ request, response }: HttpContext) {
    const authHeader = request.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw UnauthorizedException.single(
        'Missing bearer token',
        ErrorCode.MISSING_BEARER_TOKEN,
        'authorization'
      )
    }

    const token = authHeader.slice(7)

    try {
      const payload = jwt.verify(token, env.get('JWT_SECRET')) as AuthPayload

      const userRepository = AppDataSource.getRepository(User)
      const user = await userRepository.findOne({ where: { id: payload.sub } })

      if (!user) {
        throw NotFoundException.single('User not found', ErrorCode.USER_NOT_FOUND)
      }

      return response.ok({ user: this.toPublicUser(user) })
    } catch (error) {
      if (error instanceof AppException) {
        throw error
      }

      throw UnauthorizedException.single(
        'Invalid or expired token',
        ErrorCode.INVALID_OR_EXPIRED_TOKEN,
        'authorization'
      )
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
