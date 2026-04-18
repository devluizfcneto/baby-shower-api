import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Global CORS middleware to support browser preflight requests (OPTIONS)
 * even when there is no explicit OPTIONS route registered.
 */
export default class CorsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const origin = ctx.request.header('origin')
    const allowedOrigins = this.getAllowedOrigins()

    ctx.response.header('Vary', 'Origin')

    if (origin && allowedOrigins.has(origin)) {
      ctx.response.header('Access-Control-Allow-Origin', origin)
      ctx.response.header('Access-Control-Allow-Credentials', 'true')
      ctx.response.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
      ctx.response.header(
        'Access-Control-Allow-Headers',
        ctx.request.header('access-control-request-headers') ??
          'Content-Type, Authorization, X-Requested-With'
      )
      ctx.response.header('Access-Control-Max-Age', '86400')
    }

    if (ctx.request.method() === 'OPTIONS') {
      if (origin && !allowedOrigins.has(origin)) {
        return ctx.response.status(403).send('Origin not allowed by CORS policy')
      }

      return ctx.response.status(204).send('')
    }

    return next()
  }

  private getAllowedOrigins(): Set<string> {
    const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (configuredOrigins.length > 0) {
      return new Set(configuredOrigins)
    }

    return new Set(['http://localhost:5173', 'http://localhost:3000'])
  }
}
