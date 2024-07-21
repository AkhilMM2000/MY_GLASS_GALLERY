const User=require("../model/userModel")
const product=require('../model/productModel')

const load_product=async(req,res)=>{
    try {
        res.render('admin/addproduct')
 
    } catch (error) {
 
     console.log(error);
 
    }
   
 }
 const add_product = async (req, res) => {
     try {
       const files = req.files;
       console.log(files);
   
       if (!files || files.length === 0) {
         return res.status(400).send('No files were uploaded.');
       }
   
       // Extract product name from request body
       const productName = req.body.brandName;
   
       // Map file paths
       const imagePaths = files.map(file => file.filename);
   
       // Create new product document
       const newProduct =new product ({
         productName: productName, // This will be undefined if not provided, which is fine as it's not required
         productimages: imagePaths
       });
 
       // Insert the new product
  const result = await newProduct.save();
   
       console.log(result);
       res.status(200).redirect('/admin/addproduct')
     } catch (error) {
       console.error('Error adding product:', error);
       res.status(500).send('Error adding product');
     }
   };
  
 
 module.exports={
      load_product,
      add_product
 
 }