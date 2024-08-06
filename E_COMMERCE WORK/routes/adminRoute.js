const express=require('express');
const admin_route=express();
const path=require('path')
const session=require('express-session')
const config = require('../config/config');
const multer=require('../multer/image')
const adminController=require('../controller/adminController')
const productController=require('../controller/productController')
const orderController=require('../controller/orderController')
admin_route.use(session({
    secret: config.sessionSecretos,
    resave: false,
    saveUninitialized: false,
}));


// Middleware to parse JSON and urlencoded data
admin_route.use(express.json());
admin_route.use(express.urlencoded({ extended: true }));
admin_route.use(express.static(path.join(__dirname,'../public/admin')))

//admin login
admin_route.get('/login',adminController.sign)
admin_route.post('/login',adminController.verify_admin)


//-----------------------------------------------------------------------------------------------------------------====>
admin_route.get('/dashboard',adminController.admhome)
admin_route.get('/users',adminController.userlist)
admin_route.get('/users/block_user',adminController.blockUser);
admin_route.get('/users/unblock_user',adminController.unblockUser);

// category controller-----------------------------------------------------------------------------------------------------------------====>
admin_route.get('/category',adminController.load_category)
admin_route.get('/addcategory',adminController.get_addcategory)
admin_route.post('/addcategory',adminController.addcategory)
admin_route.get("/category/list",adminController.category_listed)
admin_route.get("/category/Unlist",adminController.category_Unlisted)
admin_route.get('/category/editname',adminController.edit_category)

//brand routes---------------------------------------------------------------------------------------------------------------------->
admin_route.get('/brand',productController.load_brand)
admin_route.get('/brand/list',productController.brand_listed)
admin_route.get('/brand/Unlist',productController.brand_Unlisted)
admin_route.get('/addbrand',productController.get_addbrand)
admin_route.post('/addbrand',productController.add_brand)
admin_route.get('/brand/editname',productController.brand_editname)
//product routes---------------------------------------------------------------------------------------------------------------------->
admin_route.get('/addproduct',productController.load_product)
admin_route.post('/addproduct',multer.array("productimage",3),productController.add_product)
admin_route.get('/products',productController.listproduct)
admin_route.get('/products/list',productController.list_item)
admin_route.get('/products/Unlist',productController.Unlist_item)
admin_route.get('/editproduct',productController.load_editproduct)
admin_route.patch('/editproduct',multer.array("productimage",3),productController.update_product)

//order routes for admin
admin_route.get("/orders",orderController.admin_orders)
admin_route.get("/detailorder",orderController.view_order)


admin_route.get('*',function(req,res){
    res.redirect('/admin')
  })

  module.exports=admin_route