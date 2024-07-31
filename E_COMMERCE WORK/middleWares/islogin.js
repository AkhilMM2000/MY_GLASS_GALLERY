
function verifyLogin(req, res, next) {
    if (req.session.userid) {
      next();
    } else {
      res.redirect('/sign');
    }
  }
  
  module.exports = verifyLogin;
  