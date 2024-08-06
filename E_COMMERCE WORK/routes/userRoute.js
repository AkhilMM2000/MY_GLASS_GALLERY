const express=require('express');
const user_route=express();
const session=require('express-session')
const config = require('../config/config');
const passport = require('passport');
const islogin=require('../middleWares/islogin')
user_route.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
  
}));


// Middleware to parse JSON and urlencoded data
user_route.use(express.json());
user_route.use(express.urlencoded({ extended: true }));


const userController=require('../controller/userController')
const orderController=require('../controller/orderController')
const accountController=require('../controller/accountController')
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

//route for products......................................................................................................................>

user_route.get('/product',userController.load_product)
user_route.get('/productdetail/:id',userController.product_detail)

//route for cart......................................................................................................................>
user_route.get('/cart',islogin.verifyLogin,userController.load_cart)
user_route.post('/cart/:productid/:count',islogin.verifyLogin,userController.add_cart)
user_route.post('/cart/update/:count/:productid',islogin.verifyLogin,userController.update_cart)
user_route.delete('/cart/delete/:productid',islogin.verifyLogin,userController.cart_remove)


//route for order
user_route.get('/checkout',islogin.verifyLogin,orderController.load_checkout)
user_route.post('/place-order',islogin.verifyLogin,orderController.place_order)
user_route.get('/placeorder',islogin.verifyLogin,orderController.order_success)

// account controller below routes------------------------------------------------------------------------------------------------------->

//route for account adress
user_route.get('/address',islogin.verifyLogin,accountController.load_address)
user_route.post('/address',islogin.verifyLogin,accountController.add_address)
user_route.delete('/address/delete/:addressId',islogin.verifyLogin,accountController.delete_address)
user_route.patch('/address/edit/:id',islogin.verifyLogin,accountController.edit_address)

// route for  orders
user_route.get("/orders",islogin.verifyLogin,accountController.load_orders)
user_route.get('/detailorder',islogin.verifyLogin,accountController.order_details)

module.exports=user_route

 