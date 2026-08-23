const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

async function getProducts(req, res) {
  try {
    const products = await getDB().collection('stock').find({}).toArray();
    res.status(200).json(products);
  } catch (error) { res.status(500).json({ error: 'שגיאה בשליפת המלאי' }); }
}

async function addProduct(req, res) {
  try {
    const result = await getDB().collection('stock').insertOne(req.body);
    res.status(201).json({ message: 'המוצר נוסף בהצלחה', id: result.insertedId });
  } catch (error) { res.status(500).json({ error: 'שגיאה בהוספת מוצר למלאי' }); }
}

async function updateProduct(req, res) {
  try {
    const updatedData = req.body;
    delete updatedData._id;
    const result = await getDB().collection('stock').updateOne({ _id: new ObjectId(req.params.id) }, { $set: updatedData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'מוצר לא נמצא' });
    res.status(200).json({ message: 'המוצר עודכן בהצלחה' });
  } catch (error) { res.status(500).json({ error: 'שגיאה בעדכון המוצר' }); }
}

async function deleteProduct(req, res) {
  try {
    const result = await getDB().collection('stock').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'מוצר לא נמצא למחיקה' });
    res.status(200).json({ message: 'המוצר נמחק בהצלחה' });
  } catch (error) { res.status(500).json({ error: 'שגיאה במחיקת המוצר' }); }
}

module.exports = { getProducts, addProduct, updateProduct, deleteProduct };