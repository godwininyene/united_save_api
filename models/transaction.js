const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type:{
        type:String,
        enum:{
            values:['deposit', 'withdrawal', 'payment', 'crypto', 'fee', 'transfer'],
            message:'Transaction type is either: deposit, withdrawal, payment, crypto orfee. Got {VALUE}'
        },
        required:[true, 'Please provide transaction type']
    },
    transferType:{
        type:String,
        enum:{
            values:['internal transfer', 'wire transfer', 'local transfer'],
            message:'Transfer type is either: internal transfer, wire transfer or local transfer. Got {VALUE}'
        },
        validate: {
            validator: function (val) {
                if (this.transferType === 'wire transfer') {
                    return val && val.trim() !== '';
                }
                return true;
            },
            message: "Please specify transfer type.",
        },
    },
    account:{
        type:String,
        required:[true, 'Please specify account to debit.']
    },
    
    amount:{
        type:Number,
        required:[true, 'Please provide amount']
    },

    beneficiaryName:{
        type:String,
        validate: {
            validator: function (val) {
                if (this.transferType === 'wire transfer' || this.transferType=== 'local transfer') {
                    return val && val.trim() !== '';
                }
                return true;
            },
            message: 'Please provide beneficiary name',
        },
    },
    beneficiaryAcct:{
        type:String,
        required:[true, 'Please provide beneficiary account']
    },
    beneficiaryBank:{
        type:String,
        validate: {
            validator: function (val) {
                if (this.transferType === 'wire transfer' || this.transferType=== 'local transfer') {
                    return val && val.trim() !== '';
                }
                return true;
            },
            message: 'Please provide beneficiary bank',
        },
    },

    swiftCode: {
        type: String,
        validate: {
            validator: function (val) {
                if (this.transferType === 'wire transfer') {
                    return val && val.trim() !== '';
                }
                return true;
            },
            message: "Please specify swift code for wire transfer.",
        },
    },
    

    routingNumb:{
        type:String,
        validate: {
            validator: function (val) {
                if (this.transferType === 'wire transfer' || this.transferType=== 'local transfer') {
                    return val && val.trim() !== '';
                }
                return true;
            },
            message: "Please specify routing number.",
        },
    },

    description:String,
    bankAddress:String,

    status:{
        type:String,
        enum:{
            values:['pending', 'success', 'failed', 'declined'],
            message:'Transaction status is either: pending, success, failed or declined. Got {VALUE}'
        },
        default:'pending'
    },

    reference:{
        type:String,
        default: `us-${Date.now()}`
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:[true, 'Transaction must belong to a user.']
    },
    fee:{
        type:Number,
        default:0
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



const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;