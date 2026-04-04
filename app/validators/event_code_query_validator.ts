import vine from '@vinejs/vine'

export const eventCodeQueryValidator = vine.create({
  eventCode: vine.string().trim().minLength(6).maxLength(20),
})
