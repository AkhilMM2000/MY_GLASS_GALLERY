const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName:{
    type:String,
    required:false
  },
  productimages:{
   type:[String],
   required:true
  },
  productBrand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
    required: true
},
  description:{
    type:String
  },
  gender: {
    type: String,
    enum: ['men', 'women', 'kids'],
    required: true,
    
  },
  category:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true
  }

});

module.exports = mongoose.model('product', productSchema);
 