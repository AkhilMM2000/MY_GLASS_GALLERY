const User = require("../model/userModel")
const nodemailer = require('nodemailer');
const passport = require('passport');
const product = require('../model/productModel')
const Cart = require('../model/cartModel')
const Address = require('../model/addressModel')
const Orders = require('../model/orderModel')
const Razorpay = require('razorpay')
const userwallet = require('../model/walletModal')
const Userdata = require('../model/userModel')
const category=require('../model/category')
const Offer= require('../model/offerModel')  
const get_addoffer = async (req, res) => {
    try {
        const productdata = await product.find({ listed: true })
        const categorydata = await category.find({ listed: true })

        res.render('admin/addOffer', { productdata,  categorydata})
    } catch (error) {
        console.log(error);

    }
}


const add_offer = async (req, res) =>{

    try {
       
        const { offerName, offerDescription, offerDiscount, offerType, offerProducts } = req.body;

   let value;
   if(  offerType=='Inactive'){
    value=false
   }else{
    value=true
   }
        const newOffer = new Offer({
            offerName,
            description: offerDescription,
            discount: parseInt(offerDiscount, 10), // Convert discount to number
      type:"productOffer",
            products: offerProducts.map(productId => ({
                productId: productId 
            })),
            category: [],
            status:value 
        });

        await newOffer.save();

        // Respond with success
        res.status(200).json({ success: true, message: 'Offer saved successfully' });
    } catch (error) {
        console.error('Error saving offer:', error);
        res.status(500).json({ success: false, message: 'Error saving offer' });
    }

}

module.exports = {
    get_addoffer,
    add_offer
}
