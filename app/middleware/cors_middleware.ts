import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Global CORS middleware to support browser preflight requests (OPTIONS)
 * even when there is no explicit OPTIONS route registered.
 */
export default class CorsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    ctx.response.header('Access-Control-Allow-Origin', '*')
    ctx.response.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    ctx.response.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
    ctx.response.header('Access-Control-Max-Age', '86400')

    if (ctx.request.method() === 'OPTIONS') {
      return ctx.response.status(204).send('')
    }

    return next()
  }
}
