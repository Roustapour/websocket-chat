const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// تنظیمات webhook
const WEBHOOK_URL = 'https://ar1234.app.n8n.cloud/webhook-test/ee129ac7-b3b3-4407-b3f8-0dd38b9acb55';
// آدرس سرور برای دسترسی به فایل‌ها از بیرون - در محیط توسعه
const SERVER_URL = 'http://localhost:3000';

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

// برای پارس کردن درخواست‌های JSON
app.use(bodyParser.json({ limit: '10mb' }));

// مسیر اصلی
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// مسیر API برای دریافت پاسخ‌ها از n8n
app.post('/api/response', (req, res) => {
    try {
        console.log('Response received from n8n:', req.body.type);
        
        // ارسال پاسخ به همه کاربران متصل از طریق Socket.IO
        if (req.body.type === 'response') {
            io.emit('botResponse', {
                type: 'text',
                content: req.body.content,
                timestamp: req.body.timestamp || new Date().toISOString()
            });
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error processing n8n response:', error);
        res.status(500).json({ error: error.message });
    }
});

// آپلود فایل
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // ایجاد مسیر قابل دسترسی از بیرون
        const filePath = `/uploads/${req.file.filename}`;
        
        // آماده‌سازی اطلاعات فایل برای بازگشت به کلاینت
        const fileData = {
            type: req.file.mimetype,
            path: filePath,
            originalName: req.file.originalname,
            size: req.file.size
        };

        // ایجاد ID منحصر به فرد برای این پیام
        const messageId = Date.now().toString();

        // ارسال به webhook
        try {
            // خواندن فایل به صورت buffer
            const fileBuffer = fs.readFileSync(req.file.path);
            const base64Data = fileBuffer.toString('base64');
            
            // ارسال اطلاعات به n8n
            await axios.post(WEBHOOK_URL, {
                type: 'file',
                messageId: messageId,
                fileUrl: `${SERVER_URL}${filePath}`,
                fileName: req.file.originalname,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                binary: {
                    data: base64Data
                },
                metadata: {
                    originalName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                    uploadedAt: new Date().toISOString()
                }
            });
            
            console.log(`File uploaded and sent to webhook: ${req.file.originalname}`);
        } catch (error) {
            console.error('Webhook error:', error.message);
        }

        res.json(fileData);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// تنظیمات Socket.IO
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('chatMessage', async (data) => {
        console.log('Message received:', data);
        
        // ایجاد ID منحصر به فرد برای این پیام
        const messageId = Date.now().toString();
        
        try {
            await axios.post(WEBHOOK_URL, {
                type: 'message',
                messageId: messageId,
                data: data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Webhook error:', error.message);
        }

        // ارسال به همه کلاینت‌ها
        io.emit('chatMessage', data);
    });

    socket.on('fileMessage', async (data) => {
        console.log('File message received:', data.type);
        
        // ایجاد ID منحصر به فرد برای این پیام
        const messageId = Date.now().toString();
        
        try {
            await axios.post(WEBHOOK_URL, {
                type: 'fileMessage',
                messageId: messageId,
                messageType: data.type,
                fileName: data.content?.originalName,
                mimeType: data.content?.type,
                fileUrl: `${SERVER_URL}${data.content?.path}`,
                timestamp: data.timestamp || new Date().toISOString()
            });
        } catch (error) {
            console.error('Webhook error:', error.message);
        }

        // ارسال به همه کلاینت‌ها
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