import vine from '@vinejs/vine'

export const adminEventArchiveValidator = vine.create({
  isArchived: vine.boolean(),
})
