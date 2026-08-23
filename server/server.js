const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const { connectDB, getDB, closeDB } = require('./db');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

function requireAdmin(req, res, next) {
  const role = req.cookies?.role;
  if (role === 'admin') {
    next();
  } else {
    res.redirect('/');
  }
}

// 1. נתיב הרשמה
app.post('/signup', async (req, res) => {
  try {
    const { email, username, phone, password } = req.body;

    if (!email || !username || !phone || !password) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const db = getDB();
    const customersCollection = db.collection('customers');

    const existingUser = await customersCollection.findOne({ username: username });
    if (existingUser) {
      return res.status(409).json({ error: 'שם משתמש זה כבר תפוס, נא לבחור שם אחר' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newCustomer = {
      email: email,
      username: username,
      phone: phone,
      password: hashedPassword,
      defaultAddress: '',
      createdAt: new Date(),
      cart: [],
      role: 'customer'
    };

    const result = await customersCollection.insertOne(newCustomer);

    res.cookie('username', newCustomer.username, { httpOnly: false, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('role', newCustomer.role, { httpOnly: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });

    res.status(201).json({
      message: 'המשתמש נרשם בהצלחה',
      userId: result.insertedId,
      email: newCustomer.email,
      username: newCustomer.username,
      role: newCustomer.role,
      cart: []
    });

  } catch (error) {
    console.error('Error in /signup:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// 2. נתיב התחברות
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'יש למלא את שדות החובה' });
    }

    const db = getDB();
    const customersCollection = db.collection('customers');

    const user = await customersCollection.findOne({ username: username });
    if (!user) {
      return res.status(401).json({ message: 'שם המשתמש או הסיסמה שגויים' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'שם משתמש או סיסמה שגויים' });
    }

    const userRole = user.role || 'customer';

    res.cookie('username', user.username, { httpOnly: false, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('role', userRole, { httpOnly: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });

    res.status(200).json({
      message: 'התחברות הצליחה',
      email: user.email,
      username: user.username,
      role: userRole,
      cart: user.cart || []
    });

  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// ----------------------------------------------------
// נתיבים לאזור אישי (Profile API)
// ----------------------------------------------------

app.get('/api/user/profile', async (req, res) => {
  try {
    const username = req.cookies?.username || req.query.username;
    if (!username) {
      return res.status(401).json({ error: 'משתמש לא מחובר' });
    }

    const db = getDB();
    const user = await db.collection('customers').findOne(
      { username: username },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    res.status(200).json({
      email: user.email || 'לא הוגדר',
      username: user.username,
      phone: user.phone || 'לא הוגדר',
      defaultAddress: user.defaultAddress || '',
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

app.put('/api/user/email', async (req, res) => {
  try {
    const username = req.cookies?.username || req.body.username;
    const { email } = req.body;

    if (!username) return res.status(401).json({ error: 'משתמש לא מחובר' });
    if (!email) return res.status(400).json({ error: 'חסרה כתובת אימייל' });

    const db = getDB();
    await db.collection('customers').updateOne(
      { username: username },
      { $set: { email: email } }
    );

    res.status(200).json({ message: 'האימייל עודכן בהצלחה', email });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

app.put('/api/user/phone', async (req, res) => {
  try {
    const username = req.cookies?.username || req.body.username;
    const { phone } = req.body;

    if (!username) return res.status(401).json({ error: 'משתמש לא מחובר' });
    if (!phone) return res.status(400).json({ error: 'חסר מספר טלפון' });

    const db = getDB();
    await db.collection('customers').updateOne(
      { username: username },
      { $set: { phone: phone } }
    );

    res.status(200).json({ message: 'מספר הטלפון עודכן בהצלחה', phone });
  } catch (error) {
    console.error('Error updating phone:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

app.put('/api/user/address', async (req, res) => {
  try {
    const username = req.cookies?.username || req.body.username;
    const { address } = req.body;

    if (!username) return res.status(401).json({ error: 'משתמש לא מחובר' });

    const db = getDB();
    await db.collection('customers').updateOne(
      { username: username },
      { $set: { defaultAddress: address || '' } }
    );

    res.status(200).json({ message: 'כתובת ברירת המחדל עודכנה בהצלחה', address });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// שליפת היסטוריית ההזמנות של המשתמש
app.get('/api/user/orders', async (req, res) => {
  try {
    const username = req.cookies?.username || req.query.username;
    if (!username) {
      return res.status(401).json({ error: 'משתמש לא מחובר' });
    }

    const db = getDB();
    const orders = await db.collection('orders')
      .find({ username: username })
      .sort({ createdAt: -1 })
      .toArray();

    const stock = await db.collection('stock').find({}).toArray();

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

        const name = item.name || productInfo.name || (rawId ? `מוצר #${rawId}` : 'מוצר');
        const price = Number(item.price !== undefined ? item.price : (productInfo.price || 0));

        return {
          ...item,
          id: rawId,
          name: name,
          price: price
        };
      });

      return {
        ...order,
        items: enrichedItems
      };
    });

    res.status(200).json(enrichedOrders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'שגיאה בשליפת היסטוריית ההזמנות' });
  }
});

// ----------------------------------------------------
// ניהול עגלה ומלאי
// ----------------------------------------------------

app.get('/cart', async (req, res) => {
  try {
    const username = req.cookies?.username || req.query.username;
    if (!username) return res.status(200).json([]);

    const db = getDB();
    const user = await db.collection('customers').findOne({ username: username });

    res.status(200).json(user?.cart || []);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'שגיאה בשליפת העגלה' });
  }
});

app.post('/cart/update', async (req, res) => {
  try {
    const { username, productId, quantity } = req.body;
    if (!username || productId === undefined) {
      return res.status(400).json({ error: 'חסרים נתונים נדרשים' });
    }

    const db = getDB();
    const customersCollection = db.collection('customers');

    if (quantity <= 0) {
      await customersCollection.updateOne({ username: username }, { $pull: { cart: { productId: productId } } });
    } else {
      const result = await customersCollection.updateOne(
        { username: username, "cart.productId": productId },
        { $set: { "cart.$.quantity": quantity } }
      );

      if (result.matchedCount === 0) {
        await customersCollection.updateOne(
          { username: username },
          { $push: { cart: { productId: productId, quantity: quantity } } }
        );
      }
    }

    res.status(200).json({ message: 'העגלה עודכנה בהצלחה' });
  } catch (error) {
    console.error('Error in /cart/update:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

app.post('/cart/clear', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'חסר שם משתמש' });

    const db = getDB();
    await db.collection('customers').updateOne({ username: username }, { $set: { cart: [] } });

    res.status(200).json({ message: 'העגלה נוקתה' });
  } catch (error) {
    console.error('Error in /cart/clear:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

app.get('/products', async (req, res) => {
  try {
    const db = getDB();
    const stockCollection = db.collection('stock');
    const products = await stockCollection.find({}).toArray();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'שגיאה בשליפת המלאי ממסד הנתונים' });
  }
});

// ביצוע הזמנה
app.post('/orders', async (req, res) => {
  try {
    const { username, guestName, guestPhone, items, deliveryType, address, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'העגלה ריקה' });
    }

    const db = getDB();
    const stockCollection = db.collection('stock');
    const ordersCollection = db.collection('orders');

    const outOfStockItems = [];

    for (const item of items) {
      const query = ObjectId.isValid(item.id)
        ? { _id: new ObjectId(item.id) }
        : { id: Number(item.id) || item.id };

      const product = await stockCollection.findOne(query);

      if (!product) {
        const itemName = item.name || `מוצר (${item.id})`;
        outOfStockItems.push(`• ${itemName} לא נמצא במערכת`);
      } else if (product.stock < item.quantity) {
        outOfStockItems.push(
          `• ${product.name}: מבוקש ${item.quantity} ק״ג/יח׳, במלאי נותרו ${product.stock} בלבד`
        );
      }
    }

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        error: 'חלק מהמוצרים אינם זמינים במלאי בכמות המבוקשת:\n\n' + outOfStockItems.join('\n')
      });
    }

    for (const item of items) {
      const query = ObjectId.isValid(item.id)
        ? { _id: new ObjectId(item.id) }
        : { id: Number(item.id) || item.id };

      await stockCollection.updateOne(
        query,
        { $inc: { stock: -item.quantity } }
      );
    }

    const orderId = "ORD-" + Date.now();
    const newOrder = {
      orderId: orderId,
      username: username,
      customerDetails: username === 'אורח' ? { name: guestName, phone: guestPhone } : { registeredUsername: username },
      items: items,
      deliveryType: deliveryType,
      address: deliveryType === 'delivery' ? address : 'איסוף עצמי',
      total: total,
      createdAt: new Date(),
      status: 'pending'
    };

    await ordersCollection.insertOne(newOrder);

    if (username && username !== 'אורח') {
      await db.collection('customers').updateOne(
        { username: username },
        { $set: { cart: [] } }
      );
    }

    res.status(201).json({ message: 'ההזמנה התקבלה בהצלחה', orderId: orderId });

  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ error: 'שגיאה בעיבוד ההזמנה בשרת' });
  }
});

// ==========================================
// API סטטיסטיקות למנהל (המעודכן והמתוקן)
// ==========================================
app.get('/api/admin/statistics', async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = {};
    const now = new Date();

    if (period === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (period === 'week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - 7));
      dateFilter = { createdAt: { $gte: startOfWeek } };
    } else if (period === 'month') {
      const startOfMonth = new Date(now.setDate(now.getDate() - 30));
      dateFilter = { createdAt: { $gte: startOfMonth } };
    }

    const db = getDB();
    const Order = db.collection('orders');
    const User = db.collection('customers');
    const Stock = db.collection('stock');

    const orders = await Order.find(dateFilter).toArray();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    const revenueByDay = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: { $sum: "$total" }
        }
      },
      { $sort: { "_id": 1 } }
    ]).toArray();

    // 1. קיבוץ המכירות לפי ID של המוצר מתוך עגלת ההזמנה
    const rawProductStats = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $ifNull: ["$items.id", "$items.productId"] },
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", { $ifNull: ["$items.price", 0] }] } }
        }
      },
      { $sort: { totalSold: -1 } }
    ]).toArray();

    // 2. שליפת המלאי ויצירת "מילון" שמתרגם ID לשם ומחיר
    const stockItems = await Stock.find({}).toArray();
    const stockMap = {};
    stockItems.forEach(prod => {
      if (prod._id) stockMap[String(prod._id)] = prod;
      if (prod.id !== undefined) stockMap[String(prod.id)] = prod;
    });

    // 3. החלפת ה-ID בשם האמיתי וחישוב ההכנסה ממוצר בעזרת מחירון המלאי
    const productStats = rawProductStats.map(stat => {
      const stringId = stat._id ? String(stat._id) : '';
      const productInfo = stockMap[stringId] || {};

      const currentPrice = productInfo.price ? Number(productInfo.price) : 0;
      const actualRevenue = stat.revenue > 0 ? stat.revenue : (stat.totalSold * currentPrice);

      return {
        _id: productInfo.name || `מוצר נמחק (ID: ${stringId})`,
        totalSold: stat.totalSold,
        revenue: actualRevenue
      };
    });

    res.json({
      totalRevenue,
      totalOrders,
      avgOrder,
      totalUsers,
      revenueByDay,
      productStats
    });

  } catch (error) {
    console.error("שגיאה בהפקת סטטיסטיקות:", error);
    res.status(500).json({ message: "שגיאת שרת פנימית" });
  }
});

// ==========================================
// ניהול משתמשים / לקוחות (API)
// ==========================================

app.get('/users', async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection('customers')
      .find({}, { projection: { password: 0 } })
      .toArray();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: 'שגיאה בשליפת הלקוחות' });
  }
});

app.post('/users', async (req, res) => {
  try {
    const db = getDB();
    const customersCollection = db.collection('customers');

    const hashedPassword = await bcrypt.hash('defaultPassword123', 10);
    const newUserData = {
      ...req.body,
      password: hashedPassword,
      createdAt: new Date(),
      cart: []
    };

    const result = await customersCollection.insertOne(newUserData);
    res.status(201).json({ _id: result.insertedId, ...newUserData });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: 'שגיאה ביצירת לקוח' });
  }
});

app.put('/users/:id', async (req, res) => {
  try {
    const db = getDB();
    const customersCollection = db.collection('customers');
    const productId = req.params.id;
    const updatedData = { ...req.body };

    delete updatedData._id;
    delete updatedData.password;

    const query = ObjectId.isValid(productId) ? { _id: new ObjectId(productId) } : { _id: productId };

    const result = await customersCollection.findOneAndUpdate(
      query,
      { $set: updatedData },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result) {
      return res.status(404).json({ error: 'לקוח לא נמצא' });
    }

    res.json(result);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: 'שגיאה בעדכון הלקוח' });
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const db = getDB();
    const customersCollection = db.collection('customers');
    const productId = req.params.id;

    const query = ObjectId.isValid(productId) ? { _id: new ObjectId(productId) } : { _id: productId };

    const result = await customersCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'לקוח לא נמצא למחיקה' });
    }

    res.json({ message: 'הלקוח נמחק בהצלחה' });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: 'שגיאה במחיקת הלקוח' });
  }
});

// נתיבי Static Files והרשאות Admin
app.get('/html/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../html/admin.html'));
});

app.post('/products', async (req, res) => {
  try {
    const db = getDB();
    const stockCollection = db.collection('stock');
    const newProduct = req.body;

    const result = await stockCollection.insertOne(newProduct);
    res.status(201).json({ message: 'המוצר נוסף בהצלחה', id: result.insertedId });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'שגיאה בהוספת מוצר למלאי' });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const db = getDB();
    const stockCollection = db.collection('stock');
    const productId = req.params.id;
    const updatedData = req.body;

    delete updatedData._id;

    const result = await stockCollection.updateOne(
      { _id: new ObjectId(productId) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'מוצר לא נמצא' });
    }

    res.status(200).json({ message: 'המוצר עודכן בהצלחה' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'שגיאה בעדכון המוצר' });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const db = getDB();
    const stockCollection = db.collection('stock');
    const productId = req.params.id;

    const result = await stockCollection.deleteOne({ _id: new ObjectId(productId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'מוצר לא נמצא למחיקה' });
    }

    res.status(200).json({ message: 'המוצר נמחק בהצלחה' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'שגיאה במחיקת המוצר' });
  }
});

app.use('/html', express.static(path.join(__dirname, '../html')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../JS')));
app.use('/image', express.static(path.join(__dirname, '../image')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/login.html'));
});

// הפעלת השרת
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}...`);
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await closeDB();
    process.exit(0);
  });
});