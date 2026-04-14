import { ErrorCode } from '#constants/error_code'

import {
  ConflictException,
  ForbiddenException,
  InternalServerException,
  NotFoundException,
} from './http_exceptions.js'

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

export class EventForbiddenException extends ForbiddenException {
  constructor(message = 'Voce nao possui acesso a este evento.') {
    super([{ code: ErrorCode.EVENT_FORBIDDEN, message }])
    this.name = 'EventForbiddenException'
  }
}

export class EventConfigNotFoundException extends NotFoundException {
  constructor(message = 'Configuracao do evento nao encontrada.') {
    super([{ code: ErrorCode.EVENT_CONFIG_NOT_FOUND, message }])
    this.name = 'EventConfigNotFoundException'
  }
}

export class EventConfigUpdateFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel atualizar as configuracoes do evento agora.') {
    super([{ code: ErrorCode.EVENT_CONFIG_UPDATE_FAILED, message }])
    this.name = 'EventConfigUpdateFailedException'
  }
}

export class GiftListFetchFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel carregar a lista de presentes agora.') {
    super([{ code: ErrorCode.GIFT_LIST_FETCH_FAILED, message }])
    this.name = 'GiftListFetchFailedException'
  }
}

export class AdminGiftListFetchFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel carregar a lista de presentes do painel agora.') {
    super([{ code: ErrorCode.ADMIN_GIFT_LIST_FETCH_FAILED, message }])
    this.name = 'AdminGiftListFetchFailedException'
  }
}

export class AdminGuestListFetchFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel carregar a lista de confirmacoes agora.') {
    super([{ code: ErrorCode.ADMIN_GUEST_LIST_FETCH_FAILED, message }])
    this.name = 'AdminGuestListFetchFailedException'
  }
}

export class AdminPurchaseConfirmationListFetchFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel carregar a lista de confirmacoes de compra agora.') {
    super([{ code: ErrorCode.ADMIN_PURCHASE_CONFIRMATION_LIST_FETCH_FAILED, message }])
    this.name = 'AdminPurchaseConfirmationListFetchFailedException'
  }
}

export class AdminDonationListFetchFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel carregar a lista de doacoes agora.') {
    super([{ code: ErrorCode.ADMIN_DONATION_LIST_FETCH_FAILED, message }])
    this.name = 'AdminDonationListFetchFailedException'
  }
}

export class AdminExportReportFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel exportar o relatorio agora.') {
    super([{ code: ErrorCode.ADMIN_EXPORT_REPORT_FAILED, message }])
    this.name = 'AdminExportReportFailedException'
  }
}

export class RsvpEventUnavailableException extends NotFoundException {
  constructor(message = 'Evento indisponivel para confirmacao no momento.') {
    super([{ code: ErrorCode.RSVP_EVENT_UNAVAILABLE, message }])
    this.name = 'RsvpEventUnavailableException'
  }
}

export class RsvpAlreadyConfirmedException extends ConflictException {
  constructor(message = 'Presence already confirmed for this email.') {
    super([{ code: ErrorCode.RSVP_ALREADY_CONFIRMED, message, field: 'email' }])
    this.name = 'RsvpAlreadyConfirmedException'
  }
}

export class RsvpPersistFailedException extends InternalServerException {
  constructor(message = 'Could not confirm presence right now.') {
    super([{ code: ErrorCode.RSVP_PERSIST_FAILED, message }])
    this.name = 'RsvpPersistFailedException'
  }
}

export class GiftNotFoundException extends NotFoundException {
  constructor(message = 'Presente nao encontrado.') {
    super([{ code: ErrorCode.GIFT_NOT_FOUND, message }])
    this.name = 'GiftNotFoundException'
  }
}

export class GiftBlockedException extends ConflictException {
  constructor(message = 'Este presente esta indisponivel no momento.') {
    super([{ code: ErrorCode.GIFT_BLOCKED, message }])
    this.name = 'GiftBlockedException'
  }
}

export class GiftLimitExceededException extends ConflictException {
  constructor(message = 'Este presente atingiu o limite de confirmacoes.') {
    super([{ code: ErrorCode.GIFT_LIMIT_EXCEEDED, message, field: 'quantity' }])
    this.name = 'GiftLimitExceededException'
  }
}

export class GiftMaxQuantityLowerThanConfirmedException extends ConflictException {
  constructor(message = 'A quantidade maxima nao pode ser menor que a quantidade ja confirmada.') {
    super([
      {
        code: ErrorCode.GIFT_MAX_QUANTITY_LT_CONFIRMED,
        message,
        field: 'maxQuantity',
      },
    ])
    this.name = 'GiftMaxQuantityLowerThanConfirmedException'
  }
}

export class GiftHasPurchaseConfirmationsException extends ConflictException {
  constructor(message = 'Este presente possui confirmacoes de compra e nao pode ser removido.') {
    super([{ code: ErrorCode.GIFT_HAS_PURCHASE_CONFIRMATIONS, message }])
    this.name = 'GiftHasPurchaseConfirmationsException'
  }
}

export class GiftCreateFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel criar o presente agora.') {
    super([{ code: ErrorCode.GIFT_CREATE_FAILED, message }])
    this.name = 'GiftCreateFailedException'
  }
}

export class GiftUpdateFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel atualizar o presente agora.') {
    super([{ code: ErrorCode.GIFT_UPDATE_FAILED, message }])
    this.name = 'GiftUpdateFailedException'
  }
}

export class GiftDeleteFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel remover o presente agora.') {
    super([{ code: ErrorCode.GIFT_DELETE_FAILED, message }])
    this.name = 'GiftDeleteFailedException'
  }
}

export class PurchaseConfirmationPersistFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel confirmar a compra agora.') {
    super([{ code: ErrorCode.PURCHASE_CONFIRMATION_PERSIST_FAILED, message }])
    this.name = 'PurchaseConfirmationPersistFailedException'
  }
}

export class DonationEventUnavailableException extends NotFoundException {
  constructor(message = 'Evento indisponivel para registro de doacao no momento.') {
    super([{ code: ErrorCode.DONATION_EVENT_UNAVAILABLE, message }])
    this.name = 'DonationEventUnavailableException'
  }
}

export class DonationPersistFailedException extends InternalServerException {
  constructor(message = 'Nao foi possivel registrar a doacao neste momento.') {
    super([{ code: ErrorCode.DONATION_PERSIST_FAILED, message }])
    this.name = 'DonationPersistFailedException'
  }
}
