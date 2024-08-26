const User = require("../model/userModel")
const nodemailer = require('nodemailer');
const passport = require('passport');
const product = require('../model/productModel')
const Cart = require('../model/cartModel')
const Address = require('../model/addressModel')
const Orders = require('../model/orderModel')
const Razorpay = require('razorpay')
const userwallet = require('../model/walletModal')
const Coupon = require('../model/coupenModel')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const fs = require('fs');
const path = require('path');

const load_checkout = async (req, res) => {

  try {

    const coupon_data = await Coupon.find({
      
expirationDate: { $gt: new Date() }, 
      status: true // Only coupons with status set to true
    });
    

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

      res.render('users/checkout', { address: addres_data, totalCartAmount, cart, coupon: coupon_data })
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
//place order start here--------------------------------------------------------------------------------------place order--------------------------------
const place_order = async (req, res) => {
  try {
    const { paymentMethod, addressId, coupon, razorpay_order_id, razorpay_payment_id, couponDiscountPercentage, couponDiscountAmount } = req.body;
    const userId = req.session.userid;
    console.log(req.body);

    // Fetch the cart for the user
    const cart = await Cart.findOne({ user: userId }).populate({
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
    let discountAmount = 0;
    let discountPercentage = null;
    let couponApplied = null;

    const productsWithDiscounts = cart.products.map(item => {
      const product = item.product;
      let highestDiscountPrice = product.price; // Default to normal price

      // Calculate the highest discount price
      if (product.offers && product.offers.length > 0) {
        product.offers.forEach(offer => {
          const discount = (product.price * offer.discount) / 100;
          const discountedPrice = product.price - discount;

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

    // Apply coupon if provided

    if (coupon) {
      const foundCoupon = await Coupon.findOne({ code: coupon });

      if (foundCoupon && foundCoupon.status) {
        if (totalAmount >= foundCoupon.minPurchaseAmount) {
          discountAmount = Math.floor((totalAmount * foundCoupon.discount) / 100);
          discountAmount = Math.min(discountAmount, foundCoupon.maxDiscountAmount);
          totalAmount -= discountAmount;
          discountPercentage = foundCoupon.discount;
          couponApplied = foundCoupon._id;
        } else {
          return res.status(400).json({ success: false, message: `Minimum purchase amount for this coupon is ₹${foundCoupon.minPurchaseAmount}.` });
        }
      }
    }

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

      console.log('Discount amunt: ', discountAmount);
      console.log('Discount rate: ', discountPercentage);

      return res.json({
        success: true,
        key_id: process.env.RAZORPAY_KEY_ID,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        discountPercentage: discountPercentage,
        discountAmount: discountAmount,
        couponApplied: couponApplied
      });
    }

    console.log("req.body next time come", req.body);

    if (req.body.paymentMethod == 'razorpay' && req.body.razorpay_order_id) {
      console.log('Discount details changed');
      discountAmount = req.body.couponDiscountAmount;
      discountPercentage = req.body.couponDiscountPercentage;
      couponApplied = req.body.couponid
      console.log('Final Discount amunt:got ', req.body.couponDiscountAmount);
      console.log('Final Discount rate: got', req.body.couponDiscountPercentage);

    }

    console.log('Final Discount amunt: ', req.body.couponDiscountAmount);
    console.log('Final Discount rate: ', req.body.couponDiscountPercentage);

    console.log(discountAmount, discountPercentage,);

    // Create a new order with discounted prices
    const newOrder = new Orders({
      userId: userId,
      orderId: generateOrderId(),
      paymentMethod: paymentMethod,
      address: address,
      products: productsWithDiscounts, // Use products with discounted prices
      totalAmount: totalAmount,
      discountAmount: discountAmount,
      discountPercentage: discountPercentage,
      razorpay_id: razorpay_payment_id,
      orderDate: new Date()
    });

    // Save the new order
    await newOrder.save();

    // Update stock for each product in the cart
    for (const item of cart.products) {
      const product_array = await product.findById(item.product._id);
      if (product_array) {
        product_array.stock -= item.quantity;
        await product_array.save();
      }
    }

    // Save the coupon to usedCoupons if a coupon was applied

    if (couponApplied) {

      const user = await User.findById(userId);
      user.usedCoupons.push(couponApplied);
      await user.save();
    }

    // Clear the cart after successful order
    await Cart.findOneAndUpdate({ user: userId }, { $set: { products: [] } });

    res.json({ success: true, message: 'Order placed successfully', redirect: `/placeorder?id=${newOrder.orderId}` });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'An error occurred while placing the order' });
  }
};

////place order end here--------------------------------------------------------------------------------place order end here----------------------


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

    const wallet = await userwallet.find({
      user_id:req.session.userid})
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
    const { order, productid } = req.body;

    const orderdata = await Orders.findOne({
      orderId: order
    });

    if (!orderdata) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const productdata = await product.findOne({
      _id: productid
    });

    if (!productdata) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user_id = orderdata.userId;

    const productIndex = orderdata.products.findIndex(p => p.productId.toString() === productid);

    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    // Update the product status and return request status
    orderdata.products[productIndex].return_request = false;
    orderdata.products[productIndex].status = 'Returned';

    const quantity = orderdata.products[productIndex].quantity;
    const totalAmount = orderdata.products[productIndex].price * quantity;

    // Update the product stock
    await product.updateOne(
      { _id: productid },
      { $inc: { stock: quantity } }
    );

    // Calculate the refund amount
    if (orderdata.paymentMethod ==='razorpay') {
      let refundAmount = totalAmount;
  
      if (orderdata.discountAmount && orderdata.discountAmount !== 0) {
          const discountPercentage = Math.ceil((orderdata.discountAmount * 100) / orderdata.totalAmount);
          refundAmount = totalAmount - Math.ceil(totalAmount * (discountPercentage / 100));
      }
  
      // Check if the user already has a wallet
      let wallet = await userwallet.findOne({ user_id: user_id });
  
      if (!wallet) {
          wallet = new userwallet({
              user_id: user_id,
              balance: refundAmount,
              transactions: [{
                  amount: refundAmount,
                  description: 'product: ' + productdata.productName
              }]
          });
      } else {
          wallet.balance += refundAmount;
          wallet.transactions.push({
              amount: refundAmount,
              description: 'product: ' + productdata.productName
          });
      }
  
      // Save the wallet and order data
      await wallet.save();
  }
  

    await orderdata.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing return:', error);
    res.json({ success: false, error: error.message });
  }
}

//get the sales report page here----------------------------------------------------------------
const load_sales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const filter = req.query.filter || 'monthly';
    // Construct the query string for pagination links, excluding the 'page' parameter
    const queryString = Object.entries(req.query)
      .filter(([key]) => key !== 'page')
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    let dateFilter = {};
    if (filter === 'custom') {
      const startDate = new Date(req.query.startDate);
      let endDate = new Date(req.query.endDate);

      // Adjust endDate to include the full day
      endDate.setHours(23, 59, 59, 999);

      if (startDate && endDate) {
        dateFilter = {
          orderDate: {
            $gte: startDate,
            $lte: endDate
          }
        };
      }
    } else {
      const now = new Date();
      if (filter === 'daily') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { orderDate: { $gte: startOfDay } };
      } else if (filter === 'weekly') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = { orderDate: { $gte: startOfWeek } };
      } else if (filter === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { orderDate: { $gte: startOfMonth } };
      }
    }

    const orders = await Orders.find(dateFilter)
      .populate('products.productId')
      .skip(skip)
      .limit(limit)
      .lean();
      let totalAmount=0
      let totalDiscount=0
       orders.forEach(order => {
         totalAmount += order.totalAmount;
         totalDiscount += order.discountAmount || 0;
       });
   
    const totalOrders = await Orders.countDocuments(dateFilter);
   
    res.render('admin/salesreport', {
      orders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      selectedFilter: filter,
      totalOrders,
      totalAmount,
      totalDiscount,
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      queryString: queryString ? `&${queryString}` : ''
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while loading the sales report.");
  }
};

////download the sales report as pdf form using pdfkit 

const pdf_download = async (req, res) => {
  try {
    const filter = req.body.filter || 'monthly';
    let dateFilter = {};

    if (filter === 'custom') {
      const startDate = new Date(req.body.startDate);
      let endDate = new Date(req.body.endDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter = { orderDate: { $gte: startDate, $lte: endDate } };
    } else {
      const now = new Date();
      if (filter === 'daily') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { orderDate: { $gte: startOfDay } };
      } else if (filter === 'weekly') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = { orderDate: { $gte: startOfWeek } };
      } else if (filter === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { orderDate: { $gte: startOfMonth } };
      }
    }

    const orders = await Orders.find(dateFilter)
      .populate('products.productId')
      .lean();

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    doc.pipe(res);

    let totalOrders = orders.length;
    let totalAmount = 0;
    let totalDiscount = 0;

    orders.forEach(order => {
      totalAmount += order.totalAmount;
      totalDiscount += order.discountAmount || 0;
    });

    // Add report title and summary
    doc.fontSize(18).text('Sales Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Orders: ${totalOrders}`);
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`);
    doc.text(`Total Discount: ${totalDiscount.toFixed(2)}`);
    doc.moveDown(2); 
    // Adjusted column positions for better visibility
    const columnPositions = {
      orderId: 50,
      date: 200,
      product: 300,
      price: 450,
      total: 520
    };
    // Add table headers
    doc.fontSize(10)
      .text('Order ID', columnPositions.orderId, doc.y, { continued: true, width: 140 })
      .text('Date', columnPositions.date, doc.y, { continued: true, width: 90 })
      .text('Product', columnPositions.product, doc.y, { continued: true, width: 140 })
      .text('Price', columnPositions.price, doc.y, { continued: true, width: 60 })
      .text('Total', columnPositions.total, doc.y);

    // Draw a line below headers
    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
    doc.moveDown(1);

    // Add table rows with consistent alignment and spacing
    orders.forEach(order => {
      order.products.forEach((product, index) => {
        const productNameWithQuantity = `${product.productId.productName} (${product.quantity})`;

        doc.fontSize(9)
          .text(index === 0 ? order.
            orderId : '', columnPositions.orderId, doc.y, { continued: true, width: 140 })
          .text(index === 0 ? order.orderDate.toISOString().split('T')[0] : '', columnPositions.date, doc.y, { continued: true, width: 90 })
          .text(productNameWithQuantity, columnPositions.product, doc.y, { continued: true, width: 140 })
          .text(product.productId.price.toFixed(2), columnPositions.price, doc.y, { continued: true, align: 'right', width: 60 })
          .text((product.quantity * product.productId.price).toFixed(2), columnPositions.total, doc.y, { align: 'right', width: 60 });
        doc.moveDown(0.5);
      });
      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(0.5);
    });
    doc.end();
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while generating the PDF report.");
  }
};


const excel_download = async (req, res) => {
  try {
    const filter = req.body.filter || 'monthly';
    let dateFilter = {};

    if (filter === 'custom') {
      const startDate = new Date(req.body.startDate);
      let endDate = new Date(req.body.endDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter = { orderDate: { $gte: startDate, $lte: endDate } };
    } else {
      const now = new Date();
      if (filter === 'daily') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { orderDate: { $gte: startOfDay } };
      } else if (filter === 'weekly') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = { orderDate: { $gte: startOfWeek } };
      } else if (filter === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { orderDate: { $gte: startOfMonth } };
      }
    }

    const orders = await Orders.find(dateFilter)
      .populate('products.productId')
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add headers
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Discount', key: 'discount', width: 15 }
    ];

    let totalOrders = orders.length;
    let totalAmount = 0;
    let totalDiscount = 0;

    orders.forEach(order => {
      let discountAdded = false;

      order.products.forEach(product => {
        const productNameWithQuantity = `${product.productId.productName} (${product.quantity})`;
        const productTotal = product.quantity * product.productId.price;

        totalAmount += productTotal;
        if (!discountAdded) {
          totalDiscount += order.discountAmount || 0;
          discountAdded = true;
        }

        worksheet.addRow({
          orderId: order.orderId,
          date: order.orderDate.toISOString().split('T')[0],
          product: productNameWithQuantity,
          price: product.productId.price.toFixed(2),
          total: productTotal.toFixed(2),
          discount: discountAdded ? (order.discountAmount || 0).toFixed(2) : ''
        });
      });
    });

    // Add summary row
    worksheet.addRow([]);
    worksheet.addRow({
      product: `totalOrders:${totalOrders}`,
      total:  totalAmount.toFixed(2),
      
      discount: totalDiscount.toFixed(2)
    });

    // Adjust the cell style (optional)
    worksheet.getRow(1).font = { bold: true };

    // Send the Excel file as a response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while generating the Excel report.");
  }
};


module.exports = {
  load_checkout,
  place_order,
  order_success,
  admin_orders,
  view_order,
  update_order,
  load_wallet,
  return_request,
  return_accept,
  load_sales,
  pdf_download,
  excel_download
}



