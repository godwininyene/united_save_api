const mongoose = require('mongoose');
const loanSchema = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:[true, 'Loan must belong to a user']
    },
    amount:{
        type:Number,
        required:[true, 'Please specify loan amount.']
    },
    totalPayable:{
        type:Number,
        default:0
    },
    monthlyPayment:{
        type:Number,
        default:0
    },
    duration:{
        type:Number,
        required:[true, 'Please specify loan duration.']
    },
    repaymentPlan:{
        type:String,
        required:[true, 'Please specify loan repayment plan']
    },
    purpose:{
        type:String,
        required:[true, 'Please specify purpose for taking loan']
    },
    status:{
        type:String,
        enum:{
            values:['pending', 'approved', 'rejected'],
            message:'Loan status is either: pending, approved or rejected. Got {VALUE}'
        },
        default:'pending'
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },
    updatedAt:{
        type:Date,
        default:Date.now()
    }
});

const Loan = mongoose.model("Loan", loanSchema);
module.exports = Loan;