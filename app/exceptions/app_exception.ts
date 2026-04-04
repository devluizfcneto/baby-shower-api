import type { ErrorCode } from '#constants/error_code'

export interface AppErrorItem {
  code: ErrorCode | string
  message: string
  field?: string
  meta?: Record<string, unknown>
}

export interface AppErrorResponse {
  errors: AppErrorItem[]
}

export class AppException extends Error {
  readonly status: number
  readonly errors: AppErrorItem[]

  constructor(status: number, errors: AppErrorItem[]) {
    super(errors[0]?.message ?? 'Application error')
    this.name = 'AppException'
    this.status = status
    this.errors = errors
  }

  static fromItem(status: number, error: AppErrorItem) {
    return new AppException(status, [error])
  }
}
