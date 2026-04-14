import vine from '@vinejs/vine'

export const adminEventCodeParamValidator = vine.create({
  eventCode: vine.string().trim().minLength(3).maxLength(50),
})
