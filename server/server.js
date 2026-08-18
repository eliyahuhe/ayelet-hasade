const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { connectDB, getDB, closeDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// נתיב הרשמה
app.post('/signup', async (req, res) => {
  try {
    const { username, phone, password } = req.body;

    if (!username || !phone || !password) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    // שליפת החיבור מתוך הבריכה הקיימת
    const db = getDB();
    const customersCollection = db.collection('customers');

    // 1. בדיקה אם מספר הטלפון כבר קיים
    const existingUser = await customersCollection.findOne({ phone: phone });
    if (existingUser) {
      return res.status(409).json({ error: 'משתמש עם מספר טלפון זה כבר קיים' });
    }

    // 2. הצפנת הסיסמה
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newCustomer = {
      name: username,
      phone: phone,
      password: hashedPassword,
      createdAt: new Date()
    };

    // 3. שמירה במסד הנתונים
    const result = await customersCollection.insertOne(newCustomer);

    // לשמור עוגיה של שם המשתמש ותפקיד ניהול או לא 
    res.cookie('user', JSON.stringify(newCustomer), {
      httpOnly: false, // שים ל-true אם אתה משתמש ב-JWT/Sessions מאובטחים מהשרת
      maxAge: 24 * 60 * 60 * 1000 // תוקף ל-24 שעות
    });

    res.status(201).json({
      message: 'המשתמש נרשם בהצלחה',
      userId: result.insertedId
    });




  } catch (error) {
    console.error('Error in /signup:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'יש למלא את שדות החובה' })
    }

    const db = getdb();
    const customersCollection = db.collection('customers');

    const user = await customersCollection.findOne({ name: username });

    if (!user) {
      return res.status(401).json({ message: 'שם המשתמש או הסיסמה שגויים' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!ispasswordValid) {
      return res.status(401).json({ message: 'שם משתמש או סיסמה שגויים' })
    }

    res.cookie('user', json.stringify(user), {
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'התחברות הצליחה',
      username: user.name
    });


  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });

  }
});















app.use('/html', express.static(path.join(__dirname, '../html')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../JS')));
app.use('/image', express.static(path.join(__dirname, '../image')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/login.html'));
});
// התחברות לדאטה בייס ורק לאחר מכן הפעלת השרת
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}...`);
  });

  // סגירה מסודרת בעת כיבוי השרת (Ctrl + C)
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await closeDB();
    process.exit(0);
  });
});