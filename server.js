const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// تنظیمات webhook
const WEBHOOK_URL = 'https://ar1234.app.n8n.cloud/webhook-test/ee129ac7-b3b3-4407-b3f8-0dd38b9acb55'; // آدرس webhook خود را اینجا قرار دهید

// تنظیمات ذخیره فایل
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = 'public/uploads/';
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// ارسال فایل‌های استاتیک
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// مسیر اصلی
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// آپلود فایل
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileData = {
            type: req.file.mimetype,
            path: `/uploads/${req.file.filename}`,
            originalName: req.file.originalname
        };

        // ارسال به webhook
        try {
            await axios.post(WEBHOOK_URL, {
                type: 'file',
                data: fileData
            });
        } catch (error) {
            console.error('Webhook error:', error);
        }

        res.json(fileData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// تنظیمات Socket.IO
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('chatMessage', async (data) => {
        console.log('Message received:', data);
        
        // ارسال به webhook
        try {
            await axios.post(WEBHOOK_URL, {
                type: 'message',
                data: data
            });
        } catch (error) {
            console.error('Webhook error:', error);
        }

        // ارسال به همه کلاینت‌ها
        io.emit('chatMessage', data);
    });

    socket.on('fileMessage', async (data) => {
        console.log('File message received:', data);
        
        // ارسال به webhook
        try {
            await axios.post(WEBHOOK_URL, {
                type: 'file',
                data: data
            });
        } catch (error) {
            console.error('Webhook error:', error);
        }

        io.emit('fileMessage', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});