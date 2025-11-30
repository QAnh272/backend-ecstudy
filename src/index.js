const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const pool = require("./config/database");
const fs = require("fs");
const path = require("path");
const { seedProducts } = require("./database/seed-products");

const authRouter = require("./routers/authRouter");
const userRouter = require("./routers/userRouter");
const productRouter = require("./routers/productRouter");
const cartRouter = require("./routers/cartRouter");
const walletRouter = require("./routers/walletRouter");
const orderRouter = require("./routers/orderRouter");
const ratingRouter = require("./routers/ratingRouter");
const commentRouter = require("./routers/commentRouter");

const { notFound, errorHandler } = require("./middlewares/errorHandler");

const app = express();
const sqlPath = path.join(__dirname, "database", "init.sql");

async function initDB() {
  // Chỉ chạy init DB khi có biến môi trường INIT_DB=true
  // Để tránh mất dữ liệu mỗi lần restart server
  if (process.env.INIT_DB) {
    try {
      console.log('🔄 Initializing database...');
      const sql = fs.readFileSync(sqlPath, "utf8");
      await pool.query(sql);
      await seedProducts();
      console.log('✅ Database initialized successfully');
    } catch (err) {
      console.error('❌ Error initializing database:', err);
    }
  } else {
    console.log('ℹ️ Skipping database initialization (set INIT_DB=true to initialize)');
  }
}

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));
app.use("/products/images", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    message: "Student Shop API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      products: "/api/products",
      cart: "/api/cart",
      wallet: "/api/wallet",
      orders: "/api/orders",
      ratings: "/api/ratings",
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/orders", orderRouter);
app.use("/api/ratings", ratingRouter);
app.use("/api/comments", commentRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
