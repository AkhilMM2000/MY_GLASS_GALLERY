
const User = require('../model/userModel')
async function verifyLogin(req, res, next) {
  try {
    const user = await User.findById(req.session.userid);
    if (req.session.userid && user.is_blocked == 0) {
    } else {
      return res.redirect('/sign');
    }

    return next();
  } catch (error) {

    console.log(error);

  }

}

async function verifyLogout(req, res, next) {

  try {
    if (req.session.userid) {
      const user = await User.findById(req.session.userid);
      if (user.is_blocked == 0) {
        return res.redirect('/home');
      } else {
        return next();
      }
    } else {
      return next();
    }
  } catch (error) {
    console.log(error);

  }


}

// function verifyLogout(req, res, next) {
//   if (req.session.userid) {
//    return res.redirect('/home'); // Redirect to the home page or dashboard
//   } else {
//    return  next();
//   }
// }

module.exports = {
  verifyLogin,
  verifyLogout
}





