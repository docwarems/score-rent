const express = require('express');
import mongoose from 'mongoose';
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser');
const { requireAuth, checkUser } = require('./middleware/authMiddleware');
require("dotenv").config();

const app = express();

// middleware
app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());

// view engine
app.set('view engine', 'ejs');

// database connection
const dbURI = process.env.MONGODB_URL as string;
mongoose.set("strictQuery", false);
// mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }) // useCreateIndex not supported
mongoose.connect(dbURI!)
  .then((result: any) => app.listen(3000))
  .catch((err: any) => console.log(err));

// routes
app.get('*', checkUser);
app.get('/', (req: any, res: any) => res.render('home'));
app.get('/smoothies', requireAuth, (req: any, res: any) => res.render('smoothies'));
app.use(authRoutes);