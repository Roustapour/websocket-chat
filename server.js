const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');  // وارد کردن پکیج cors

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// تنظیمات CORS برای اجازه دادن به درخواست‌ها از github.io
app.use(cors({
    origin: 'https://roustapour.github.io',  // تغییر این به URL مورد نظر شما
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// سرو کردن فایل‌های استاتیک از ریشه پروژه (برای فایل‌های مانند script.js)
app.use(express.static(path.join(__dirname, '/')));  // پوشه ریشه پروژه

// مسیر برای ارسال فایل index.html به صورت دستی
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));  // ارسال index.html از ریشه پروژه
});

// Ensure "uploads" folder exists
if (!fs.existsSync('public/uploads/')) {
    fs.mkdirSync('public/uploads/', { recursive: true });
}

// Configure Multer برای آپلود تصاویر
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadImage = multer({ storage: imageStorage });

// دریافت URL تصویر و ارسال آن به سایر کاربران
io.on('connection', (socket) => {
    console.log('✅ A user connected');

    // دریافت پیام متنی از کلاینت و ارسال به سایر کلاینت‌ها
    socket.on('chatMessage', (data) => {
        io.emit('chatMessage', { message: data.message });
    });

    // دریافت URL تصویر و ارسال آن به سایر کلاینت‌ها
    socket.on('imageUpload', (imageUrl) => {
        io.emit('imageUpload', imageUrl);  // ارسال URL تصویر به همه کاربران
    });

    socket.on('disconnect', () => {
        console.log('❌ A user disconnected');
    });
});

// API route برای آپلود تصاویر
app.post('/upload/image', uploadImage.single('image'), (req, res) => {
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
