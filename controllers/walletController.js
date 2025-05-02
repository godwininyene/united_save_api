const catchAsync = require("../utils/catchAsync");
const Wallet = require('../models/wallet');
const User = require('../models/user');

exports.fundWallet = catchAsync(async(req, res, next)=>{
    const wallet = await Wallet.findOne({user:req.params.id});
    wallet[req.body.account]+= parseInt(req.body.amount);
    await wallet.save();
    const user = await User.findById(req.params.id).populate('wallet')
    res.status(200).json({
        status:'success',
        data:{
            user
        }
    })
});

exports.getWallet = catchAsync(async(req, res, next)=>{
    const wallet = await Wallet.findOne({user:req.user._id});
    res.status(200).json({
        status:'success',
        data:{
            wallet
        }
    })
});
