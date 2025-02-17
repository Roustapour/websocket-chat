document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed");

    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
        console.log("Connected to WebSocket server");
    });

    // متغیرهای مربوط به ضبط صدا
    let mediaRecorder;
    let audioChunks = [];

    // تابع ارسال پیام
    function sendMessage() {
        console.log("sendMessage function is called!");
        let messageInput = document.getElementById("message");
        let message = messageInput.value.trim();
        if (message !== "") {
            socket.emit("chatMessage", { message: message });  // ارسال پیام به سرور به صورت شیء با ویژگی 'message'
            displayMessage(message, "sender");      // نمایش پیام در صفحه
            messageInput.value = "";                // پاکسازی ورودی
        }
    }

    // تابع ارسال تصویر
    function uploadImage() {
        const imageInput = document.getElementById('imageInput');
        const imageFile = imageInput.files[0];  // گرفتن فایل تصویر از ورودی

        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);

            // ارسال فایل تصویر به سرور
            fetch('/upload/image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Image uploaded successfully:', data);
                // ارسال URL تصویر به سرور برای نمایش در سایر تب‌ها
                socket.emit('imageUpload', data.imageUrl);
            })
            .catch(error => {
                console.error('Error uploading image:', error);
            });
        }
    }

    // تابع نمایش پیام یا تصویر در چت
    function displayMessage(message, type) {
        let chatBox = document.getElementById("chat-box");
        let messageDiv = document.createElement("div");
        messageDiv.classList.add("message", type);
        messageDiv.innerHTML = message;  // اگر پیام تصویر است، از innerHTML برای نمایش استفاده کنید
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // دریافت و نمایش پیام‌های متنی
    socket.on("chatMessage", (data) => {
        displayMessage(data.message, "receiver");
    });

    // دریافت و نمایش تصاویر آپلود شده
    socket.on('imageUpload', (imageUrl) => {
        displayMessage(`<img src="${imageUrl}" alt="Uploaded Image" style="max-width: 100%; height: auto;">`, "receiver");
    });

    // دریافت و پخش فایل صوتی
    socket.on('audioUpload', (audioUrl) => {
        displayMessage(`<audio controls><source src="${audioUrl}" type="audio/wav"></audio>`, "receiver");
    });

    // اتصال رویداد کلیک به دکمه Send
    document.getElementById("sendBtn").addEventListener("click", sendMessage);

    // ارسال پیام با کلید Enter (بدون ارسال فرم)
    document.getElementById("message").addEventListener("keypress", function(event) {
        if (event.key === "Enter" && !event.shiftKey) {  // اضافه کردن خط جدید اگر Shift زده نشده باشد
            event.preventDefault();  // جلوگیری از ارسال پیام
            sendMessage();
        }
    });

    // اصلاح بخش مربوط به ارسال تصویر
    const sendImageBtn = document.querySelector("button[onclick='uploadImage()']");
    if (sendImageBtn) {
        sendImageBtn.addEventListener("click", uploadImage);
    }

    // فعال‌سازی ضبط صدا
    document.getElementById("recordButton").addEventListener("click", startRecording);
    document.getElementById("stopButton").addEventListener("click", stopRecording);
    document.getElementById("sendVoiceBtn").addEventListener("click", sendVoice);

    // شروع ضبط صدا
    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioChunks = [];
                    window.audioUrl = audioUrl;  // ذخیره URL صوتی برای ارسال به سرور
                    document.getElementById("sendVoiceBtn").disabled = false;  // فعال‌سازی دکمه ارسال ویس
                };
                mediaRecorder.start();
                document.getElementById("stopButton").disabled = false;  // فعال‌سازی دکمه Stop
                document.getElementById("recordButton").disabled = true;  // غیرفعال کردن دکمه Start Recording
            })
            .catch((err) => {
                console.error("Error accessing media devices.", err);
            });
    }

    // توقف ضبط صدا
    function stopRecording() {
        mediaRecorder.stop();
        document.getElementById("recordButton").disabled = false;  // فعال‌سازی دکمه Start Recording
        document.getElementById("stopButton").disabled = true;     // غیرفعال کردن دکمه Stop
    }

    // ارسال ویس
    function sendVoice() {
        const audioUrl = window.audioUrl;
        if (audioUrl) {
            const formData = new FormData();
            formData.append("audio", audioUrl);  // ارسال فایل صوتی به سرور
            
            fetch('/upload/audio', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                socket.emit('audioUpload', data.audioUrl);  // ارسال URL فایل صوتی به سرور
            })
            .catch(error => {
                console.error('Error uploading audio:', error);
            });
        }
    }
});
