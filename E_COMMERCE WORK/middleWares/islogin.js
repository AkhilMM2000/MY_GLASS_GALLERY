
function verifyLogin(req, res, next) {
    if (req.session.userid) {
      next();
    } else {
      res.redirect('/sign');
    }
  }
  function verifyLogout(req, res, next) {
    if (req.session.userid) {
      res.redirect('/home'); // Redirect to the home page or dashboard
    } else {
      next();
    }
  }
  
  module.exports ={
    verifyLogin,
    verifyLogout
  }
  

  