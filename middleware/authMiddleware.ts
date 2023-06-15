const jwt = require("jsonwebtoken");
import { User } from "../models/User";
require("dotenv").config();

const requireAuth = (req: any, res: any, next: any) => {
  const token = req.cookies.jwt;

  // check json web token exists & is verified
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err: any, decodedToken: any) => {
      if (err) {
        console.log(err.message);
        res.redirect("/login");
      } else {
        console.log(decodedToken);
        next();
      }
    });
  } else {
    res.redirect("/login");
  }
};

// check current user
const checkUser = (req: any, res: any, next: Function) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(
      token,
      process.env.JWT_SECRET,
      async (err: any, decodedToken: any) => {
        if (err) {
          res.locals.user = null;
          next();
        } else {
          let user = await User.findById(decodedToken.id);
          res.locals.user = user;
          next();
        }
      }
    );
  } else {
    res.locals.user = null;
    next();
  }
};

const requireAdmin = (req: any, res: any, next: Function) => {
  const user = res.locals.user;
  if (user.isAdmin) {
    next();
  } else {
    res.redirect("/");
  }
};

module.exports = { requireAuth, checkUser, requireAdmin };
