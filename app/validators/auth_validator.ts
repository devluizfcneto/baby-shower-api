import vine from '@vinejs/vine'
import { uniqueRule } from '#validators/rules/unique_rule'

export const registerValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120),
  email: vine
    .string()
    .trim()
    .email()
    .maxLength(180)
    .use(uniqueRule({ table: 'users', column: 'email' })),
  password: vine.string().minLength(8).maxLength(255),
})

export const loginValidator = vine.create({
  email: vine.string().trim().email().maxLength(180),
  password: vine.string().minLength(1).maxLength(255),
})
