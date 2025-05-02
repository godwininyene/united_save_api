const Transaction = require("../models/transaction");
const Wallet = require("../models/wallet");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const User = require('./../models/user')
const Email = require('./../utils/email')

const filterObj = (obj, ...allowFields)=>{
    const newObj = {};
    Object.keys(obj).forEach(key=>{
        if(allowFields.includes(key)) newObj[key] = obj[key]
    });

    return newObj
}

const updateApprovalStatus = async(user, newStatus)=> {
    if (newStatus === 'approve' && user.status === 'active') {
        throw new AppError("User account already approved!", '', 400);
    }
    if (newStatus === 'deny' && user.status === 'denied') {
        throw new AppError("User account approval already denied!", '', 400);
    }
    if (newStatus === 'deactivate' && user.status === 'deactivated') {
        throw new AppError("User account already deactivated!", '', 400);
    }

    if(newStatus === 'deny'){
        user.status = 'denied'
    }
    if(newStatus === 'approve'){
        user.status = 'active'
    }

    if(newStatus === 'deactivate'){
        user.status = 'deactivated'
    }
    
    await user.save({ validateBeforeSave: false });
    return user;
}



exports.getMe = (req, res, next)=>{
    req.params.id = req.user._id;
    next();
}
exports.updateMe = catchAsync(async(req, res, next)=>{
    // 1) Create an error if user trys to update password field
    if(req.body.password || req.body.passwordConfirm){
        return next(new AppError("This route is not for password updates, please use /updateMyPassword", '', 401));
    }

    // 2) Remove unwanted fields that are not allowed to be updated
    const filterBody = filterObj(req.body, 'fullname', 'email', 'phone', 'gender', 'photo');
    console.log(req.file);
    
    if(req.file)  filterBody.photo = `uploads/users/photos/${req.file.filename}`;  
    //3) Update the user document
    const updatedUser = await User.findByIdAndUpdate(req.user._id, filterBody, {
        new:true,
        runValidators:true
    });
    res.status(200).json({
        status:"success",
        data:{
            user:updatedUser
        }
    })
});

exports.deleteMe = catchAsync(async(req, res, next)=>{
    await User.findByIdAndUpdate(req.user._id, {status:false})
    res.status(204).json({
        status:"success",
        data:null
    })
})


exports.getAllUsers = catchAsync(async(req, res, next)=>{
    const users = await User.find({role: {$ne:'admin'}}).populate('wallet');
    res.status(200).json({
        status:"success",
        data:{
            results:users.length,
            users
        }
    })
});


exports.getUser = catchAsync(async(req, res, next)=>{
    const user = await User.findById(req.params.id)
    if(!user){
        return next(new AppError("No user found with that ID", '', 404))
    }
    res.status(200).json({
        status:"success",
        data:{
            user
        }
    })
});



exports.deleteUser = catchAsync(async(req, res, next)=>{
    const user = await User.findByIdAndDelete(req.params.id)
    if(!user){
        return next(new AppError("No user found with that ID", '', 404))
    }

    // Manually delete references
    await Transaction.deleteMany({ user: req.params.id });
    await Wallet.deleteMany({ user: req.params.id });
    res.status(204).json({
        status:"success",
        data:null
    })
})


exports.updateStatus = catchAsync(async(req, res, next)=>{
    let{status} = req.body
    
    let type;
    const user = await User.findById(req.params.id);

    if(!user){
        return next(new AppError("No user found with that ID", '', 404))
    }
   
    if (status === 'approve')type='account_approved'
    
    if (status === 'deny') type='account_denied'
     
    if (status === 'deactivate') type="account_deactivated"
       
    try {
        const updatedUser = await updateApprovalStatus(user, status)
        // await new Email(user, type, url).sendOnBoard();
        res.status(200).json({
            status: 'success',
            data:{
                user:updatedUser
            }
        });
    } catch (error) {
        return next(new AppError("User's status updated successfull but there was a problem sending the email.", '', 500));
    }
})