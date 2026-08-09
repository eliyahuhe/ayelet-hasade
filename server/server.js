const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// הגדרת נתיב לתיקיית השורש של הפרויקט
const rootPath = path.join(__dirname, '..');

// שורת הקסם: פותחת גישה לכל התיקיות והקבצים בתוך תיקיית השורש (HTML, CSS, תמונות)
app.use(express.static(rootPath));

// נתיב ברירת המחדל למשתמש שנכנס ל-http://localhost:3000/
app.get('/', (req, res) => {
    res.sendFile(path.join(rootPath, 'html', 'login.html'));
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});