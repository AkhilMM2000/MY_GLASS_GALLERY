
function verifyLogin(req, res, next) {
    if (req.session.userid) {
      
    } else {
     return  res.redirect('/sign');
    }
   return next();

  }

  function verifyLogout(req, res, next) {
    if (req.session.userid) {
     return res.redirect('/home'); // Redirect to the home page or dashboard
    } else {
     return  next();
    }
  }
  
  module.exports ={
    verifyLogin,
    verifyLogout
  }
  



  
  