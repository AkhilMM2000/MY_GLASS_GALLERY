const User = require("../model/userModel")
const nodemailer = require('nodemailer');
const passport = require('passport');
const product = require('../model/productModel')
const Cart = require('../model/cartModel')
const Address = require('../model/addressModel')
const Orders = require('../model/orderModel')
const Razorpay = require('razorpay')
const userwallet = require('../model/walletModal')
const coupon=require('../model/coupenModel')

const load_checkout = async (req, res) => {

  try {

const coupon_data=await coupon.find()

    const addres_data = await Address.find({ user_id: req.session.userid })
    const userId = req.session.userid;
    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'products.product',
      populate: [
        { path: 'offers' }

      ]
    });

    if (cart && cart.products.length > 0) {
      let totalCartAmount = 0; // Initialize the total amount

      cart.products.forEach(item => {
        const product = item.product;

        let highestDiscountPrice = product.price; // Default to normal price

        if (product.offers && product.offers.length > 0) {
          product.offers.forEach(offer => {
            if (offer.status === true) { 
            const discountAmount = (product.price * offer.discount) / 100;
            const discountedPrice = product.price - discountAmount;

            if (discountedPrice < highestDiscountPrice) {
              highestDiscountPrice = discountedPrice;
            }
          }
          });
        }
        item.discountPrice = highestDiscountPrice;
        totalCartAmount += highestDiscountPrice * item.quantity;
      });

      res.render('users/checkout', { address: addres_data, totalCartAmount,cart,coupon:coupon_data })
    }
  } catch (error) {

    console.log(error);

  }
}

function generateOrderId() {
  return 'ORD' + Date.now() + Math.random().toString(27).substr(2, 5).toUpperCase();
}
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
//place order start here

const place_order = async (req, res) => {
  try {
    const { paymentMethod, addressId, razorpay_order_id, razorpay_payment_id } = req.body;
    const user = req.session.userid;

    // Fetch the cart for the user
    const cart = await Cart.findOne({ user: user }).populate({
      path: 'products.product',
      populate: [{ path: 'offers' }]
    });

    // Check if the cart is empty
    if (!cart || cart.products.length === 0) {
      return res.json({ success: false, message: 'Your cart is empty' });
    }

    // Fetch the selected address
    const address = await Address.findById(addressId);
    if (!address) {
      return res.json({ success: false, message: 'Invalid address selected' });
    }

    // Initialize total amount and prepare product details with discounts
    let totalAmount = 0;
    const productsWithDiscounts = cart.products.map(item => {
      const product = item.product;
      let highestDiscountPrice = product.price; // Default to normal price

      // Calculate the highest discount price
      if (product.offers && product.offers.length > 0) {
        product.offers.forEach(offer => {
          const discountAmount = (product.price * offer.discount) / 100;
          const discountedPrice = product.price - discountAmount;

          if (discountedPrice < highestDiscountPrice) {
            highestDiscountPrice = discountedPrice;
          }
        });
      }

      // Update total amount with discounted price
      totalAmount += highestDiscountPrice * item.quantity;

      // Return product details with discounted price
      return {
        productId: product._id,
        quantity: item.quantity,
        price: highestDiscountPrice, // Save the discounted price
        status: 'Pending'
      };
    });

    // Handle Razorpay payment method
    if (paymentMethod === 'razorpay' && !razorpay_order_id) {
      const options = {
        amount: totalAmount * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "receipt_" + Math.random().toString(36).substr(2, 9),
        payment_capture: 1 // Auto capture
      };

      const razorpayOrder = await razorpayInstance.orders.create(options);

      if (!razorpayOrder) {
        return res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
      }

      return res.json({
        success: true,
        key_id: process.env.RAZORPAY_KEY_ID,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      });
    }

    // Create a new order with discounted prices
    const newOrder = new Orders({
      userId: user,
      orderId: generateOrderId(),
      paymentMethod: paymentMethod,
      shippingCharge: 0,
      address: address,
      products: productsWithDiscounts, // Use products with discounted prices
      totalAmount: totalAmount,
      razorpay_id: razorpay_payment_id,
      orderDate: new Date()
    });

    
    // Update stock for each product in the cart
    for (const item of cart.products) {
      const product_array = await product.findById(item.product._id);
      if (product_array) {
        product_array.stock -= item.quantity;
        await product_array.save();
      }
    }

    // Save the new order and clear the cart
    await newOrder.save();
    await Cart.findOneAndUpdate({ user: user }, { $set: { products: [] } });

    res.json({ success: true, message: 'Order placed successfully', redirect: `/placeorder?id=${newOrder.orderId}` });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'An error occurred while placing the order' });
  }
};


////place order end here--------------------------------------------------------------------


const order_success = async (req, res) => {
  try {
    const orderid = req.query.id
    const order_data = await Orders.find({ orderId: orderid }).populate("products.productId")

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
    let b = orderdata[0]
    res.render('admin/userdetailorder', { orderdata })

  } catch (error) {
    console.log(error);
  }

}
const update_order = async (req, res) => {
  try {
    const { status, productid, orderID } = req.body
    const order = await Orders.findOne({ orderId: orderID });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const productIndex = order.products.findIndex(p => p._id.toString() === productid);
    console.log(productIndex, productid);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in this order' });
    }

    order.products[productIndex].status = status;

    await order.save();

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ success: false, message: 'An error occurred while updating the status' });
  }

}
///for get wallet----------------------------
const load_wallet = async (req, res) => {
  try {

    const wallet = await userwallet.find()
    console.log(wallet);

    res.render('users/wallet', { wallet })
  } catch (error) {
    console.log(error);
  }

}
//return the order------------------------------------------------------------>
const return_request = async (req, res) => {

  try {
    const { reason, order, product } = req.body;

    console.log(reason, order, product);

    const orderdata = await Orders.findOne({
      orderId: order
    });

    if (!orderdata) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const productIndex = orderdata.products.findIndex(p => p.productId.toString() === product);

    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    orderdata.products[productIndex].return_request = true;
    orderdata.products[productIndex].return_reason = reason;


    await orderdata.save();

    res.json({ success: true, message: 'Return request processed successfully' });
  } catch (error) {
    console.error('Error processing return request:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }

}
//admin accept return request
const return_accept = async (req, res) => {
  try {

    const { order, productid } = req.body
    // console.log(order,productid);

    const orderdata = await Orders.findOne({
      orderId: order
    })
    const productdata = await product.findOne({
      _id: productid
    });

    const user_id = orderdata.userId

    if (!orderdata) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const productIndex = orderdata.products.findIndex(p => p.productId.toString() === productid);

    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    orderdata.products[productIndex].return_request = false;
    orderdata.products[productIndex].status = 'Returned';
    const number = orderdata.products[productIndex].quantity;
    const amount = orderdata.products[productIndex].price * number;
    console.log(amount);

    // Update the product stock
    await product.updateOne(
      { _id: productid },
      { $inc: { stock: number } }
    );

    // Check if the user already has a wallet
    let wallet = await userwallet.findOne({ user_id: user_id });
    console.log(wallet);
    if (!wallet) {

      wallet = new userwallet({
        user_id: userId,
        balance: amount,
        transactions: [{
          amount: amount,
          description: 'product:' + productdata.productName
        }]
      });
    } else {

      wallet.balance += amount;
      wallet.transactions.push({
        amount: amount,
        description: 'product:' + productdata.productName
      });
    }
    // Save the wallet
    await wallet.save();
    await orderdata.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing return:', error);
    res.json({ success: false, error: error.message });
  }

}


module.exports = {
  load_checkout,
  place_order,
  order_success,
  admin_orders,
  view_order,
  update_order,
  load_wallet,
  return_request,
  return_accept
}
