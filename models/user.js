const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: [true, 'Please provide your full name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide your email address'],
        validate: [validator.isEmail, 'Please provide a valid email address'],
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Please provide your phone number'],
        unique: true,
        trim: true
    },
    dob: {
        type: Date,
        required: [true, 'Please provide your date of birth']
    },
    gender: {
        type: String,
        enum: {
            values: ['Male', 'Female'],
            message: 'Gender is either: Male or Female. Got {VALUE}'
        },
        required: true
    },
    occupation: {
        type: String,
        required: [true, 'Please provide your occupation'],
        trim: true
    },
    country: {
        type: String,
        required: [true, 'Please provide your country']
    },
    city: {
        type: String,
        required: [true, 'Please provide your city']
    },
    photo:{
        type:String,
        default:'default.png'
    },
    zipcode: {
        type: String,
        required: [true, 'Please provide your zip code'],
        maxlength: [10, 'Zip code must be 10 characters or less']
    },
    address: {
        type: String,
        required: [true, 'Please provide your address']
    },
    nextKinName: {
        type: String,
        required: [true, 'Please provide next of kin name']
    },
    nextKinEmail: {
        type: String,
        validate: [validator.isEmail, 'Please provide a valid email address'],
        required: [true, 'Please provide next of kin email']
    },
    nextKinPhone: {
        type: String,
        required: [true, 'Please provide next of kin phone number']
    },
    nextKinRelationship: {
        type: String,
        required: [true, 'Please specify relationship with next of kin']
    },
    nextKinAddress: {
        type: String,
        required: [true, 'Please provide next of kin address']
    },
    currency: {
        type: String,
        required: [true, 'Please select account currency'],
        enum: ['$', '€', '£', 'RM', 'SGD$', '₹', 'Rp', 'AUD$', 'CAD$', '₣', '¥', '¥', 'ا.د', 'ك.د', 'MXN$', '.ع.ر', '₱', 'ق.ر', ' ﷼', '₩', '฿', '₫']
    },
    passportPhoto: {
        type: String,
        required: [true, 'Please upload passport photograph']
    },
    identityDocument: {
        type: String,
        required: [true, 'Please upload identity document']
    },
    password: {
        type: String,
        required: [true, 'Please provide your password'],
        minlength: [8, 'The password field must be at least 8 characters.'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function(el) {
                return el === this.password;
            },
            message: 'The password field confirmation does not match.'
        }
    },
    transactionPin: {
        type: String,
        required: [true, 'Please provide transaction PIN'],
        minlength: [4, 'Transaction PIN must be 4 digits'],
        maxlength: [4, 'Transaction PIN must be 4 digits'],
        select: false
    },
    keepSignedIn: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: {
            values: ['user', 'admin'],
            message: 'Role is either: admin or user. Got {VALUE}'
        },
        default: 'user'
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'deactivated', 'pending'],
            message: 'Status is either: active, deactivated or pending. Got {VALUE}'
        },
        default: 'active'
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate
userSchema.virtual('wallet', {
    ref: 'Wallet',
    foreignField: 'user',
    localField: '_id'
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});

// Pre-save middleware to hash transaction PIN
userSchema.pre('save', async function(next) {
    if (!this.isModified('transactionPin')) return next();
    this.transactionPin = await bcrypt.hash(this.transactionPin, 12);
    next();
});

// Pre-save middleware for passwordChangedAt
userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});


// Method to compare passwords
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};



// Method to compare transaction PINs
userSchema.methods.correctTransactionPin = async function(candidatePin, userPin) {
    return await bcrypt.compare(candidatePin, userPin);
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTtime) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTtime < changedTimestamp;
    }
    return false;
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;