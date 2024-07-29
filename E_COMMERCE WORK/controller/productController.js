const User = require("../model/userModel")
const product = require('../model/productModel')
const brand = require('../model/brandModel')
const mongoose = require('mongoose')
const category = require("../model/category")

const get_addbrand = async (req, res) => {
  try {

    res.render('admin/addbrand')

  } catch (error) {

    console.log(error);

  }

}

const add_brand = async (req, res) => {
  try {
    const { brandName, brandStatus } = req.body;

    let status;

    if (brandStatus === "Listed") {
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

const load_brand = async (req, res) => {
  try {
    const brands = await brand.find();
    res.render('admin/brandlist', { brands })

  } catch (error) {

    console.log(error);

  }

}
const brand_listed = async (req, res) => {
  try {
    const brandid = req.query.id;
    const branddata = await brand.findByIdAndUpdate(brandid, { listed: true });
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
    const branddata = await brand.findByIdAndUpdate(brandid, { listed: false });
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

const brand_editname = async (req, res) => {
  try {
    const brandid = req.query.id
    const newname = req.query.brandname
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




const load_product = async (req, res) => {
  try {
    const categorydata = await category.find({ listed: true })
    const brandata = await brand.find({ listed: true })


    res.render('admin/addproduct', { categorydata, brandata })

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
    const { listStatus } = req.body;
    const { quantity } = req.body;
    let total = parseInt(quantity)
    let status;

    if (listStatus === "listed") {
      status = true;
    } else {
      status = false;
    }
    // Map file paths
    const imagePaths = files.map(file => file.filename);
    const {
      productName,
      branded,
      description,
      price,

      gender,
      category

    } = req.body;
    console.log(branded);
    console.log(category);
    // Create new product document
    const newProduct = new product({
      productName,
      productimages: imagePaths,
      quantity,
      productBrand: branded,
      description,
      price,
      gender,
      category,
      listed: status,
      stock: total

    });

    // Insert the new product
    await newProduct.save();

    //  console.log(result);
    res.status(200).json({ message: 'Product uploaded successfully' });
  } catch (error) {

    res.status(500).json({ message: error.message });
  }
};
//  listproduct in the admin on table wise

const listproduct = async (req, res) => {
  try {
    const products = await product.find()
      .populate('productBrand', 'brandName')
      .populate('category', 'categoryName');


    res.render('admin/productlist', { products })

  } catch (error) {
    console.log(error);


  }

}

const list_item = async (req, res) => {
  try {
    const productid = req.query.id;
    const productdata = await product.findByIdAndUpdate(productid, { listed: true });

    if (productdata) {
      res.status(200).json({ message: 'product listed successfully' });
    } else {
      res.status(200).json({ message: "Couldn't unlist the produts" });
    }
  } catch (error) {
    res.send(error);
  }



}

const Unlist_item = async (req, res) => {

  try {
    const productid = req.query.id;
    const productdata = await product.findByIdAndUpdate(productid, { listed: false });

    if (productdata) {
      res.status(200).json({ message: 'product Unlisted successfully' });
    } else {
      res.status(200).json({ message: "Couldn't unlist the produts" });
    }
  } catch (error) {
    res.send(error);
  }



}

const load_editproduct = async (req, res) => {
  try {
    const productid = req.query.id

    const productdata = await product.findById(productid).populate('category').populate('productBrand');
    const categories = await category.find();
    const brands = await brand.find();

    if (!productdata) {
      console.log("product not found here");
    }
    res.render('admin/editproduct', { productdata, categories, brands });

  } catch (error) {

    console.log(error);

  }
}
const update_product = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files were uploaded.' });
    }

    const product_id = req.query.id
    const { listStatus, quantity, productName, branded, description, price, gender, category } = req.body;

    let total = parseInt(quantity);
    let status;

    if (listStatus === "listed") {
      status = true;
    } else {
      status = false;
    }

    // Map file paths
    const imagePaths = files.map(file => file.filename);

    // Create updated product document
    const updatedProduct = {
      listed: status, stock: quantity, productName, branded, description, price, gender, category, productimages: imagePaths
    };

    const result = await product.findByIdAndUpdate(product_id, updatedProduct, { new: true });

    if (!result) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      message: 'Product updated successfully',
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}


module.exports = {
  load_product,
  add_product,
  load_brand,
  get_addbrand,
  add_brand,
  brand_listed,
  brand_Unlisted,
  brand_editname,
  listproduct,
  list_item,
  Unlist_item,
  load_editproduct,
  update_product
}
