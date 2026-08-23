const { getDB } = require('../db');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

async function getProfile(req, res) {
    try {
        const username = req.cookies?.username || req.query.username;
        if (!username) return res.status(401).json({ error: 'משתמש לא מחובר' });
        const user = await getDB().collection('customers').findOne({ username: username }, { projection: { password: 0 } });
        if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
        res.status(200).json({ email: user.email || 'לא הוגדר', username: user.username, phone: user.phone || 'לא הוגדר', defaultAddress: user.defaultAddress || '', createdAt: user.createdAt });
    } catch (error) { res.status(500).json({ error: 'שגיאת שרת פנימית' }); }
}

async function updateEmail(req, res) {
    try {
        const username = req.cookies?.username || req.body.username;
        const { email } = req.body;
        if (!username) return res.status(401).json({ error: 'משתמש לא מחובר' });
        if (!email) return res.status(400).json({ error: 'חסרה כתובת אימייל' });
        await getDB().collection('customers').updateOne({ username: username }, { $set: { email: email } });
        res.status(200).json({ message: 'האימייל עודכן בהצלחה', email });
    } catch (error) { res.status(500).json({ error: 'שגיאת שרת פנימית' }); }
}

async function updatePhone(req, res) {
    try {
        const username = req.cookies?.username || req.body.username;
        const { phone } = req.body;
        if (!username) return res.status(401).json({ error: 'משתמש לא מחובר' });
        if (!phone) return res.status(400).json({ error: 'חסר מספר טלפון' });
        await getDB().collection('customers').updateOne({ username: username }, { $set: { phone: phone } });
        res.status(200).json({ message: 'מספר הטלפון עודכן בהצלחה', phone });
    } catch (error) { res.status(500).json({ error: 'שגיאת שרת פנימית' }); }
}

async function updateAddress(req, res) {
    try {
        const username = req.cookies?.username || req.body.username;
        const { address } = req.body;
        if (!username) return res.status(401).json({ error: 'משתמש לא מחובר' });
        await getDB().collection('customers').updateOne({ username: username }, { $set: { defaultAddress: address || '' } });
        res.status(200).json({ message: 'כתובת ברירת המחדל עודכנה בהצלחה', address });
    } catch (error) { res.status(500).json({ error: 'שגיאת שרת פנימית' }); }
}

async function getCart(req, res) {
    try {
        const username = req.cookies?.username || req.query.username;
        if (!username) return res.status(200).json([]);
        const user = await getDB().collection('customers').findOne({ username: username });
        res.status(200).json(user?.cart || []);
    } catch (error) { res.status(500).json({ error: 'שגיאה בשליפת העגלה' }); }
}

async function updateCart(req, res) {
    try {
        const { username, productId, quantity } = req.body;
        if (!username || productId === undefined) return res.status(400).json({ error: 'חסרים נתונים נדרשים' });
        const customersCollection = getDB().collection('customers');
        if (quantity <= 0) {
            await customersCollection.updateOne({ username: username }, { $pull: { cart: { productId: productId } } });
        } else {
            const result = await customersCollection.updateOne({ username: username, "cart.productId": productId }, { $set: { "cart.$.quantity": quantity } });
            if (result.matchedCount === 0) await customersCollection.updateOne({ username: username }, { $push: { cart: { productId: productId, quantity: quantity } } });
        }
        res.status(200).json({ message: 'העגלה עודכנה בהצלחה' });
    } catch (error) { res.status(500).json({ error: 'שגיאת שרת פנימית' }); }
}

async function clearCart(req, res) {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: 'חסר שם משתמש' });
        await getDB().collection('customers').updateOne({ username: username }, { $set: { cart: [] } });
        res.status(200).json({ message: 'העגלה נוקתה' });
    } catch (error) { res.status(500).json({ error: 'שגיאת שרת פנימית' }); }
}

async function getUsers(req, res) {
    try {
        const users = await getDB().collection('customers').find({}, { projection: { password: 0 } }).toArray();
        res.json(users);
    } catch (error) { res.status(500).json({ error: 'שגיאה בשליפת הלקוחות' }); }
}

async function createUser(req, res) {
    try {
        const hashedPassword = await bcrypt.hash('defaultPassword123', 10);
        const newUserData = { ...req.body, password: hashedPassword, createdAt: new Date(), cart: [] };
        const result = await getDB().collection('customers').insertOne(newUserData);
        res.status(201).json({ _id: result.insertedId, ...newUserData });
    } catch (error) { res.status(500).json({ error: 'שגיאה ביצירת לקוח' }); }
}

async function updateUser(req, res) {
    try {
        const productId = req.params.id;
        const updatedData = { ...req.body };
        delete updatedData._id;
        delete updatedData.password;
        const query = ObjectId.isValid(productId) ? { _id: new ObjectId(productId) } : { _id: productId };
        const result = await getDB().collection('customers').findOneAndUpdate(query, { $set: updatedData }, { returnDocument: 'after', projection: { password: 0 } });
        if (!result) return res.status(404).json({ error: 'לקוח לא נמצא' });
        res.json(result);
    } catch (error) { res.status(500).json({ error: 'שגיאה בעדכון הלקוח' }); }
}

async function deleteUser(req, res) {
    try {
        const productId = req.params.id;
        const query = ObjectId.isValid(productId) ? { _id: new ObjectId(productId) } : { _id: productId };
        const result = await getDB().collection('customers').deleteOne(query);
        if (result.deletedCount === 0) return res.status(404).json({ error: 'לקוח לא נמצא למחיקה' });
        res.json({ message: 'הלקוח נמחק בהצלחה' });
    } catch (error) { res.status(500).json({ error: 'שגיאה במחיקת הלקוח' }); }
}

module.exports = { getProfile, updateEmail, updatePhone, updateAddress, getCart, updateCart, clearCart, getUsers, createUser, updateUser, deleteUser };