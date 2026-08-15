const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://levinaouri9_db_user:Le9164601@cluster0.mzv8izl.mongodb.net/?appName=Cluster0";

const client = new MongoClient(MONGODB_URI);
let dbInstance;

/**
 * מתחבר למסד הנתונים בעת הפעלת השרת (פעם אחת בלבד)
 */
async function connectDB() {
    if (dbInstance) return dbInstance;

    try {
        await client.connect();
        // הקפדה על שם מסד נתונים אחיד בכל הפרויקט: myDatabase
        dbInstance = client.db('mydatabase');
        console.log('Successfully connected to MongoDB');
        return dbInstance;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

/**
 * מחזיר את החיבור הקיים מכל קובץ בשרת בצורה     מיידית וסינכרונית
 */
function getDB() {
    if (!dbInstance) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return dbInstance;
}

/**
 * סוגר את החיבור בצורה מסודרת בעת כיבוי השרת
 */
async function closeDB() {
    if (client) {
        await client.close();
        console.log('MongoDB connection closed.');
    }
}

module.exports = { connectDB, getDB, closeDB };