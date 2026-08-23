const bcrypt = require('bcrypt');
const { getDB } = require('../db');

async function signup(req, res) {
  try {
    const { email, username, phone, password } = req.body;
    if (!email || !username || !phone || !password) return res.status(400).json({ error: 'חסרים שדות חובה' });
    const db = getDB();
    const existingUser = await db.collection('customers').findOne({ username: username });
    if (existingUser) return res.status(409).json({ error: 'שם משתמש תפוס' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newCustomer = { email, username, phone, password: hashedPassword, defaultAddress: '', createdAt: new Date(), cart: [], role: 'customer' };
    const result = await db.collection('customers').insertOne(newCustomer);
    res.cookie('username', username, { httpOnly: false, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('role', newCustomer.role, { httpOnly: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    res.status(201).json({ message: 'נרשם בהצלחה', userId: result.insertedId, email, username, role: newCustomer.role, cart: [] });
  } catch (error) { res.status(500).json({ error: 'שגיאת שרת פנימית' }); }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'יש למלא את שדות החובה' });
    const db = getDB();
    const user = await db.collection('customers').findOne({ username: username });
    if (!user) return res.status(401).json({ message: 'שם המשתמש או הסיסמה שגויים' });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'שם משתמש או סיסמה שגויים' });
    const userRole = user.role || 'customer';
    res.cookie('username', user.username, { httpOnly: false, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('role', userRole, { httpOnly: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    res.status(200).json({ message: 'התחברות הצליחה', email: user.email, username: user.username, role: userRole, cart: user.cart || [] });
  } catch (error) { res.status(500).json({ error: 'שגיאת שרת פנימית' }); }
}

module.exports = { signup, login };