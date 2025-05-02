const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    saving: {
        type: Number,
        default: 0
    },
    checking: {
        type: Number,
        default: 0
    },
    checkingAccountNumber: {
        type: String,
        unique: true
    },
    savingAccountNumber: {
        type: String,
        unique: true
    },
    currency: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'A wallet must belong to a user']
    }
});

// Pre-save middleware to generate account numbers
walletSchema.pre('save', async function(next) {
    if (!this.checkingAccountNumber) {
        this.checkingAccountNumber = generateAccountNumber();
    }
    if (!this.savingAccountNumber) {
        this.savingAccountNumber = generateAccountNumber();
    }
    next();
});

function generateAccountNumber() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;