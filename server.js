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

app.use(express.static('public'));

// Ensure "uploads" folder exists
if (!fs.existsSync('public/uploads/')) {
    fs.mkdirSync('public/uploads/', { recursive: true });
}

// Configure Multer for image uploads
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadImage = multer({ storage: imageStorage });

// Configure Multer for audio uploads
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '.webm')
});
const uploadAudio = multer({ storage: audioStorage });

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('✅ A user connected');

    socket.on('chatMessage', (data) => {
        io.emit('chatMessage', { message: data.message, sender: false });
    });

    socket.on('imageUpload', (imageUrl) => {
        io.emit('imageUpload', imageUrl);
    });

    socket.on("audioUpload", (audioUrl) => {
        io.emit("audioUpload", audioUrl);
    });

    socket.on('disconnect', () => {
        console.log('❌ A user disconnected');
    });
});

// API route for uploading images
app.post('/upload/image', uploadImage.single('image'), (req, res) => {
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// API route for uploading audio
app.post('/upload/audio', uploadAudio.single('audio'), (req, res) => {
    res.json({ audioUrl: `/uploads/${req.file.filename}` });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
