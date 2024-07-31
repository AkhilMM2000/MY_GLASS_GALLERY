const User = require("../model/userModel")
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require("bcrypt");
const product = require('../model/productModel')
const Cart = require('../model/cartModel')

const load_checkout = async (req, res) => {

    try {
        res.render('users/checkout')
    } catch (error) {
        console.log(error);
    }

}





module.exports = {
    load_checkout
}