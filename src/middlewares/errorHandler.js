// Middleware xử lý lỗi chung
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Lỗi validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: err.errors
    });
  }

  // Lỗi duplicate key (unique constraint)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại',
      error: err.detail
    });
  }

  // Lỗi foreign key constraint
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu tham chiếu không hợp lệ',
      error: err.detail
    });
  }

  // Lỗi mặc định
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Có lỗi xảy ra trên server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware xử lý route không tồn tại
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} không tồn tại`
  });
};

module.exports = {
  errorHandler,
  notFound
};
