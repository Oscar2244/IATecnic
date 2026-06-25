const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/diagnostico-chat';

// Scroll reveal
document.addEventListener('DOMContentLoaded', () => {
    const reveals = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');
            o.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => obs.observe(el));
});

// Mobile menu
function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('hidden');
}

// Chat toggle
function toggleChat() {
    const widget = document.getElementById('chatWidget');
    const btn = document.getElementById('chatToggleBtn');
    const isHidden = widget.classList.contains('hidden');
    if (isHidden) {
        widget.classList.remove('hidden');
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        setTimeout(() => document.getElementById('userInput').focus(), 350);
    } else {
        widget.classList.add('hidden');
        widget.classList.remove('expanded');
        updateExpandIcon(false);
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    }
}

// Expand / collapse chat
let chatExpanded = false;
function expandChat() {
    const widget = document.getElementById('chatWidget');
    chatExpanded = !chatExpanded;
    widget.classList.toggle('expanded', chatExpanded);
    updateExpandIcon(chatExpanded);
}

function updateExpandIcon(expanded) {
    const btn = document.getElementById('expandBtn');
    if (!btn) return;
    btn.innerHTML = expanded
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
}

// Markdown formatter
function formatBotResponse(text) {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    let lines = formatted.split('\n');
    let inList = false;
    let html = '';
    lines.forEach(line => {
        const t = line.trim();
        if (t.startsWith('*')) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${t.substring(1).trim()}</li>`;
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            if (t) html += `<p>${t}</p>`;
        }
    });
    if (inList) html += '</ul>';
    return html;
}

// Send message
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
        const res = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: text })
        });
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        document.getElementById(loaderId)?.remove();

        let reply = 'No pude procesar el diagnóstico.';
        if (Array.isArray(data) && data[0]?.content?.parts?.[0]?.text) reply = data[0].content.parts[0].text;
        else if (data?.content?.parts?.[0]?.text) reply = data.content.parts[0].text;
        else if (data?.text) reply = data.text;
        else if (data?.output) reply = data.output;
        else if (typeof data === 'string') reply = data;

        appendMessage(formatBotResponse(reply), 'bot-message', true);
    } catch (err) {
        document.getElementById(loaderId)?.remove();
        appendMessage('Error de conexión. Verifica que n8n esté activo en el puerto 5678.', 'bot-message', false);
    } finally {
        input.disabled = false;
        btn.disabled = false;
        input.focus();
    }
}

function appendMessage(content, cls, isHtml, customId) {
    const box = document.getElementById('chatBox');
    const div = document.createElement('div');
    const id = customId || 'msg-' + Date.now();
    div.id = id;
    div.className = `message ${cls}`;
    if (isHtml) div.innerHTML = content;
    else div.innerText = content;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return id;
}

function handleKeyPress(e) {
    if (e.key === 'Enter' && !document.getElementById('userInput').disabled) sendMessage();
}