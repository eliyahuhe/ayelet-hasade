const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectDB, closeDB } = require('./db');
const { requireAdmin } = require('./middlewares/auth.middleware');

// ייבוא כל הראוטרים שלנו
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productsRoutes = require('./routes/products.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const ordersRoutes = require('./routes/orders.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// חיבור הראוטרים למערכת
app.use('/', authRoutes);
app.use('/', usersRoutes);
app.use('/products', productsRoutes);
app.use('/api/admin/statistics', statisticsRoutes);
app.use('/', ordersRoutes);

// נתיבי קבצים סטטיים
app.use('/html', express.static(path.join(__dirname, '../html')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../JS')));
app.use('/image', express.static(path.join(__dirname, '../image')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/login.html'));
});

// הגנת עמוד מנהל באמצעות ה-middleware שהוצאנו
app.get('/html/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../html/admin.html'));
});

// הפעלת השרת
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}...`);
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await closeDB();
    process.exit(0);
  });
});