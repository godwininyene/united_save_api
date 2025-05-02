const authController = require('../controllers/authController');
const statsController = require('../controllers/statsController');
const express = require('express')
const router = express.Router();

//Protect all the routes below
router.use(authController.protect);

router.route('/admin')
.get(authController.restrictTo('admin'), statsController.getStatsForAdmin);
router.route('/users')
.get(authController.restrictTo('user'), statsController.getStatsForUser);

module.exports = router;


