const User=require("../model/userModel")
const product=require('../model/productModel')
const brand=require('../model/brandModel')
const mongoose=require('mongoose')
const category = require("../model/category")

const get_addbrand=async(req,res)=>{
  try {

      res.render('admin/addbrand')

  } catch (error) {

   console.log(error);

  }
 
}

const add_brand=async(req,res)=>{
  try {
    const { brandName, brandStatus } = req.body;
  
    let status;
 
    if (brandStatus  ==="Listed") {
        status = true;
    } else {
        status = false;
    }

    const data = new brand({
         brandName, 
        listed: status 
    });

    const result = await data.save();
    res.status(201).redirect('/admin/brand');
} catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred', error });
}
 
}

const load_brand=async(req,res)=>{
  try {
    const brands = await brand.find();
      res.render('admin/brandlist',{brands})

  } catch (error) {

   console.log(error);

  }
 
}
const brand_listed = async (req, res) => {
  try {
      const brandid = req.query.id;
      const branddata= await brand.findByIdAndUpdate(brandid, { listed:true});
     console.log(branddata);
      if (branddata) {
          res.status(200).json({ message: 'category listed successfully' });
      } else {
          res.status(200).json({ message: "Couldn't  list brand" });
      }
  } catch (error) {
      res.send(error);
  }
};
const brand_Unlisted = async (req, res) => {
  try {
      const brandid = req.query.id;
      const branddata= await brand.findByIdAndUpdate(brandid, { listed:false});
     console.log(branddata);
      if (branddata) {
          res.status(200).json({ message: 'category Unlisted successfully' });
      } else {
          res.status(200).json({ message: "Couldn't  Unlist brand" });
      }
  } catch (error) {
      res.send(error);
  }
};

const brand_editname=async(req,res)=>{
  try{
const brandid=req.query.id
const newname=req.query.brandname
const existingbrand = await brand.findOne({
  brandName: { $regex: new RegExp('^' + newname + '$', 'i') }
});

if (existingbrand) {
  // Handle the case where the category name already exists
  return res.status(400).json({ message: 'brand name already exists.' });
}

// Update the category name
const branddata = await brand.findByIdAndUpdate(
  brandid,
  { brandName: newname },
 
);

res.json({
  message: 'Brand name successfully updated.',

});

} catch (error) {
console.error('Error updating category:', error);
res.status(500).json({ message: 'An error occurred while updating the category.' });
}
}




const load_product=async(req,res)=>{
    try {
 const categorydata=await category.find()
 const brandata=await brand.find()


        res.render('admin/addproduct',{categorydata,brandata})
 
    } catch (error) {
 
     console.log(error);
 
    }
   
 }

 const add_product = async (req, res) => {
     try {
       const files = req.files;
    
       if (!files || files.length === 0) {
         return res.status(400).send('No files were uploaded.');
       }

       // Map file paths
       const imagePaths = files.map(file => file.filename);
       const {
        productName,
        quantity,
        branded,
        description,
        price,
        discountPrice,
        gender,
        category
      } = req.body;
     console.log(branded);
     console.log(category);
       // Create new product document
       const newProduct = new product ({
        productName,
        productimages: imagePaths,
        quantity,
        productBrand:branded,
        description,
        price,
        discountPrice,
        gender,
        category

           });

       // Insert the new product
        await newProduct.save();
   
      //  console.log(result);
      res.status(200).json({ message: 'Product uploaded successfully' });
     } catch (error) {
    
      res.status(500).json({ message: error.message });
     }
   };
  
////>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 




 module.exports={
      load_product,
      add_product,
      load_brand,
      get_addbrand,
      add_brand,
      brand_listed,
      brand_Unlisted,
      brand_editname
    }
