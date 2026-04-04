import vine from '@vinejs/vine'

export const refreshSessionValidator = vine.create({
  refreshToken: vine.string().trim().minLength(20),
})

export const logoutSessionValidator = vine.create({
  refreshToken: vine.string().trim().minLength(20),
})
