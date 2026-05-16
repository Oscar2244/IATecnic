const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/diagnostico-chat';

// Inicializador de Animaciones Scroll
document.addEventListener('DOMContentLoaded', () => {
    const reveals = document.querySelectorAll('.reveal');
    const revealOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        });
    }, revealOptions);

    reveals.forEach(reveal => revealOnScroll.observe(reveal));
});

// Control de UI del Widget
function toggleChat() {
    const chatWidget = document.getElementById('chatWidget');
    const chatBtn = document.getElementById('chatToggleBtn');
    const isHidden = chatWidget.classList.contains('hidden');

    if (isHidden) {
        chatWidget.classList.remove('hidden');
        chatBtn.style.opacity = '0'; 
        chatBtn.style.pointerEvents = 'none';
        setTimeout(() => document.getElementById('userInput').focus(), 300);
    } else {
        chatWidget.classList.add('hidden');
        chatBtn.style.opacity = '1';
        chatBtn.style.pointerEvents = 'auto';
    }
}

// Formateador Markdown
function formatBotResponse(text) {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    let lines = formatted.split('\n');
    let inList = false;
    let resultHtml = '';

    lines.forEach(line => {
        let trimmedLine = line.trim();
        if (trimmedLine.startsWith('*')) {
            if (!inList) { resultHtml += '<ul>'; inList = true; }
            resultHtml += `<li>${trimmedLine.substring(1).trim()}</li>`;
        } else {
            if (inList) { resultHtml += '</ul>'; inList = false; }
            if (trimmedLine) resultHtml += `<p>${trimmedLine}</p>`;
        }
    });

    if (inList) resultHtml += '</ul>';
    return resultHtml;
}

// Motor Base (n8n)
async function sendMessage() {
    const input = document.getElementById('userInput');
    const btn = document.getElementById('sendBtn');
    const text = input.value.trim();
    
    if (!text) return;

    input.disabled = true;
    btn.disabled = true;

    appendMessage(text, 'user-message', false);
    input.value = '';

    const loaderHtml = `<div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    const loaderId = appendMessage(loaderHtml, 'bot-message', true, 'loader-msg');

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: text })
        });

        if (!response.ok) throw new Error('Error en el servidor');

        const data = await response.json();
        document.getElementById(loaderId)?.remove();

        let botReply = "No pude procesar el diagnóstico.";
        if (Array.isArray(data) && data[0]?.content?.parts?.[0]?.text) botReply = data[0].content.parts[0].text;
        else if (data?.content?.parts?.[0]?.text) botReply = data.content.parts[0].text;
        else if (data?.text) botReply = data.text;
        else if (data?.output) botReply = data.output;
        else if (typeof data === 'string') botReply = data;

        appendMessage(formatBotResponse(botReply), 'bot-message', true);

    } catch (error) {
        console.error(error);
        document.getElementById(loaderId)?.remove();
        appendMessage('Error de conexión. Verifica n8n en el puerto 5678.', 'bot-message', false);
    } finally {
        input.disabled = false;
        btn.disabled = false;
        input.focus();
    }
}

function appendMessage(content, className, isHtml, customId) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    const id = customId || 'msg-' + Date.now();
    
    messageDiv.id = id;
    messageDiv.className = `message ${className}`;
    
    if (isHtml) messageDiv.innerHTML = content;
    else messageDiv.innerText = content;
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !document.getElementById('userInput').disabled) {
        sendMessage();
    }
}