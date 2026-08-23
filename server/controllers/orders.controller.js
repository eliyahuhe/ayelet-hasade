const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

async function createOrder(req, res) {
  try {
    const { username, guestName, guestPhone, items, deliveryType, address, total } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'העגלה ריקה' });
    const stockCollection = getDB().collection('stock');
    const outOfStockItems = [];
    
    for (const item of items) {
      const query = ObjectId.isValid(item.id) ? { _id: new ObjectId(item.id) } : { id: Number(item.id) || item.id };
      const product = await stockCollection.findOne(query);
      if (!product) outOfStockItems.push(`• מוצר (${item.id}) לא נמצא`);
      else if (product.stock < item.quantity) outOfStockItems.push(`• ${product.name}: מבוקש ${item.quantity}, במלאי נותרו ${product.stock}`);
    }
    
    if (outOfStockItems.length > 0) return res.status(400).json({ error: 'חלק מהמוצרים אינם זמינים:\n\n' + outOfStockItems.join('\n') });
    
    for (const item of items) {
      const query = ObjectId.isValid(item.id) ? { _id: new ObjectId(item.id) } : { id: Number(item.id) || item.id };
      await stockCollection.updateOne(query, { $inc: { stock: -item.quantity } });
    }
    
    const orderId = "ORD-" + Date.now();
    const newOrder = { orderId, username, customerDetails: username === 'אורח' ? { name: guestName, phone: guestPhone } : { registeredUsername: username }, items, deliveryType, address: deliveryType === 'delivery' ? address : 'איסוף עצמי', total, createdAt: new Date(), status: 'pending' };
    
    await getDB().collection('orders').insertOne(newOrder);
    if (username && username !== 'אורח') await getDB().collection('customers').updateOne({ username }, { $set: { cart: [] } });
    res.status(201).json({ message: 'ההזמנה התקבלה בהצלחה', orderId });
  } catch (error) { res.status(500).json({ error: 'שגיאה בעיבוד ההזמנה' }); }
}

async function getAdminOrders(req, res) {
  try {
    const orders = await getDB().collection('orders').find({}).sort({ createdAt: -1 }).toArray();
    const stockItems = await getDB().collection('stock').find({}).toArray();
    const stockMap = {};
    stockItems.forEach(prod => {
      if (prod._id) stockMap[String(prod._id)] = prod;
      if (prod.id !== undefined) stockMap[String(prod.id)] = prod;
    });
    const enrichedOrders = orders.map(order => {
      const enrichedItems = (order.items || []).map(item => {
        const rawId = item.id !== undefined ? item.id : item.productId;
        const stringId = rawId ? String(rawId) : '';
        return { ...item, name: (stockMap[stringId] || {}).name || `מוצר (${stringId})` };
      });
      return { ...order, items: enrichedItems };
    });
    res.json(enrichedOrders);
  } catch (error) { res.status(500).json({ error: 'שגיאה בשליפת ההזמנות' }); }
}

async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    if (!['pending', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'סטטוס לא תקין' });
    const query = ObjectId.isValid(orderId) ? { _id: new ObjectId(orderId) } : { orderId: orderId };
    const result = await getDB().collection('orders').updateOne(query, { $set: { status: status } });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'הזמנה לא נמצאה' });
    res.json({ message: 'סטטוס עודכן', status });
  } catch (error) { res.status(500).json({ error: 'שגיאה בעדכון הסטטוס' }); }
}

async function getUserOrders(req, res) {
  try {
    const username = req.cookies?.username || req.query.username;
    if (!username) return res.status(401).json({ error: 'משתמש לא מחובר' });
    const orders = await getDB().collection('orders').find({ username }).sort({ createdAt: -1 }).toArray();
    const stock = await getDB().collection('stock').find({}).toArray();
    const stockMap = {};
    stock.forEach(prod => {
      if (prod._id) stockMap[String(prod._id)] = prod;
      if (prod.id !== undefined) stockMap[String(prod.id)] = prod;
    });
    const enrichedOrders = orders.map(order => {
      const enrichedItems = (order.items || []).map(item => {
        const rawId = item.id !== undefined ? item.id : item.productId;
        const stringId = rawId ? String(rawId) : '';
        const productInfo = stockMap[stringId] || {};
        return { ...item, id: rawId, name: item.name || productInfo.name || 'מוצר', price: Number(item.price !== undefined ? item.price : (productInfo.price || 0)) };
      });
      return { ...order, items: enrichedItems };
    });
    res.status(200).json(enrichedOrders);
  } catch (error) { res.status(500).json({ error: 'שגיאה בשליפת היסטוריה' }); }
}

module.exports = { createOrder, getAdminOrders, updateOrderStatus, getUserOrders };