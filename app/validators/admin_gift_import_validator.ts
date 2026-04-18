import vine from '@vinejs/vine'

export const adminGiftImportValidator = vine.create({
  fileBase64: vine.string().trim().minLength(1),
  fileName: vine.string().trim().maxLength(255).optional(),
  fileType: vine.enum(['csv', 'xlsx']).optional(),
})
