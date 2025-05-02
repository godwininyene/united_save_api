const express = require('express');
const authController = require('./../controllers/authController')
const loanController = require('./../controllers/loanController')

const router = express.Router({mergeParams:true});

// Protect all the routes below
router.use(authController.protect);

router.route('/')
    .post(
        authController.restrictTo('user'),
        loanController.createLoan
    )
    .get(
        loanController.getAllLoans
    )

router.route('/:id/action/:action').patch(authController.restrictTo('admin'), loanController.handleLoan)

module.exports = router;