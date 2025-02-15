const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

if (!fs.existsSync('public/uploads/')) {
    fs.mkdirSync('public/uploads/', { recursive: true });
}

const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadImage = multer({ storage: imageStorage });

const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '.webm')
});
const uploadAudio = multer({ storage: audioStorage });

io.on('connection', (socket) => {
    console.log('✅ A user connected');

    socket.on('chatMessage', (data) => {
        io.emit('chatMessage', data);
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

app.post('/upload/image', uploadImage.single('image'), (req, res) => {
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

app.post('/upload/audio', uploadAudio.single('audio'), (req, res) => {
    res.json({ audioUrl: `/uploads/${req.file.filename}` });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
