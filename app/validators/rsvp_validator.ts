import vine from '@vinejs/vine'

const companionSchema = vine.object({
  fullName: vine.string().trim().minLength(2).maxLength(200),
  email: vine.string().trim().email().maxLength(200).optional(),
})

export const rsvpValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(200),
  email: vine.string().trim().email().maxLength(200),
  companions: vine.array(companionSchema).maxLength(2).optional(),
})
