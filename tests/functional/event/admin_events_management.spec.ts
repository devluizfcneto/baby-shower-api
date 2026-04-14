import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import { Event } from '#entities/event'
import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Events Management', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE user_sessions, users, donations, purchase_confirmations, companions, guests, gifts, events RESTART IDENTITY CASCADE'
    )
  })

  async function createAdmin(email: string, password = 'StrongPass#2026') {
    const passwordHash = await hash.make(password)

    return AppDataSource.getRepository(User).save({
      name: 'Admin',
      email,
      password: passwordHash,
    })
  }

  async function login(client: any, email: string, password = 'StrongPass#2026') {
    const response = await client.post('/api/admin/login').json({ email, password })
    response.assertStatus(200)
    return response.body().accessToken as string
  }

  test('GET /api/admin/events lists only events owned by authenticated admin', async ({
    client,
    assert,
  }) => {
    const adminA = await createAdmin('admin-a@baby-shower.local')
    const adminB = await createAdmin('admin-b@baby-shower.local')

    await AppDataSource.getRepository(Event).save([
      {
        adminId: adminA.id,
        code: 'eventoa1',
        name: 'Evento A1',
        date: new Date('2026-06-18T15:00:00.000Z'),
        venueAddress: 'Rua A1',
        isArchived: false,
      },
      {
        adminId: adminA.id,
        code: 'eventoa2',
        name: 'Evento A2',
        date: new Date('2026-06-19T15:00:00.000Z'),
        venueAddress: 'Rua A2',
        isArchived: true,
      },
      {
        adminId: adminB.id,
        code: 'eventob1',
        name: 'Evento B1',
        date: new Date('2026-06-20T15:00:00.000Z'),
        venueAddress: 'Rua B1',
        isArchived: false,
      },
    ])

    const token = await login(client, 'admin-a@baby-shower.local')

    const response = await client
      .get('/api/admin/events')
      .header('authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data.length, 2)
    assert.deepEqual(body.data.map((row: any) => row.code).sort(), ['eventoa1', 'eventoa2'])
  })

  test('POST /api/admin/events creates event linked to authenticated admin', async ({
    client,
    assert,
  }) => {
    const admin = await createAdmin('admin-create@baby-shower.local')
    const token = await login(client, 'admin-create@baby-shower.local')

    const response = await client
      .post('/api/admin/events')
      .header('authorization', `Bearer ${token}`)
      .json({
        name: 'Cha da Helena',
        date: '2026-06-18T15:00:00.000Z',
        venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      })

    response.assertStatus(201)

    const createdCode = response.body().data.code as string
    const created = await AppDataSource.getRepository(Event).findOneByOrFail({ code: createdCode })

    assert.equal(created.adminId, admin.id)
    assert.equal(created.name, 'Cha da Helena')
  })

  test('GET/PATCH by code and archive endpoint respect ownership', async ({ client }) => {
    const owner = await createAdmin('owner@baby-shower.local')
    await createAdmin('other@baby-shower.local')

    await AppDataSource.getRepository(Event).save({
      adminId: owner.id,
      code: 'event-owner',
      name: 'Evento Owner',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Rua Owner',
      isArchived: false,
    })

    const ownerToken = await login(client, 'owner@baby-shower.local')
    const otherToken = await login(client, 'other@baby-shower.local')

    const ownerGet = await client
      .get('/api/admin/events/by-code/event-owner')
      .header('authorization', `Bearer ${ownerToken}`)

    ownerGet.assertStatus(200)

    const otherGet = await client
      .get('/api/admin/events/by-code/event-owner')
      .header('authorization', `Bearer ${otherToken}`)

    otherGet.assertStatus(404)

    const patchResponse = await client
      .patch('/api/admin/events/by-code/event-owner')
      .header('authorization', `Bearer ${ownerToken}`)
      .json({ name: 'Evento Owner Atualizado' })

    patchResponse.assertStatus(200)

    const archiveResponse = await client
      .patch('/api/admin/events/by-code/event-owner/archive')
      .header('authorization', `Bearer ${ownerToken}`)
      .json({ isArchived: true })

    archiveResponse.assertStatus(200)
  })

  test('DELETE /api/admin/events/by-code/:eventCode requires matching confirmation name', async ({
    client,
  }) => {
    const owner = await createAdmin('delete-owner@baby-shower.local')

    await AppDataSource.getRepository(Event).save({
      adminId: owner.id,
      code: 'event-delete',
      name: 'Evento para Excluir',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Rua Delete',
      isArchived: false,
    })

    const token = await login(client, 'delete-owner@baby-shower.local')

    const conflict = await client
      .delete('/api/admin/events/by-code/event-delete')
      .header('authorization', `Bearer ${token}`)
      .json({ confirmationName: 'Nome Errado' })

    conflict.assertStatus(409)

    const ok = await client
      .delete('/api/admin/events/by-code/event-delete')
      .header('authorization', `Bearer ${token}`)
      .json({ confirmationName: 'Evento para Excluir' })

    ok.assertStatus(204)
  })
})
