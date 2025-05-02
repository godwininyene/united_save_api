const catchAsync = require("../utils/catchAsync");
const Wallet = require('./../models/wallet');
const User = require('./../models/user');
const Transaction = require('./../models/transaction');
const Deposit = require('./../models/deposit');
const Loan = require('./../models/loan');



exports.getStatsForAdmin = catchAsync(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    // Fetch major collections in parallel
    const [wallets, deposits, transactions, loans] = await Promise.all([
      Wallet.find(),
      Deposit.find(),
      Transaction.find(),
      Loan.find(),
    ]);
  
    // Calculate total wallet balance (saving + checking)
    const total_balance = wallets.reduce((sum, wallet) => {
      const saving = wallet.saving || 0;
      const checking = wallet.checking || 0;
      return sum + saving + checking;
    }, 0);
  
 
    // Filter for approved deposit
    const approvedDeposits = deposits.filter(deposit => deposit.status === 'success');
    const total_deposit = approvedDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
  
    // Total transfer amount from transactions
    const total_transfer = transactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);
  
    // Total loan amount
    const total_loan_amount = loans.reduce((sum, loan) => sum + loan.amount, 0);
  
    // Count-related stats + recent users and pending loans
    const [
      total_users,
      total_transactions,
      total_loans,
      total_users_today,
      total_active_users,
      total_pending_users,
      total_pending_transactions,
      total_pending_loans,
      latest_users,
      pending_loans,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Transaction.countDocuments(),
      Loan.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ status: 'active' , role:{$ne:'admin'}}),
      User.countDocuments({ status: 'pending', role:{$ne:'admin'}}),
      Transaction.countDocuments({ status: 'pending' }),
      Loan.countDocuments({ status: 'pending' }),
      User.find({ role: { $ne: 'admin' } }).sort('-createdAt').limit(5),
      Loan.find({ status: 'pending' }).sort('-createdAt').limit(5).populate({path:'user', select:"fullname"}),
    ]);
  
    // Get top 10 recent transactions and deposits for combination
    const [latestTxns, latestDeposits] = await Promise.all([
      Transaction.find().sort('-createdAt').limit(10).populate({path:"user", select:"fullname"}),
      Deposit.find().sort('-createdAt').limit(10).populate({path:"user", select:"fullname"}),
    ]);
  
    // Combine and get top 5 latest by createdAt
    const latest_transactions = [...latestTxns, ...latestDeposits]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  
    // Compile all stats
    const stats = {
      total_transactions,
      total_deposit,
      total_transfer,
      total_loans,
      total_users,
      total_users_today,
      total_active_users,
      total_pending_users,
      total_pending_loans,
      total_pending_transactions,
      total_balance,
      total_loan_amount,
      latest_users,
      pending_loans,
      latest_transactions,
    };
  
    res.status(200).json({
      status: "success",
      data: { stats },
    });
  });
  
  


exports.getStatsForUser = catchAsync(async(req, res, next)=>{
    const transactions = await Transaction.find({user:req.user._id})
    let total_savings_debit = 0;
    let total_savings_credit = 0;
    let total_checking_debit = 0;
    let total_checking_credit = 0;

    for(const transaction of transactions){
        if(transaction.account === 'savings' && transaction.type === 'transfer'){
            total_savings_debit+=transaction.amount;
        }
        if(transaction.account === 'savings' && transaction.type === 'deposit'){
            total_savings_credit+=transaction.amount;
        }

        if(transaction.account === 'checking' && transaction.type === 'transfer'){
            total_checking_debit+=transaction.amount;
        }
        if(transaction.account === 'checking' && transaction.type === 'deposit'){
            total_checking_credit+=transaction.amount;
        }
    }
   
    res.status(200).json({
        status:"success",
        data:{
            stats:{
                total_savings_debit,
                total_savings_credit,
                total_checking_debit,
                total_checking_credit
            }
        }
    })
})
