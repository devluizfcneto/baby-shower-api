/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const AdminEventManagementController = () =>
  import('#controllers/admin_event_management_controller')
const AdminExportController = () => import('#controllers/admin_export_controller')
const AdminGuestController = () => import('#controllers/admin_guest_controller')
const AdminGiftController = () => import('#controllers/admin_gift_controller')
const AdminDonationController = () => import('#controllers/admin_donation_controller')
const AdminPurchaseConfirmationController = () =>
  import('#controllers/admin_purchase_confirmation_controller')
const DonationController = () => import('#controllers/donation_controller')
const EventAdminController = () => import('#controllers/event_admin_controller')
const EventController = () => import('#controllers/event_controller')
const GiftController = () => import('#controllers/gift_controller')
const PurchaseConfirmationController = () => import('#controllers/purchase_confirmation_controller')
const RsvpController = () => import('#controllers/rsvp_controller')

router.get('/', async () => 'It works!')
router
  .group(() => {
    router.get('/:eventCode', [EventController, 'showPublic'])
    router.get('/:eventCode/gifts', [GiftController, 'indexPublic'])
    router.post('/:eventCode/gifts/:giftId/confirm-purchase', [
      PurchaseConfirmationController,
      'store',
    ])
    router.post('/:eventCode/donations', [DonationController, 'store'])
    router.post('/:eventCode/rsvp', [RsvpController, 'store'])
  })
  .prefix('/api/events')
  .use(middleware.eventScope())

router
  .group(() => {
    router.post('/register', [AuthController, 'register']).as('auth.register')
    router.post('/login', [AuthController, 'login']).as('auth.login')
    router.post('/refresh', [AuthController, 'refresh']).as('auth.refresh')
    router.get('/user', [AuthController, 'show']).use(middleware.auth()).as('auth.user')
    router.get('/me', [AuthController, 'show']).use(middleware.auth()).as('auth.me')
    router.post('/logout', [AuthController, 'logout']).use(middleware.auth()).as('auth.logout')
    router
      .post('/logout-all', [AuthController, 'logoutAll'])
      .use(middleware.auth())
      .as('auth.logoutAll')
  })
  .prefix('/api/auth')

router
  .group(() => {
    router.post('/login', [AuthController, 'login']).as('adminAuth.login')
    router.post('/refresh', [AuthController, 'refresh']).as('adminAuth.refresh')
    router.get('/me', [AuthController, 'show']).use(middleware.auth()).as('adminAuth.me')
    router
      .group(() => {
        router.get('/events', [AdminEventManagementController, 'index']).as('adminEvents.index')
        router.post('/events', [AdminEventManagementController, 'store']).as('adminEvents.store')
        router
          .get('/events/by-code/:eventCode', [AdminEventManagementController, 'showByCode'])
          .as('adminEvents.showByCode')
        router
          .patch('/events/by-code/:eventCode', [AdminEventManagementController, 'updateByCode'])
          .as('adminEvents.updateByCode')
        router
          .patch('/events/by-code/:eventCode/archive', [
            AdminEventManagementController,
            'archiveByCode',
          ])
          .as('adminEvents.archiveByCode')
        router
          .delete('/events/by-code/:eventCode', [AdminEventManagementController, 'destroyByCode'])
          .as('adminEvents.destroyByCode')
      })
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [EventAdminController, 'show']).as('adminEvent.show')
        router.put('/', [EventAdminController, 'update']).as('adminEvent.update')
        router.get('/gifts', [AdminGiftController, 'index']).as('adminGift.index')
        router.get('/guests', [AdminGuestController, 'index']).as('adminGuest.index')
        router
          .get('/purchase-confirmations', [AdminPurchaseConfirmationController, 'index'])
          .as('adminPurchaseConfirmation.index')
        router.get('/donations', [AdminDonationController, 'index']).as('adminDonation.index')
        router.get('/export/guests', [AdminExportController, 'guests']).as('adminExport.guests')
        router
          .get('/export/purchases', [AdminExportController, 'purchases'])
          .as('adminExport.purchases')
        router.post('/gifts', [AdminGiftController, 'store']).as('adminGift.store')
        router.put('/gifts/:id', [AdminGiftController, 'update']).as('adminGift.update')
        router
          .put('/gifts/:id/block', [AdminGiftController, 'toggleBlock'])
          .as('adminGift.toggleBlock')
        router.delete('/gifts/:id', [AdminGiftController, 'destroy']).as('adminGift.destroy')
      })
      .prefix('/events/:eventId')
      .use(middleware.auth())
      .use(middleware.eventOwnership())

    router.post('/logout', [AuthController, 'logout']).use(middleware.auth()).as('adminAuth.logout')
    router
      .post('/logout-all', [AuthController, 'logoutAll'])
      .use(middleware.auth())
      .as('adminAuth.logoutAll')
  })
  .prefix('/api/admin')
