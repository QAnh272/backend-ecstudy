const OrderService = require('../services/OrderService');

class OrderController {
  static async createOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const { payment_method, shipping_address, phone_number } = req.body;

      if (!shipping_address || !phone_number) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp địa chỉ giao hàng và số điện thoại'
        });
      }

      const order = await OrderService.createOrder(userId, { 
        payment_method, 
        shipping_address, 
        phone_number 
      });

      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng thành công',
        data: {
          ...order,
          total_amount: parseFloat(order.total_amount)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const order = await OrderService.getOrderById(id, userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      res.json({
        success: true,
        data: {
          ...order,
          total_amount: parseFloat(order.total_amount),
          items: order.items.map(item => ({
            ...item,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal)
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, limit, offset } = req.query;

      const options = {
        status,
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0
      };

      const orders = await OrderService.getUserOrders(userId, options);

      res.json({
        success: true,
        count: orders.length,
        data: orders.map(order => ({
          ...order,
          total_amount: parseFloat(order.total_amount),
          items: order.items ? order.items.map(item => ({
            ...item,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal)
          })) : []
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  static async payWithWallet(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const order = await OrderService.payWithWallet(id, userId);

      res.json({
        success: true,
        message: 'Thanh toán thành công',
        data: {
          ...order,
          total_amount: parseFloat(order.total_amount)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const order = await OrderService.cancelOrder(id, userId);

      res.json({
        success: true,
        message: 'Hủy đơn hàng thành công',
        data: {
          ...order,
          total_amount: parseFloat(order.total_amount)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllOrders(req, res, next) {
    try {
      const { status, limit, offset } = req.query;

      const options = {
        status,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      const orders = await OrderService.getAllOrders(options);

      res.json({
        success: true,
        count: orders.length,
        data: orders.map(order => ({
          ...order,
          total_amount: parseFloat(order.total_amount),
          items: order.items ? order.items.map(item => ({
            ...item,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal)
          })) : []
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp status'
        });
      }

      const order = await OrderService.updateOrderStatus(id, status);

      res.json({
        success: true,
        message: 'Cập nhật trạng thái đơn hàng thành công',
        data: {
          ...order,
          total_amount: parseFloat(order.total_amount)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;
