const User=require("../model/userModel")
const product=require('../model/productModel')

const category = require("../model/category")

const admhome=async(req,res)=>{
    try {
          res.render('admin/dashboard')
res
    } catch (error) {
        console.log(error);
    }
      
}

const userlist=async(req,res)=>{
    try {
      
        const users=await User.find()
        res.render('admin/userlist',{users})
    } catch (error) {
        console.log(error);
    }
}

const blockUser = async (req, res) => {
    try {
        const userId = req.query.id;
        const userData = await User.findByIdAndUpdate(userId, { is_blocked: 1 });
        if (userData) {
            res.status(200).json({ message: 'User blocked successfully' });
        } else {
            res.status(200).json({ message: "Couldn't block user" });
        }
    } catch (error) {
        res.send(error);
    }
};

const unblockUser = async (req, res) => {
    try {
        const userId = req.query.id;
        const userData = await User.findByIdAndUpdate(userId, { is_blocked: 0 });
        if (userData) {
            res.status(200).json({ message: 'User unblocked successfully' });
        } else {
            res.status(200).json({ message: "Couldn't unblock user" });
        }
    } catch (error) {
        res.send(error);
    }
};

const get_addcategory=async(req,res)=>{
    try {
          res.render('admin/addcategory')
res
    } catch (error) {
        console.log(error);
    }
      
}
const addcategory = async (req, res) => {
    try {
        const { categoryName, categoryStatus } = req.body;
      
        let status;
     
        if (categoryStatus ==="Listed") {
            status = true;
        } else {
            status = false;
        }

        const data = new category({
             categoryName, // assuming your schema has 'name' field for category name
            listed: status // assuming your schema has 'listed' field for status
        });

        const result = await data.save();
        res.status(201).redirect('/admin/category');
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'An error occurred', error });
    }
};


const load_category=async(req,res)=>{
    try {

        const categories = await category.find();
        res.render('admin/category', { categories });
// console.log(categories);
    } catch (error) {
        console.log(error);
    }
      
}

module.exports={
    admhome,
    userlist,
    blockUser,
    unblockUser,
    load_category,
    get_addcategory,
    addcategory
 }


