const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');

router.post('/orders', ordersController.createOrder);
router.get('/admin/orders', ordersController.getAdminOrders);
router.put('/admin/orders/:id/status', ordersController.updateOrderStatus);
router.get('/api/user/orders', ordersController.getUserOrders);

module.exports = router;