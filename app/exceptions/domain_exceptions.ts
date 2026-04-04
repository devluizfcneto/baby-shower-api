import { ErrorCode } from '#constants/error_code'

import { InternalServerException, NotFoundException } from './http_exceptions.js'

export class EventNotFoundException extends NotFoundException {
  constructor(message = 'Em breve!') {
    super([{ code: ErrorCode.EVENT_NOT_FOUND, message }])
    this.name = 'EventNotFoundException'
  }
}

export class EventFetchFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel carregar as informacoes do evento agora.') {
    super([{ code: ErrorCode.EVENT_FETCH_FAILED, message }])
    this.name = 'EventFetchFailedException'
  }
}
