// import User from "../models/User";
import { errorMonitor } from "nodemailer/lib/xoauth2";
import { User } from "../models/User";
import jwt from 'jsonwebtoken';
require("dotenv").config();

// handle errors
const handleErrors = (err: any) => {
  console.log(err.message, err.code);
  let errors = { email: '', password: '', passwordRepeat: '', lastName: "" };

  // incorrect email
  if (err.message === 'incorrect email') {
    errors.email = 'Die E-Mail Adresse ist unbekannt';
  }

  // incorrect password
  if (err.message === 'incorrect password') {
    errors.password = 'Das Passwort ist nicht korrekt';
  }

  if (err.message === "repeated password wrong") {
    errors.password = 'Passwort und Passwort Wiederholung stimmen nicht überein';
  }

  // duplicate email error
  if (err.code === 11000) {
    errors.email = 'Diese E-Mail Adresse ist bereits in Verwendung';
    return errors;
  }

  // validation errors
  if (err.message.includes('User validation failed')) {
    // console.log(err);
    Object.values(err.errors as { properties: any }).forEach(({ properties }) => {
      // console.log(val);
      // console.log(properties);
      type ErrorKey = keyof typeof errors;
      errors[properties.path as ErrorKey] = properties.message;
    });
  }

  return errors;
}

// create json web token
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: maxAge
  });
};

// controller actions
module.exports.signup_get = (req: any, res: any) => {
  res.render('signup');
}

module.exports.login_get = (req: any, res: any) => {
  res.render('login');
}

module.exports.signup_post = async (req: any, res: any) => {
  const { email, password, passwordRepeat, firstName, lastName, verificationToken } = req.body;


  try {
    if (password !== passwordRepeat) {
      throw(new Error("repeated password wrong"));
    }
  
    const verificationToken = Math.random().toString(36).substr(2);
    const user = await User.create({ email, password, firstName, lastName, verificationToken });
    const token = createToken(user._id as unknown as string);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ user: user._id });
  }
  catch(err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
 
}

module.exports.login_post = async (req: any, res: any) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json({ user: user._id });
  } 
  catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }

}

module.exports.logout_get = (req: any, res: any) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}