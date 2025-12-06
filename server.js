const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({path:'./config.env'});

process.on('uncaughtException', err=>{
    console.log("uncaughtException! shutting down...")
    console.log(err.name, err) 
    process.exit(1)
})

const app = require('./app');

let DB;

if (process.env.NODE_ENV === 'development') {
    DB = process.env.DB_LOCAL;
} else if (process.env.NODE_ENV === 'production') {
    // DB = process.env.DB_LOCAL;
    DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
}


mongoose.connect(DB).then(() => {console.log('DB connection successfully')})


const port = process.env.PORT || 3000
const server = app.listen(port, ()=>{
    console.log(`running on port ${port}`);
})
process.on('unhandledRejection', err=>{
    console.log("UNHANDLED REJECTION! shutting down...")
    console.log(err.name, err.message)
    server.close(()=>{
        process.exit(1)
    })
})