const User = require("../model/userModel")
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require("bcrypt");
const product = require('../model/productModel')
const Cart = require('../model/cartModel')
const category=require('../model/category')
const brand=require('../model/brandModel')

// Function to render the registration page
const get_register = async (req, res) => {
  try {
    res.render('users/register');
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while rendering the registration page.');
  }
};

// Function to hash a password securely
const securePassword = async (password) => {
  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
    throw new Error('An error occurred while hashing the password.');
  }
};
// Set up the transporter using Gmail service and environment variables for authentication
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.USER,
    pass: process.env.PASS
  }
});

// Function to generate a 4-digit OTP
function generateOTP() {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString();
}

// Function to send the OTP via email
async function sendOTPViaEmail(email, otp) {
  const mailOptions = {
    from: process.env.USER, // The email address you're sending from
    to: email,
    subject: 'Your OTP for registration',
    text: `Your OTP: ${otp}`
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error occurred while sending email:', error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve('OTP sent successfully.');
      }
    });
  });
}


const register_user = async (req, res) => {
  try {
    const existingUser = await User.findOne({ userName: req.body.userName });

    if (existingUser) {
      return res.render('users/register', { message: "Username already taken" });
    }
    const existingEmail = await User.findOne({ userEmail: req.body.userEmail });
    if (existingEmail) {
      return res.render('users/register', { message: "Email already in use" });
    }


    const { userName, userEmail, mobileNo, password } = req.body;
    const spassword = await securePassword(password);

    const otp = generateOTP()
    req.session.otp = otp
    console.log(req.session.otp);
    req.session.user = {
      userName,
      userEmail,
      mobileNo,
      password: spassword,
      is_admin: 0
    }

    // const userData=req.session.user
    // const user=new User(userData)
    //    await user.save()


    await sendOTPViaEmail(req.body.userEmail, otp)
    res.redirect("/otp")

  } catch (error) {

    console.log(error.message);
  }

}

const get_otp = async (req, res) => {
  try {

    if (!req.session.user) {
      res.redirect("/register")

    }
    res.render("users/otp")
  } catch (error) {
    console.log(error.message);
  }
}

const verify_otp = async (req, res) => {
  try {
    const otp1 = req.body.otp1;
    const otp2 = req.body.otp2;
    const otp3 = req.body.otp3;
    const otp4 = req.body.otp4;
    const otp = otp1 + otp2 + otp3 + otp4

    const sessionOTP = req.session.otp;

    if (sessionOTP === otp) {
      req.session.otp = null;
      const userData = req.session.user;
      const user = new User(userData);
      user.isOTPVerified = true;
      await user.save();
      req.session.userData = null;
      res.redirect('/sign');
    } else {
      res.render('users/otp');
    }
  } catch (error) {
    console.log(error);
  }
}

const resendOTP = async (req, res) => {
  try {
    const userData = req.session.user;
    if (!userData) {
      return res.render('users/register', { message: "Session expired, please register again" });
    }

    const newOTP = generateOTP();
    req.session.otp = newOTP;
    await sendOTPViaEmail(userData.userEmail, newOTP);

    res.redirect(`/otp`);
  } catch (error) {
    res.status(500).send(error.message);
  }
};


const loginhome = async (req, res) => {
  try {

    const userdata = await User.findById(req.session.userid)

    res.render('users/home', { userdata })

  } catch (error) {
    console.log(error.message)
  }
}

const loadsign = async (req, res) => {
  try {

    res.render('users/sign')

  } catch (error) {
    console.log(error.message)
  }

}

const verify_user = async (req, res) => {
  try {
    const userEmail = req.body.userEmail;
    const password = req.body.password;
    const userData = await User.findOne({ userEmail });
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_blocked === 0) {

          req.session.userid = userData._id

          res.redirect('/home')
        } else {
          res.render('users/sign', { message: "User blocked" });
        }
      } else {
        res.render('users/sign', { message: "Incorrect Password" });
      }
    } else {
      res.render('users/sign', { message: "User not found" });
    }
  } catch (error) {
    res.send(error);
  }
}

//middleware function for google authentication
passport.use(new GoogleStrategy({
  clientID: process.env.clientID,
  clientSecret: process.env.clientSecret,
  callbackURL: process.env.callbackURL,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ userEmail: profile.emails[0].value });

    if (!user) {
      user = new User({
        googleId: profile.id,
        userName: profile.displayName,
        userEmail: profile.emails[0].value,
        password: null,
        is_admin: 0

      });
      await user.save();
    }
    req.session.userid=user._id

    done(null, user);
  } catch (err) {
    console.error('Error in Google OAuth:', err);
    done(err);
  }
}));
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});


const googleSuccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect('/sign');
    }
    if (req.user.is_blocked) {
      return res.render('users/sign', { message: 'User blocked' });
    }
    console.log(req.user);
    req.session.userid= req.user._id
    
    res.redirect('/home');
  } catch (error) {
    res.send(error);
  }
};

///product load for user   ------- -------------------------------------.//sort start here bewlo-----------------------------------------------
// const load_product = async (req, res) => {
//   try {
//     let sortOption = {};
//     let selectedSort = req.query.sort || ''; 
//    if (selectedSort === 'low-high') {
//       sortOption = { price: 1 };
//     } else if (selectedSort === 'high-low') {
//       sortOption = { price: -1 };
//     } else if (selectedSort === 'name_asc') {
//       sortOption = { productName: 1 };
//     } else if (selectedSort === 'name_desc') {
//       sortOption = { productName: -1 };
//     }

//   const categories=await category.find()
//   const brands=await brand.find()
//     const product_data = await product.find({ listed: true })
//     .populate('category')
//     .populate('productBrand')
//     .sort(sortOption);

//      res.render("users/products", { products: product_data, selectedSort ,categories,brands});

//   } catch (error) {
//     console.log(error);
//   }

// }
//--------------------------------------------------------------------------------------------------------------END HERE---------------------------------------
const load_product = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 6; // Number of products per page
    const skip = (page - 1) * limit;

    let sortOption = {};
    let selectedSort = req.query.sort || '';
    if (selectedSort === 'low-high') {
      sortOption = { price: 1 };
    } else if (selectedSort === 'high-low') {
      sortOption = { price: -1 };
    } else if (selectedSort === 'name_asc') {
      sortOption = { productName: 1 };
    } else if (selectedSort === 'name_desc') {
      sortOption = { productName: -1 };
    }

    // Get filter parameters
    const categoryIds = req.query.categories ? (Array.isArray(req.query.categories) ? req.query.categories : [req.query.categories]) : [];
    const brandIds = req.query.brands ? (Array.isArray(req.query.brands) ? req.query.brands : [req.query.brands]) : [];

    // Prepare filter object
    let filterObject = { listed: true };
    if (categoryIds.length > 0) {
      filterObject.category = { $in: categoryIds };
    }
    if (brandIds.length > 0) {
      filterObject.productBrand = { $in: brandIds };
    }

    const categories = await category.find();
    const brands = await brand.find();

    const totalProducts = await product.countDocuments(filterObject);
    const totalPages = Math.ceil(totalProducts / limit);

    const product_data = await product.find(filterObject)
      .populate('category')
      .populate('productBrand')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);;

      const queryString = Object.entries(req.query)
      .filter(([key]) => key !== 'page')
      .map(([key, value]) => `&${key}=${value}`)
      .join('');

    res.render("users/products", { 
      products: product_data, 
      selectedSort,
      categories,
      brands,
      currentPage: page,
      totalPages,
      queryString,
      selectedCategories: categoryIds,
      selectedBrands: brandIds
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while loading products");
  }
}


const product_detail = async (req, res) => {
  try {
    const product_id = await req.params.id
    const product_data = await product.findById(product_id) .populate('category')
    .populate('productBrand');

    res.render("users/productdetail", { pro: product_data })
  } catch (error) {
    console.log(error);
  }
}

// cart controller....................................................................................................

const load_cart = async (req, res) => {
  const userId = req.session.userid;

  try {
    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'products.product'

    });

    // cart.products.forEach(item => {  
    //   console.log(item);
    //   console.log('Product Images:', item.product.productimages);
    //   console.log(item.quantity);
    // });
    res.render('users/cart', { cart });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }

}

const add_cart = async (req, res) => {

  try {
    const userId = req.session.userid // Get the user ID from the session
    const productId = req.params.productid
    const count = parseInt(req.params.count)

    if (!userId) {
      return res.redirect('/sign');
    }

    const productdata = await product.findById(productId);
    if (!productdata) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: userId });


    if (!cart) {
      cart = new Cart({ user: userId, products: [] });
    }

    // Find the product in the cart
    const productIndex = cart.products.findIndex(p => p.product.toString() === productId);
// console.log(productIndex);
    if (productIndex > -1) {

      cart.products[productIndex].quantity += count;
    } else {

      cart.products.push({ product: productId, quantity: 1 });
    }

    await cart.save();

    // Respond with success
    res.status(200).json({ message: 'Product added to cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }

}

//update cart when i increase the quantity userside
const update_cart = async (req, res) => {

  try {
    const count = req.params.count;
    const productId = req.params.productid;
    const userId = req.session.userid;


    const newQuantity = Math.min(Math.max(parseInt(count), 1), 5);

    const cart = await Cart.findOne({ user: userId });

    if (cart) {
      const productIndex = cart.products.findIndex(p => p.product.toString() === productId);

      if (productIndex > -1) {
        cart.products[productIndex].quantity = newQuantity;
      } else {

        return res.status(404).json({ success: false, message: 'Product not found in cart' });
      }

      await cart.save();
      res.json({ success: true, message: 'Cart updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Cart not found' });
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart', error: error.message });
  }
}
//remove product from cart


const cart_remove = async (req, res) => {
  try {
    const product = req.params.productid
    const userId = req.session.userid;
    const cart = await Cart.findOne({ user: userId });
    
    if (cart) {
    
      const productIndex = cart.products.findIndex(item => item.product.toString() === product);

      if (productIndex > -1) {
       
        cart.products.splice(productIndex, 1);
        await cart.save();
        res.json({ success: true, message: 'Product removed from cart' });
      } else {
        res.status(404).json({ success: false, message: 'Product not found in cart' });
      }
    } else {
      res.status(404).json({ success: false, message: 'Cart not found' });
    }
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).json({ success: false, message: 'Failed to remove product from cart', error: error.message });
  }
}


module.exports = {
  loginhome,
  get_register,
  register_user,
  get_otp,
  loadsign,
  verify_otp,
  verify_otp,
  verify_user,
  resendOTP,
  googleSuccess,
  load_product,
  product_detail,
  load_cart,
  add_cart,
  update_cart,
  cart_remove
}

///////////////////////////////////////////////////////////////////////////









