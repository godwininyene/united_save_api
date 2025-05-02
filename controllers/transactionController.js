const catchAsync = require("../utils/catchAsync");
const Transaction = require('./../models/transaction');
const Deposit = require('./../models/deposit')
const Wallet = require('./../models/wallet');
const User = require('./../models/user');
const Email = require('./../utils/email')
const AppError = require('../utils/appError')

// Helper functions
const  generateReferenceNumber = (prefix = 'TXN')=> {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${timestamp}${random}`;
}

const verifyTransactionPin = async (userId, pin) => {
  const user = await User.findById(userId).select('+transactionPin');
  if (!user || !(await user.correctTransactionPin(pin, user.transactionPin))) {
    throw new AppError('Incorrect transaction PIN', '', 401);
  }
};

const getAccountBalance = (wallet, accountType) => {
  switch (accountType) {
    case 'saving':
      return wallet.saving;
    case 'checking':
      return wallet.checking;
    default:
      throw new AppError('Invalid account type specified', '', 400);
  }
};

const updateAccountBalance = async (wallet, accountType, amount, operation = 'debit') => {
  if (accountType === 'savings') {
    wallet.saving = operation === 'debit' 
      ? wallet.saving - amount 
      : wallet.saving + amount;
  } else {
    wallet.checking = operation === 'debit' 
      ? wallet.checking - amount 
      : wallet.checking + amount;
  }
  await wallet.save();
};

const processTransfer = async (user, body) => {
  const { amount, pin, account } = body;
  const numericAmount = parseFloat(amount);
  
  await verifyTransactionPin(user._id, pin);
  
  const wallet = await Wallet.findOne({ user });
  if (!wallet) throw new AppError('Wallet not found.', '', 404);

  const fee = numericAmount * 0.01;
  const totalAmount = numericAmount + fee;
  
  const currentBalance = getAccountBalance(wallet, account);
  
  if (currentBalance < totalAmount) {
    throw new AppError(
      `Insufficient funds. You need ${totalAmount.toFixed(2)} (including ${fee.toFixed(2)} fee) but only have £${currentBalance.toFixed(2)} in your ${account} account.`,
      '',
      400
    );
  }

  return {
    ...body,
    reference: generateReferenceNumber('tr'),
    fee,
    totalAmount
  };
};



const processDeposit = async (user, body) => {
  const { cardNumber, depositType, account } = body;
  
  if (depositType === 'card deposit') {
    // Validate card details
    const last4 = cardNumber.slice(-4);
    if (last4.length !== 4 || !/^\d+$/.test(last4)) {
      throw new AppError('Invalid card number', '', 400);
    }
    
  }
  
  return {
    ...body,
    reference: generateReferenceNumber(depositType === 'card deposit' ? 'cad' : 'crd')
  };
};

exports.createTransaction = catchAsync(async (req, res, next) => {
  const { type } = req.body;
  
  // Assign user ID if not provided
  if (!req.body.user) req.body.user = req.user._id;

  let transactionData;
    
  if (type === 'transfer') {
    transactionData = await processTransfer(req.user, req.body);
  } else if (type === 'deposit') {
    transactionData = await processDeposit(req.user, req.body);
  } else {
    return next(new AppError('Invalid transaction type specified', '', 400));
  }

  // Create transaction
  const transaction = type === 'transfer'
    ? await Transaction.create(transactionData)
    : await Deposit.create(transactionData);

  try {
    // Send email to user
    // await new Email(...).sendTransaction();
    res.status(201).json({
      status: 'success',
      data: { transaction }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.log('Transaction processing error:', error);
    return next(new AppError(
      "Transaction created but there was a problem sending the confirmation email.",
      '',
      500
    ));
  }
});

exports.getAllTransactions = catchAsync(async (req, res, next) => {
  // Conditionally apply user filter
  const userCondition = req.user.role === 'admin' && req.query.user
    ? { user: req.query.user }
    : req.user.role !== 'admin'
      ? { user: req.user._id }
      : {}; // For admin with no filter, get all

  // Conditionally apply population
  const populateOptions = req.user.role === 'admin'
    ? { path: 'user', select: 'fullname photo email' }
    : null;

  // Query builder function
  const buildQuery = (Model) => {
    const query = Model.find(userCondition).sort({ createdAt: -1 });
    if (populateOptions) query.populate(populateOptions);
    return query;
  };
  
  // Fetch all transactions and deposits
  const [transactions, deposits] = await Promise.all([
    buildQuery(Transaction),
    buildQuery(Deposit)
  ]);
  
  // Merge and sort
  const allTransactions = [...transactions, ...deposits].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  res.status(200).json({
    status: 'success',
    results: allTransactions.length,
    data: {
      transactions: allTransactions
    }
  });
  });

  exports.getAllDeposits = catchAsync(async(req, res, next)=>{
    const deposits = await Deposit.find().populate({path: 'user', select:'fullname photo email'}).sort({ createdAt: -1 })

    res.status(200).json({
      status: 'success',
      results: deposits.length,
      data: {
       deposits
      }
    });
  })
  
exports.getRecentTransactions = catchAsync(async (req, res, next) => {
  // Set default limit to 5 transactions if not specified
  const limit = parseInt(req.query.limit) || 5;
  // Common query parameters
  const baseQuery = {
      sort: { createdAt: -1 },
      limit: limit
  };
  // Conditionally add user filter and population
  const userCondition = req.user.role === 'admin' && req.query.user 
      ? { user: req.query.user } 
      : { user: req.user._id };
  
  const populateOptions = req.user.role === 'admin'
      ? { path: 'user', select: 'name photo email' }
      : null;

    // Create query builder function
    const buildQuery = (Model) => {
        const query = Model.find(userCondition)
            .sort(baseQuery.sort)
            .limit(baseQuery.limit);
        
        if (populateOptions) {
            query.populate(populateOptions);
        }
        
        return query;
    };

    // Execute queries in parallel
    const [transactions, deposits] = await Promise.all([
        buildQuery(Transaction),
        buildQuery(Deposit)
    ]);

    // Combine and sort results by date
    const recents = [...transactions, ...deposits]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

    res.status(200).json({
        status: 'success',
        results: recents.length,
        data: {
            recents
        }
    });
});

exports.handleTransaction = catchAsync(async (req, res, next) => {
  const { action } = req.params; // 'approve' or 'decline'
  const transaction_type = req.query.type;
    
  let query = transaction_type ==='deposit' ? Deposit.findById(req.params.id) : Transaction.findById(req.params.id);
  query = query.populate({path:'user', select:'fullname email photo'});
  
  // Retrieve transaction, user, and wallet
  const transaction = await query;
  if (!transaction) {
    return next(new AppError("No transaction was found with that ID", '', 404));
  }
  
  const wallet = await Wallet.findOne({ user: transaction.user });
  if (!wallet) {
    return next(new AppError("Wallet not found for this user", '', 404));
  }
  
  const user = await User.findById(transaction.user);

  // Status checks
  if (action === 'approve' && transaction.status === 'success') {
    return next(new AppError("Transaction already approved!", '', 400));
  }
  if (action === 'decline' && transaction.status === 'declined') {
    return next(new AppError("Transaction already declined!", '', 400));
  }

  // Process the transaction based on action
  if (action === 'approve') {
    // Approve transaction logic
    if (transaction.type === 'deposit') {
    
      wallet[transaction.account] += transaction.amount;
    } else if (transaction.type === 'transfer') {
      // For transfers, the amount was already "reserved" by checking balance during creation
      wallet[transaction.account] -= (transaction.amount + (transaction.fee || 0));
    }
    transaction.status = 'success';
  } else if (action === 'decline') {
    // Decline transaction logic with reversal capability
    if (transaction.status === 'success') {
      // Reverse the transaction if it was previously approved
      if (transaction.type === 'deposit') {
        wallet[transaction.account] -= transaction.amount;
      } else if (transaction.type === 'transfer') {
        wallet[transaction.account] += (transaction.amount + (transaction.fee || 0));
      }
    }
    transaction.status = 'declined';
  }

  // Prepare email info
  const urls = {
    deposit: `${req.get('referer')}manage/investor/dashboard`,
    withdrawal: `${req.get('referer')}manage/investor/transactions`
  };

  const types = {
    approve: {
      deposit: 'confirmed_deposit',
      transfer: 'confirmed_transfer'
    },
    decline: {
      deposit: 'unconfirmed_deposit',
      transfer: 'unconfirmed_transfer'
    }
  };

  // Set email info based on action and transaction type
  const type = types[action]?.[transaction.type];
  const url = action === 'approve' ? urls[transaction.type] : undefined;

  // Save updates
  await wallet.save({ validateBeforeSave: false });
  await transaction.save({ validateBeforeSave: false });

  try {
    // Send email to user
    // await new Email(user, type, url, transaction.amount).sendTransaction()
    res.status(200).json({
      status: 'success',
      message: `Transaction ${action}d successfully!`,
      data: { transaction }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.log('Transaction processing error:', error);
    return next(new AppError(
      `Transaction ${action}d successfully but there was a problem sending email notification.`,
      '',
      500
    ));
  }
});