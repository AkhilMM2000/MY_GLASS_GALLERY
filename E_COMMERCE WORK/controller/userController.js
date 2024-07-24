const User=require("../model/userModel")
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt=require("bcrypt");
const product=require('../model/productModel')
// const session = require("express-session");

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


  const register_user=async(req,res)=>{
    try {
      const existingUser = await User.findOne({ userName: req.body.userName });
     
      if (existingUser) {
          return res.render('users/register', { message: "Username already taken" });
      }
      const existingEmail = await User.findOne({ userEmail: req.body.userEmail });
      if (existingEmail) {
          return res.render('users/register', { message: "Email already in use" });
      }

      
        const { userName, userEmail, mobileNo, password} = req.body;
        const spassword = await securePassword(password);

        const otp= generateOTP()
        req.session.otp=otp 
        console.log(req.session.otp);
        req.session.user = {
          userName,
          userEmail,
           mobileNo,
          password: spassword,
          is_admin: 0
        }
        
        const userData=req.session.user
    //     const user=new User(userData)
    //        await user.save()
    //  console.log(userData)
  
    await sendOTPViaEmail(req.body.userEmail,otp)
         res.redirect("/home")
   
    } catch (error) {
        
        console.log(error.message);
    }
    
  }

const get_otp=async(req,res)=>{
    try {
      
         if(!req.session.user){
          res.redirect("/register")
        
         }
         res.render("users/otp")
           } catch (error) {
        console.log(error.message);
    }
}

const verify_otp=async(req,res)=>{
       try {
        const otp1 = req.body.otp1;
        const otp2 = req.body.otp2;
        const otp3 = req.body.otp3;
        const otp4= req.body.otp4;
        const otp=otp1+otp2+otp3+otp4
    
       const sessionOTP = req.session.otp;
      
        if (sessionOTP === otp) {
          req.session.otp = null;
          const userData = req.session.user;
          const user = new User(userData);
          user.isOTPVerified= true;
          await user.save();
          req.session.userData = null;
          res.render('users/home');
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
console.log(userData);
      const newOTP = generateOTP();
      req.session.otp = newOTP;
      await sendOTPViaEmail(userData.userEmail, newOTP);

      res.redirect(`/otp`);
  } catch (error) {
      res.status(500).send(error.message);
  }
};


const loginhome=async(req,res)=>{
    try {
       
    res.render('users/home')
    
    } catch (error) {
        console.log(error.message)
    }
  }  

    const loadsign=async(req,res)=>{
      try {
         
      res.render('users/sign')
      
      } catch (error) {
          console.log(error.message)
      }

    }
    
const verify_user=async(req,res)=>{
  try{
    const userEmail= req.body.userEmail;
    const password = req.body.password;
    const userData = await User.findOne({userEmail});
    if(userData){
        const passwordMatch = await bcrypt.compare(password,userData.password);
        if(passwordMatch){
            if(userData.is_blocked === 0){
                req.session.user_id = userData._id;
                res.redirect('/home');
            }else{
                res.render('users/sign',{message : "User blocked"});
            }
        }else{
            res.render('users/sign',{message : "Incorrect Password"});
        }
    }else{
        res.render('users/sign',{message : "User not found"});
    }
}catch(error){
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
                  password:null,
                  is_admin: 0
               
              });
              await user.save();
          }

  

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
            return res.render('sign',{ message : 'User blocked'});
        }
        req.session.user_id = req.user._id;
        res.redirect('/home');
    } catch (error) {
        res.send(error);
    }
};

 ///product load for user
 const load_product=async(req,res)=>{
      try {
    const product_data=await product.find() 
    res.render("users/products",{product:product_data})
   



      } catch (error) {
        console.log(error);
      }
   

}

module.exports={
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
        load_product

      }

    