const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const { connectDB, getDB, closeDB } = require('./db');

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
    const { firstName, username, phone, password } = req.body;

    if (!firstName || !username || !phone || !password) {
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
      firstName: firstName,
      username: username,
      phone: phone,
      password: hashedPassword,
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
      firstName: newCustomer.firstName,
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
      firstName: user.firstName,
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
// נתיבים חדשים לאזור אישי (Profile API)
// ----------------------------------------------------

// שליפת פרטי משתמש
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
      firstName: user.firstName,
      username: user.username,
      phone: user.phone || 'לא הוגדר',
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// עדכון מספר טלפון של המשתמש
app.put('/api/user/phone', async (req, res) => {
  try {
    const username = req.cookies?.username || req.body.username;
    const { phone } = req.body;

    if (!username) {
      return res.status(401).json({ error: 'משתמש לא מחובר' });
    }
    if (!phone) {
      return res.status(400).json({ error: 'חסר מספר טלפון' });
    }

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

// שליפת היסטוריית ההזמנות של המשתמש
// שליפת היסטוריית ההזמנות של המשתמש עם הצלבה מול המלאי (stock)
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

    // מפת עזר לשליפה מהירה של מוצר לפי ID
    const stockMap = {};
    stock.forEach(prod => {
      stockMap[Number(prod.id)] = prod;
    });

    // העשרת הפריטים בהזמנה בשם ובמחיר מתוך ה-stock
    const enrichedOrders = orders.map(order => {
      const enrichedItems = (order.items || []).map(item => {
        const prodId = Number(item.id || item.productId);
        const productInfo = stockMap[prodId] || {};

        const name = item.name || productInfo.name || `מוצר #${prodId}`;
        const price = Number(item.price !== undefined ? item.price : (productInfo.price || 0));

        return {
          ...item,
          id: prodId,
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

// 3. עדכון עגלה
app.post('/cart/update', async (req, res) => {
  try {
    const { username, productId, quantity } = req.body;
    if (!username || productId === undefined) {
      return res.status(400).json({ error: 'חסרים נתונים נדרשים' });
    }

    const db = getDB();
    const customersCollection = db.collection('customers');
    const numProductId = Number(productId);

    if (quantity <= 0) {
      await customersCollection.updateOne({ username: username }, { $pull: { cart: { productId: numProductId } } });
    } else {
      const result = await customersCollection.updateOne(
        { username: username, "cart.productId": numProductId },
        { $set: { "cart.$.quantity": quantity } }
      );

      if (result.matchedCount === 0) {
        await customersCollection.updateOne(
          { username: username },
          { $push: { cart: { productId: numProductId, quantity: quantity } } }
        );
      }
    }

    res.status(200).json({ message: 'העגלה עודכנה בהצלחה' });
  } catch (error) {
    console.error('Error in /cart/update:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// 4. ניקוי עגלה
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

// 5. משיכת מוצרים
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

// 6. ביצוע הזמנה: בדיקת מלאי מרוכזת ושמירה ב-MongoDB
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

    // א. בדיקת מלאי לכל המוצרים
    for (const item of items) {
      const numProductId = Number(item.id);
      const product = await stockCollection.findOne({ id: numProductId });

      if (!product) {
        outOfStockItems.push(`• מוצר מזהה ${item.id} לא נמצא במערכת`);
      } else if (product.stock < item.quantity) {
        outOfStockItems.push(
          `• ${product.name}: מבוקש ${item.quantity} ק״ג, במלאי נותרו ${product.stock} ק״ג בלבד`
        );
      }
    }

    // ב. אם יש מוצרים שחסרים - החזרת הודעה מרוכזת
    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        error: 'חלק מהמוצרים אינם זמינים במלאי בכמות המבוקשת:\n\n' + outOfStockItems.join('\n')
      });
    }

    // ג. הפחתת המלאי לכל המוצרים
    for (const item of items) {
      const numProductId = Number(item.id);
      await stockCollection.updateOne(
        { id: numProductId },
        { $inc: { stock: -item.quantity } }
      );
    }

    // ד. שמירת ההזמנה
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

    // ה. ניקוי עגלה בשרת במידה ומדובר במשתמש רשום
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

app.get('/html/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../html/admin.html'));
});

app.use('/html', express.static(path.join(__dirname, '../html')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../JS')));
app.use('/image', express.static(path.join(__dirname, '../image')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/login.html'));
});

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