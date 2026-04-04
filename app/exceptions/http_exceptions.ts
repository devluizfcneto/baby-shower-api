import { ErrorCode } from '#constants/error_code'

import { AppException, type AppErrorItem } from './app_exception.js'

export class BadRequestException extends AppException {
  constructor(errors: AppErrorItem[]) {
    super(400, errors)
    this.name = 'BadRequestException'
  }

  static single(message: string, code: string = ErrorCode.BAD_REQUEST, field?: string) {
    return new BadRequestException([{ message, code, field }])
  }
}

export class UnauthorizedException extends AppException {
  constructor(errors: AppErrorItem[]) {
    super(401, errors)
    this.name = 'UnauthorizedException'
  }

  static single(message: string, code: string = ErrorCode.UNAUTHORIZED, field?: string) {
    return new UnauthorizedException([{ message, code, field }])
  }
}

export class ForbiddenException extends AppException {
  constructor(errors: AppErrorItem[]) {
    super(403, errors)
    this.name = 'ForbiddenException'
  }

  static single(message: string, code: string = ErrorCode.FORBIDDEN, field?: string) {
    return new ForbiddenException([{ message, code, field }])
  }
}

export class NotFoundException extends AppException {
  constructor(errors: AppErrorItem[]) {
    super(404, errors)
    this.name = 'NotFoundException'
  }

  static single(message: string, code: string = ErrorCode.NOT_FOUND, field?: string) {
    return new NotFoundException([{ message, code, field }])
  }
}

export class ConflictException extends AppException {
  constructor(errors: AppErrorItem[]) {
    super(409, errors)
    this.name = 'ConflictException'
  }

  static single(message: string, code: string = ErrorCode.CONFLICT, field?: string) {
    return new ConflictException([{ message, code, field }])
  }
}

export class UnprocessableEntityException extends AppException {
  constructor(errors: AppErrorItem[]) {
    super(422, errors)
    this.name = 'UnprocessableEntityException'
  }

  static single(message: string, code: string = ErrorCode.UNPROCESSABLE_ENTITY, field?: string) {
    return new UnprocessableEntityException([{ message, code, field }])
  }
}

export class InternalServerException extends AppException {
  constructor(errors: AppErrorItem[]) {
    super(500, errors)
    this.name = 'InternalServerException'
  }

  static single(message: string, code: string = ErrorCode.INTERNAL_SERVER_ERROR, field?: string) {
    return new InternalServerException([{ message, code, field }])
  }
}
