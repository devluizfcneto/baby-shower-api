import vine from '@vinejs/vine'

export const adminEventDeleteValidator = vine.create({
  confirmationName: vine.string().trim().minLength(3).maxLength(200),
})
