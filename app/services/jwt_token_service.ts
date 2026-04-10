import jwt, { type JwtPayload } from 'jsonwebtoken'
import type { Secret, SignOptions } from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

import env from '#start/env'

export type JwtAccessPayload = JwtPayload & {
  sub: string
  email: string
  typ: 'access'
}

export type JwtRefreshPayload = JwtPayload & {
  sub: string
  email: string
  sid: string
  typ: 'refresh'
}

type AccessTokenInput = {
  sub: number
  email: string
}

type RefreshTokenInput = {
  sub: number
  email: string
  sessionId: string
}

export class JwtTokenService {
  signAccessToken(input: AccessTokenInput) {
    const secret = this.getAccessSecret()
    const expiresIn = this.getAccessExpiresIn()

    return jwt.sign({ email: input.email, typ: 'access' }, secret, {
      subject: String(input.sub),
      expiresIn,
    })
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    const payload = jwt.verify(token, this.getAccessSecret()) as JwtAccessPayload

    if (payload.typ !== 'access') {
      throw new Error('Invalid access token type')
    }

    return payload
  }

  signRefreshToken(input: RefreshTokenInput) {
    return jwt.sign(
      { email: input.email, sid: input.sessionId, typ: 'refresh' },
      this.getRefreshSecret(),
      {
        subject: String(input.sub),
        expiresIn: this.getRefreshExpiresIn(),
        jwtid: randomUUID(),
      }
    )
  }

  verifyRefreshToken(token: string): JwtRefreshPayload {
    const payload = jwt.verify(token, this.getRefreshSecret()) as JwtRefreshPayload

    if (payload.typ !== 'refresh') {
      throw new Error('Invalid refresh token type')
    }

    return payload
  }

  getRefreshTokenExpirationDate() {
    const expiresIn = this.getRefreshExpiresIn()
    const now = Date.now()

    if (!expiresIn) {
      return new Date(now + 1 * 24 * 60 * 60 * 1000)
    }

    if (typeof expiresIn === 'number') {
      return new Date(now + expiresIn * 1000)
    }

    const match = /^(\d+)([smhd])$/.exec(expiresIn)
    if (!match) {
      return new Date(now + 1 * 24 * 60 * 60 * 1000)
    }

    const value = Number(match[1])
    const unit = match[2]
    const multiplierByUnit: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    }

    return new Date(now + value * (multiplierByUnit[unit] ?? 24 * 60 * 60 * 1000))
  }

  private getAccessSecret(): Secret {
    return env.get('JWT_SECRET') as Secret
  }

  private getAccessExpiresIn(): SignOptions['expiresIn'] {
    return env.get('JWT_EXPIRES_IN') as SignOptions['expiresIn']
  }

  private getRefreshSecret(): Secret {
    return (process.env.JWT_REFRESH_SECRET ?? env.get('JWT_SECRET')) as Secret
  }

  private getRefreshExpiresIn(): SignOptions['expiresIn'] {
    return (process.env.JWT_REFRESH_EXPIRES_IN ?? '1d') as SignOptions['expiresIn']
  }
}
