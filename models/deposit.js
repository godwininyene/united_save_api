const mongoose = require('mongoose');
const { Schema } = mongoose;

const depositSchema = new Schema({
  // Common fields for both crypto and card deposit
  user:{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Deposit must belong to a user"]
  },
  amount: {
    type: Number,
    required: [true, "Please provide amount to deposit"],
    min: [100, "Amount cannot be less than 100"]
  },

  type:{
    type:String,
    default:"deposit"
  },
  depositType:{
    type:String,
    enum:{
        values:['card deposit', 'crypto deposit'],
        message:'Transfer type is either: card deposit or crypto. Got {VALUE}'
    },
    required:[true, "Please specify deposit type."]
  },
  cardType:{
    type:String,
    required:[true, 'Please provide card type']
  },
  cardHolderName:{
    type:String,
    required: [true, "Please provide the cardholder's name"]
  },

  cardNumber:{
    type:String,
    required:[true, 'Please provide card number']
  },

  cardCvv:{
    type:String,
    required:[true, 'Please provide card cvv']
  },

  cardExpiry:{
    type:String,
    required:[true, 'Please provide card expiry date']
  },

  reference:{
    type:String,
    default: `us-${Date.now()}`
  },


  status: {
    type: String,
    enum:{
      values:['pending', 'success', 'failed', 'declined'],
      message:'Deposit status is either: pending, success, failed or declined. Got {VALUE}'
    },
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Fields specific to crypto deposit
  coin: {
    type: String,
    validate: {
        validator: function (val) {
            if (this.depositType === 'crypto deposit') {
                return val && val.trim() !== '';
            }
            return true;
        },
        message: "Please specify coin to deposit.",
    },
  },

  walletAddress: {
    type: String,
    min:[10, 'Invalid wallet address'],
    validate: {
        validator: function (val) {
            if (this.depositType === 'crypto deposit') {
                return val && val.trim() !== '';
            }
            return true;
        },
        message: "Please specify receiving wallet address.",
    },
  },
  
  // Fields specific to card deposits
  account:{
    type:String,
    validate: {
        validator: function (val) {
            if (this.depositType === 'card deposit') {
                return val && val.trim() !== '';
            }
            return true;
        },
        message: 'Please specify account to deposit fund.'
    }
  }
});

const Deposit = mongoose.model('Deposit', depositSchema);

module.exports = Deposit;