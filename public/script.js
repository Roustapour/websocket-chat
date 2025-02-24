document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const recordButton = document.getElementById('record-button');
    const chatBox = document.getElementById('chat-box');
    let mediaRecorder = null;
    let audioChunks = [];

    // اتصال به سرور
    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
    });

    // دریافت پیام‌ها
    socket.on('chatMessage', (data) => {
        appendMessage(data, 'received');
    });

    socket.on('fileMessage', (data) => {
        appendMessage(data, 'received');
    });

    // رویداد ارسال پیام
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        
        if (message) {
            const messageData = {
                type: 'text',
                content: message,
                timestamp: new Date().toISOString()
            };

            // ارسال پیام به سرور
            socket.emit('chatMessage', messageData);
            
            // نمایش پیام در چت باکس
            appendMessage(messageData, 'sent');
            
            // پاک کردن فیلد ورودی
            messageInput.value = '';
        }
    });

    // آپلود فایل
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Upload failed');

                const data = await response.json();
                const fileMessage = {
                    type: 'file',
                    content: data,
                    timestamp: new Date().toISOString()
                };

                socket.emit('fileMessage', fileMessage);
                appendMessage(fileMessage, 'sent');
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('خطا در آپلود فایل');
            }
        }
    });

    // ضبط صدا
    recordButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    });

    // شروع ضبط صدا
    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (e) => {
                    audioChunks.push(e.data);
                };
                mediaRecorder.onstop = handleAudioStop;
                mediaRecorder.start();
                recordButton.textContent = '⏹ توقف ضبط';
                recordButton.classList.add('recording');
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                alert('خطا در دسترسی به میکروفون');
            });
    }

    // توقف ضبط صدا
    function stopRecording() {
        if (mediaRecorder) {
            mediaRecorder.stop();
            recordButton.textContent = '🎤 شروع ضبط';
            recordButton.classList.remove('recording');
        }
    }

    // مدیریت فایل صوتی ضبط شده
    async function handleAudioStop() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            const audioMessage = {
                type: 'audio',
                content: data,
                timestamp: new Date().toISOString()
            };

            socket.emit('fileMessage', audioMessage);
            appendMessage(audioMessage, 'sent');
        } catch (error) {
            console.error('Error uploading audio:', error);
            alert('خطا در آپلود فایل صوتی');
        }

        audioChunks = [];
    }

    // نمایش پیام در چت باکس
    function appendMessage(data, type = 'received') {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);

        switch (data.type) {
            case 'text':
                messageDiv.textContent = data.content;
                break;
            case 'file':
                if (data.content.type.startsWith('image')) {
                    const img = document.createElement('img');
                    img.src = data.content.path;
                    img.alt = data.content.originalName;
                    messageDiv.appendChild(img);
                } else if (data.content.type.startsWith('audio')) {
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = data.content.path;
                    messageDiv.appendChild(audio);
                } else {
                    const link = document.createElement('a');
                    link.href = data.content.path;
                    link.textContent = data.content.originalName;
                    link.target = '_blank';
                    messageDiv.appendChild(link);
                }
                break;
            case 'audio':
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = data.content.path;
                messageDiv.appendChild(audio);
                break;
        }

        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});