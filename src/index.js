const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const pool = require('./config/database');

const authRouter = require('./routers/authRouter');
const userRouter = require('./routers/userRouter');
const productRouter = require('./routers/productRouter');
const cartRouter = require('./routers/cartRouter');
const walletRouter = require('./routers/walletRouter');
const orderRouter = require('./routers/orderRouter');
const ratingRouter = require('./routers/ratingRouter');
const commentRouter = require('./routers/commentRouter');

const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors({
  origin: '*', // Frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Student Shop API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      cart: '/api/cart',
      wallet: '/api/wallet',
      orders: '/api/orders',
      ratings: '/api/ratings'
    }
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/orders', orderRouter);
app.use('/api/ratings', ratingRouter);
app.use('/api/comments', commentRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT,() => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}`);
});

module.exports = app;
