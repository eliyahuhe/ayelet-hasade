const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { connectDB, getDB, closeDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. נתיב הרשמה (SignUp)
app.post('/signup', async (req, res) => {
  try {
    const { username, phone, password } = req.body;

    if (!username || !phone || !password) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const db = getDB();
    const customersCollection = db.collection('customers');

    const existingUser = await customersCollection.findOne({ phone: phone });
    if (existingUser) {
      return res.status(409).json({ error: 'משתמש עם מספר טלפון זה כבר קיים' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newCustomer = {
      name: username,
      phone: phone,
      password: hashedPassword,
      createdAt: new Date(),
      cart: [] // יצירת מערך עגלה ריק מלכתחילה
    };

    const result = await customersCollection.insertOne(newCustomer);

    res.cookie('username', newCustomer.name, {
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'המשתמש נרשם בהצלחה',
      userId: result.insertedId,
      username: newCustomer.name,
      cart: []
    });

  } catch (error) {
    console.error('Error in /signup:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// 2. נתיב התחברות (Login) - מחזיר גם את העגלה השמורה ב-DB
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'יש למלא את שדות החובה' });
    }

    const db = getDB();
    const customersCollection = db.collection('customers');

    const user = await customersCollection.findOne({ name: username });

    if (!user) {
      return res.status(401).json({ message: 'שם המשתמש או הסיסמה שגויים' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'שם משתמש או סיסמה שגויים' });
    }

    res.cookie('username', user.name, {
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    // מחזירים את העגלה מה-DB
    res.status(200).json({
      message: 'התחברות הצליחה',
      username: user.name,
      cart: user.cart || []
    });

  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// 3. נתיב חדש: עדכון/סנכרון עגלה ב-MongoDB
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
      // אם הכמות 0 - הסרה מתוך המערך
      await customersCollection.updateOne(
        { name: username },
        { $pull: { cart: { productId: numProductId } } }
      );
    } else {
      // ניסיון לעדכן מוצר קיים
      const result = await customersCollection.updateOne(
        { name: username, "cart.productId": numProductId },
        { $set: { "cart.$.quantity": quantity } }
      );

      // אם המוצר לא היה בעגלה - הוספתו כחדש ($push דואג ליצור את cart אם אינו קיים)
      if (result.matchedCount === 0) {
        await customersCollection.updateOne(
          { name: username },
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
      { name: username },
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