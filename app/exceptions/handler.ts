import app from '@adonisjs/core/services/app'
import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'

import { AppException, type AppErrorResponse } from './app_exception.js'
import { mapUnknownErrorToAppResponse } from './error_mapper.js'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    const now = new Date()
    if (error instanceof AppException) {
      const payload: AppErrorResponse = { errors: error.errors }
      console.error(`[${now.toISOString()}] Error info: ${JSON.stringify(payload)} \n${error}`)
      return ctx.response.status(error.status).send(payload)
    }

    const mapped = mapUnknownErrorToAppResponse(error, !app.inProduction)
    console.error(`[${now.toISOString()}] Error info: ${JSON.stringify(mapped.payload)} \n${error}`)
    return ctx.response.status(mapped.status).send(mapped.payload)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    if (error instanceof AppException && error.status < 500) {
      return
    }

    return super.report(error, ctx)
  }
}
