const express=require('express');
const user_route=express();
const session=require('express-session')
const config = require('../config/config');
const passport = require('passport');
user_route.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
  
}));


// Middleware to parse JSON and urlencoded data
user_route.use(express.json());
user_route.use(express.urlencoded({ extended: true }));


const userController=require('../controller/userController')
user_route.get('/',userController.loginhome)
user_route.get('/register',userController.get_register)
user_route.post('/register',userController.register_user)
user_route.get('/home',userController.loginhome)
user_route.get('/sign',userController.loadsign)

user_route.get('/otp',userController.get_otp)

user_route.post('/otp',userController.verify_otp)
user_route.post('/sign',userController.verify_user)
user_route.post('/otp_resend',userController.resendOTP)


//route for google authentication

// //google auth
user_route.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/sign' }),userController.googleSuccess);

user_route.get('/auth/google',passport.authenticate('google', { scope: ['profile', 'email'] }));

///...................>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.
user_route.get('/product',userController.load_product)
user_route.get('/productdetail/:id',userController.product_detail)

module.exports=user_route

