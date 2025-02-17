console.log("script.js is loaded!");

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed");

    // اتصال به سرور WebSocket
    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
        console.log("Connected to WebSocket server");
    });

    // تابع ارسال پیام
    function sendMessage() {
        console.log("sendMessage function is called!");
        let messageInput = document.getElementById("message");
        let message = messageInput.value.trim();
        if (message !== "") {
            socket.emit("chatMessage", message);  // ارسال پیام به سرور
            displayMessage(message, "sender");      // نمایش پیام در صفحه
            messageInput.value = "";                // پاکسازی ورودی
        }
    }

    // تابع نمایش پیام در چت
    function displayMessage(message, type) {
        let chatBox = document.getElementById("chat-box");
        let messageDiv = document.createElement("div");
        messageDiv.classList.add("message", type);
        messageDiv.textContent = message;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    socket.on("chatMessage", (message) => {
        displayMessage(message, "receiver");
    });

    // اتصال رویداد کلیک به دکمه Send
    document.getElementById("sendBtn").addEventListener("click", sendMessage);

    // ارسال پیام با کلید Enter
    document.getElementById("message").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });
});
