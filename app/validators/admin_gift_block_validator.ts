import vine from '@vinejs/vine'

export const adminGiftBlockValidator = vine.create({
  isBlocked: vine.boolean(),
})
