const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:[true, 'A bank account must belong to a user']
    },
    bankName:{
        type:String,
        required:[true, 'Please provide bank name']
    },
    accountNumber:{
        type:String,
        required:[true, 'Please provide account number']
    },
    accountName:{
        type:String,
        required:[true, 'Please provide account name']
    },
    accountType:{
        type:String,
    }
});

const BankAccount = mongoose.model("BankAccount", accountSchema);
module.exports = BankAccount;