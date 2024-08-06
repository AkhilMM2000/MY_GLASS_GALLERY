const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'costomer', required: true },
    orderId: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    shippingCharge: {
        type: Number,
        default: 0
    },
    address: {
        addressName: String,
        addressEmail: String,
        addressMobile: Number,
        addressHouse: String,
        addressStreet: String,
        addressPost: String,
        addressCity: String,
        addressDistrict: String,
        addressState: String,
        addressPin: Number
    },
    products: [{
        productId: {
            type:mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        totalPrice: {
            type: Number
           
        },
        status: { type: String },
        cancelReason: { type: String }
    }],
    totalAmount: { type: Number, required: true },
    orderDate: {
        type: Date,
        // default: Date.now,
        require:true
      }
});

module.exports = mongoose.model('order', orderSchema);
