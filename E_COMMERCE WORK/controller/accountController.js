const User = require("../model/userModel")
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");
const product = require('../model/productModel')
const Cart = require('../model/cartModel')
const Address = require('../model/addressModel')
const Orders = require("../model/orderModel");

const load_address = async (req, res) => {
    try {
        const address_data = await Address.find({ user_id: req.session.userid })
        // console.log(address_data);

        res.render('users/address', { data: address_data })

    } catch (error) {

        console.log(error);

    }

}

const add_address = async (req, res) => {
    try {
        const { addressName, addressEmail, addressMobile, addressHouse, addressStreet, addressPost, addressCity,
            addressDistrict, addressState, addressPin
        } = req.body;

        // console.log(addressName, addressEmail, addressMobile, addressHouse, addressStreet, addressPost, addressCity, addressDistrict, addressState, addressPin);

        const newAddress = new Address({
            user_id: req.session.userid, addressName, addressEmail, addressMobile, addressHouse, addressStreet, addressPost,
            addressCity, addressDistrict, addressState, addressPin
        });
        await newAddress.save();
        res.json({ success: true, message: 'Address saved successfully!' });
    } catch (error) {
        console.log("add address", error);
        res.status(500).json({ success: false, message: 'Error saving address. Please try again.' });
    }

}

const delete_address = async (req, res) => {

    try {
        const addressId = req.params.addressId;
        // console.log("deleted id is", addressId);

        const result = await Address.deleteOne({ _id: addressId });

        if (result.deletedCount === 1) {

            res.json({ success: true });
        } else {

            res.json({ success: false, error: 'Address not found or could not be deleted.' });
        }
    } catch (error) {

        console.error("Error deleting address:", error);
        res.json({ success: false, error: error.message });
    }

}

const edit_address = async (req, res) => {
    try {
        const addressId = req.params.id;
        const updatedData = req.body;
        console.log(updatedData);

        const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

        if (updatedAddress) {

            res.json({ success: true, message: 'Address updated successfully' });
        } else {

            res.status(404).json({ success: false, message: 'Address not found' });
        }
    } catch (error) {
        // Handle any errors that occur during the update process
        console.error('Error updating address:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the address' });
    }
};


const load_orders = async (req, res) => {
    try {
        const user= req.session.userid
        const page = parseInt(req.query.page) || 1; // Get the page from query params, default to 1
        const limit = 5; // Number of orders per page
        const skip = (page - 1) * limit;

        const totalOrders = await Orders.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        const order = await Orders.find({userId:user}).populate('products.productId').skip(skip)
            .limit(limit)
            .sort({ orderDate: -1 });

        res.render('users/myorders', {
            order, currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        })

    } catch (error) {
        console.log(error);

    }

}

const order_details = async (req, res) => {
    try {
        const orderid = req.query.orderId;
        const order_data = await  Orders.find({ orderId: orderid }).populate("products.productId")
        const addressdata = order_data[0].address;
   res.render('users/orderdetails',{order: order_data[0],addressdata})

    } catch (error) {
console.log(error);
    }
   }
 
module.exports = {
    load_address,
    add_address,
    delete_address,
    edit_address,
    load_orders,
    order_details
}

