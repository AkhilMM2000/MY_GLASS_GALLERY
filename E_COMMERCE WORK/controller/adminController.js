const User=require("../model/userModel")
const product=require('../model/productModel')

const category = require("../model/category")



const sign=async(req,res)=>{

try {
    
res.render('admin/login')
} catch (error) {
    console.log(error);

}
}

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

const category_listed = async (req, res) => {
    try {
        const categoryid = req.query.id;
        const categorydata= await category.findByIdAndUpdate(categoryid, { listed:true});
       
        if (categorydata) {
            res.status(200).json({ message: 'category listed successfully' });
        } else {
            res.status(200).json({ message: "Couldn't unblock user" });
        }
    } catch (error) {
        res.send(error);
    }
};
const category_Unlisted = async (req, res) => {
    try {
        const categoryid = req.query.id;
        
        const categorydata= await category.findByIdAndUpdate(categoryid, { listed:false});
    
       
        if (categorydata) {
            res.status(200).json({ message: 'category Ulisted successfully' });
        } else {
            res.status(200).json({ message: "Couldn't Unlist the category" });
        }
    } catch (error) {
        res.send(error);
    }
}

const edit_category=async(req,res)=>{
    try {
        const newName = req.query.catname;
        const categoryid = req.query.id;
    
        // // Convert the new name to lowercase for consistent comparison
        // const newNameLower = newName.toLowerCase();
    
        // Check if a category with the same name (case-insensitive) already exists
        const existingCategory = await category.findOne({
          categoryName: { $regex: new RegExp('^' + newName + '$', 'i') }
        });
    
        if (existingCategory) {
          // Handle the case where the category name already exists
          return res.status(400).json({ message: 'Category name already exists.' });
        }
    
        // Update the category name
        const categorydata = await category.findByIdAndUpdate(
          categoryid,
          { categoryName: newName },
         
        );
    
        res.json({
          message: 'Category name successfully updated.',
        
        });
      } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'An error occurred while updating the category.' });
      }
}

module.exports={
    sign,
    admhome,
    userlist,
    blockUser,
    unblockUser,
    load_category,
    get_addcategory,
    addcategory,
    edit_category,
    category_listed,
    category_Unlisted
 }


