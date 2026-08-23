const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

router.get('/api/user/profile', usersController.getProfile);
router.put('/api/user/email', usersController.updateEmail);
router.put('/api/user/phone', usersController.updatePhone);
router.put('/api/user/address', usersController.updateAddress);

router.get('/cart', usersController.getCart);
router.post('/cart/update', usersController.updateCart);
router.post('/cart/clear', usersController.clearCart);

router.get('/users', usersController.getUsers);
router.post('/users', usersController.createUser);
router.put('/users/:id', usersController.updateUser);
router.delete('/users/:id', usersController.deleteUser);

module.exports = router;