const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const { connectDB, getDB, closeDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Middleware לבדיקת הרשאת מנהל
function requireAdmin(req, res, next) {
  const role = req.cookies?.role;
  if (role === 'admin') {
    next();
  } else {
    res.redirect('/');
  }
}

// 1. נתיב הרשמה (SignUp)
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

    res.cookie('username', newCustomer.username, {
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie('role', newCustomer.role, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

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

// 2. נתיב התחברות (Login)
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

    res.cookie('username', user.username, {
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie('role', userRole, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    // תיקון קריטי: החזרת firstName בתגובה!
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

// 3. עדכון/סנכרון עגלה ב-MongoDB
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
      await customersCollection.updateOne(
        { username: username },
        { $pull: { cart: { productId: numProductId } } }
      );
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

// 4. ניקוי עגלה לאחר הזמנה
app.post('/cart/clear', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'חסר שם משתמש' });

    const db = getDB();
    await db.collection('customers').updateOne(
      { username: username },
      { $set: { cart: [] } }
    );

    res.status(200).json({ message: 'העגלה נוקתה' });
  } catch (error) {
    console.error('Error in /cart/clear:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// 5. שליפת מלאי מוצרים
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

// הגנה על קובץ ה-HTML של הנהלה
app.get('/html/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../html/admin.html'));
});

// נתיבי Static Files
app.use('/html', express.static(path.join(__dirname, '../html')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../JS')));
app.use('/image', express.static(path.join(__dirname, '../image')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/login.html'));
});

// התחברות ל-DB והרצת השרת
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