const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// تنظیمات CORS برای اجازه دادن به درخواست‌ها از github.io
app.use(cors({
    origin: 'https://roustapour.github.io',  // تغییر این به URL مورد نظر شما
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// سرو کردن فایل‌های استاتیک از ریشه پروژه
app.use(express.static(path.join(__dirname, '/')));  // پوشه ریشه پروژه
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // برای دسترسی به فایل‌های آپلود شده

// Ensure "uploads" folder exists
if (!fs.existsSync('public/uploads/')) {
    fs.mkdirSync('public/uploads/', { recursive: true });
}

// پیکربندی Multer برای آپلود تصویر
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

// محدود کردن نوع فایل‌های آپلود شده به تصویر
const uploadImage = multer({
    storage: imageStorage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
            return cb(new Error('Only images are allowed'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // محدودیت اندازه فایل به 5MB
});

// پیکربندی Multer برای آپلود صوتی
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

// محدود کردن نوع فایل‌های آپلود شده به صدا
const uploadAudio = multer({
    storage: audioStorage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.wav') {
            return cb(new Error('Only WAV audio files are allowed'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 } // محدودیت اندازه فایل به 10MB
});

// مسیر برای ارسال فایل index.html به صورت دستی
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));  // ارسال index.html از ریشه پروژه
});

// API route برای آپلود تصاویر
app.post('/upload/image', uploadImage.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image file uploaded');
    }
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// API route برای آپلود فایل صوتی
app.post('/upload/audio', uploadAudio.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No audio file uploaded');
    }
    res.json({ audioUrl: `/uploads/${req.file.filename}` });
});

// دریافت URL فایل صوتی و ارسال آن به سایر کاربران
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

    // دریافت URL فایل صوتی و ارسال آن به سایر کلاینت‌ها
    socket.on('audioUpload', (audioUrl) => {
        io.emit('audioUpload', audioUrl);  // ارسال URL صوتی به همه کاربران
    });

    socket.on('disconnect', () => {
        console.log('❌ A user disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
