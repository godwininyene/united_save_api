const catchAsync = require('../utils/catchAsync');
const Loan = require('./../models/loan');

exports.createLoan = catchAsync(async(req, res, next)=>{
    // Assign user ID if not provided
    if(!req.body.user) req.body.user = req.user._id;
    const loan = await Loan.create(req.body);

    res.status(201).json({
        status:"success",
        data:{
            loan
        }
    })
});

exports.getAllLoans = catchAsync(async(req, res, next)=>{
    //Allowed for fetching investments for the user
     let filter = {};
     if(req.user.role != 'admin') filter={user:req.user._id}
   
    const query =  Loan.find(filter);
     //If the requested user is an admin, populate investment with the user.
     if(req.user.role == 'admin'){
        query.populate({path:'user', select:'fullname photo email phone'})
    }
    const loans = await query;

    res.status(200).json({
        result:loans.length,
        status:"success",
        data:{
            loans
        }
    });
});

exports.handleLoan = catchAsync(async(req, res, next)=>{
    const { action } = req.params; // 'approve' or 'reject'
    // Retrieve loan, and user
    let loan = await Loan.findById(req.params.id).populate({path:'user', select:'fullname email photo'});

    if (!loan) {
        return next(new AppError("No loan was found with that ID", '', 404));
    }

    // Already processed status checks
    if (action === 'approve' && loan.status === 'approved') {
        return next(new AppError("Loan application already approved!", '', 400));
    }
    if (action === 'reject' && loan.status === 'rejected') {
        return next(new AppError("Loan application  already rejected!", '', 400));
    }

    if (action === 'approve') {
        loan.status = 'approved';
    } else if (action === 'reject') {
        loan.status = 'rejected';
    }

    //save updates
    await loan.save({ validateBeforeSave: false });

    //Send response
    res.status(200).json({
        status: 'success',
        message: `Loan ${loan.status} successfully!`,
        data: { loan }
      });
});