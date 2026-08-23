const { getDB } = require('../db');

async function getAdminStats(req, res) {
  try {
    const { period } = req.query;
    let dateFilter = {};
    const now = new Date();

    if (period === 'today') dateFilter = { createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } };
    else if (period === 'week') dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
    else if (period === 'month') dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 30)) } };

    const Order = getDB().collection('orders');
    const User = getDB().collection('customers');
    const Stock = getDB().collection('stock');

    const orders = await Order.find(dateFilter).toArray();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    const revenueByDay = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, totalAmount: { $sum: "$total" } } },
      { $sort: { "_id": 1 } }
    ]).toArray();

    const rawProductStats = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      { $group: { _id: { $ifNull: ["$items.id", "$items.productId"] }, totalSold: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", { $ifNull: ["$items.price", 0] }] } } } },
      { $sort: { totalSold: -1 } }
    ]).toArray();

    const stockItems = await Stock.find({}).toArray();
    const stockMap = {};
    stockItems.forEach(prod => {
      if (prod._id) stockMap[String(prod._id)] = prod;
      if (prod.id !== undefined) stockMap[String(prod.id)] = prod;
    });

    const productStats = rawProductStats.map(stat => {
      const stringId = stat._id ? String(stat._id) : '';
      const productInfo = stockMap[stringId] || {};
      const currentPrice = productInfo.price ? Number(productInfo.price) : 0;
      return {
        _id: productInfo.name || `מוצר נמחק (ID: ${stringId})`,
        totalSold: stat.totalSold,
        revenue: stat.revenue > 0 ? stat.revenue : (stat.totalSold * currentPrice)
      };
    });

    res.json({ totalRevenue, totalOrders, avgOrder, totalUsers, revenueByDay, productStats });
  } catch (error) { res.status(500).json({ message: "שגיאת שרת פנימית" }); }
}

module.exports = { getAdminStats };