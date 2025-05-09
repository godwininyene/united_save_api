const express = require('express');
const authController = require('./../controllers/authController');
const userController = require('./../controllers/userController');
const transactionRouter = require('./../routes/transactionRoutes');
const loanRouter = require('./../routes/loanRoutes')
const walletController = require('./../controllers/walletController');
const { uploadUserDocuments, uploadUserPhoto, handleUploadErrors } = require('../utils/multerConfig');

const multer = require('multer')
const upload = multer();


const router = express.Router();

router.post(
    '/signup',
    // uploadUserDocuments,
    // handleUploadErrors,
    authController.signup
);

router.route('/login').post(authController.login);
router.get('/logout', authController.logout);
router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/resetPassword/:token').patch(authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.use('/me/transactions', transactionRouter);
router.use('/me/loans', loanRouter)

router.get('/me/wallet', walletController.getWallet)


router.route('/updateMyPassword').patch( authController.updatePassword);
router.route('/updateMe').patch(uploadUserPhoto, userController.updateMe);
router.route('/me').get(userController.getMe, userController.getUser);
router.route('/deleteMe').delete(userController.deleteMe);




//Restrict all routes below to admin only
router.use(authController.restrictTo('admin'))
router.route('/').get(userController.getAllUsers);
router.route('/:id').delete(userController.deleteUser)

router.patch('/:id/status', userController.updateStatus)
router.patch('/:id/wallets',upload.none(), walletController.fundWallet)

module.exports = router;
