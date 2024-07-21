const mongoose = require('mongoose');
const  Brand= new mongoose.Schema({
   
    brandName : {
        type : String,
        required : true
    },
    is_delete : {
        type : Boolean,
        default : false
    }
})
module.exports = mongoose.model('Brand', Brand);
