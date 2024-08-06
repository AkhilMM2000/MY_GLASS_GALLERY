const User = require("../model/userModel")
const nodemailer = require('nodemailer');
const passport = require('passport');
const product = require('../model/productModel')
const Cart = require('../model/cartModel')
const Address = require('../model/addressModel')
const Orders = require('../model/orderModel')

const load_checkout = async (req, res) => {

    try {

        const addres_data = await Address.find({ user_id: req.session.userid })

        const cartItems = await Cart.find({ user: req.session.userid }).populate('products.product')
        let total = 0;
        cartItems.forEach(cart => {
            total += cart.products.reduce((acc, item) => {
                return acc + (item.product.price * item.quantity);
            }, 0);
        });

        res.render('users/checkout', { address: addres_data, total })

    } catch (error) {

        console.log(error);

    }
}

function generateOrderId() {
    return 'ORD' + Date.now() + Math.random().toString(27).substr(2, 5).toUpperCase();
}



const place_order = async (req, res) => {
    try {

        const { paymentMethod, addressId } = req.body
        const user = req.session.userid
        const cart = await Cart.findOne({ user: user }).populate('products.product');
        if (!cart || cart.products.length === 0) {
            return res.json({ success: false, message: 'Your cart is empty' });
        }

        // Fetch the selected address
        const address = await Address.findById(addressId);
        if (!address) {
            return res.json({ success: false, message: 'Invalid address selected' });
        }

        // Calculate total amount
        const totalAmount = cart.products.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);
        // Create a new order
        const newOrder = new Order({
            userId: user,
            orderId: generateOrderId(),
            paymentMethod: paymentMethod,
            shippingCharge: 0,
            address: address,
            products: cart.products.map(item => ({
                productId: item.product._id,

                quantity: item.quantity,
                size: item.size,
                price: item.product.price,
                status: 'Pending'
            })),
            totalAmount: totalAmount,
            orderDate: new Date()
        });

        await newOrder.save();
        await Cart.findOneAndUpdate({ user: user }, { $set: { products: [] } });
        //   console.log(newOrder.orderId);
        res.json({ success: true, message: 'Order placed successfully', redirect: `/placeorder?id=${newOrder.orderId}` });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'An error occurred while placing the order' });
    }
}


const order_success = async (req, res) => {
    try {
        const orderid = req.query.id
        const order_data = await Order.find({ orderId: orderid }).populate("products.productId")

        let b = order_data[0]
        // order_data.forEach(item => {
        b.products.forEach(an => {
            // console.log(an.productId.productName);
        })
        // })
        const addressdata = order_data[0].address;
        // console.log(order_data[0].orderId,order_data[0].orderDate);
        res.render('users/orderplaced', { order: order_data[0], addressdata })
    } catch (error) {
        console.log(error);
    }
}

//for admin orders-------------------------------------------------------------------------------------------------------------->
const admin_orders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Get the current page from query params
        const limit = 7;
        const skip = (page - 1) * limit;

        // Fetch total count of orders
        const totalOrders = await Orders.countDocuments();

        // Fetch orders with pagination
        // const orders = await Orders.find()
        //     .sort({ orderDate: -1 }) // Sort by creation date, newest first
        //     .skip(skip)
        //     .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);
        const order = await Orders.find()
            .populate('userId')
            .populate('products.productId')
            .sort({ orderDate: -1 }) // Sort by creation date, newest first
            .skip(skip)
            .limit(limit);

        res.render('admin/userorder', {
            order,
            currentPage: page,
            totalPages,
        })

    } catch (error) {
        console.log(error);
    }

}

const view_order = async (req, res) => {
    try {
        const order = req.query.orderID
        const orderdata = await Orders.find({ orderId: order }).populate('products.productId')
let b=orderdata[0]
        res.render('admin/userdetailorder', {orderdata})

    } catch (error) {
        console.log(error);
    }

}

module.exports = {
    load_checkout,
    place_order,
    order_success,
    admin_orders,
    view_order
}
