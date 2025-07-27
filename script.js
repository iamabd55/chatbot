// === DOM Elements ===
const msgInput = document.querySelector('.msg-input');
const chatBody = document.querySelector('.chat-body');
const sendIcon = document.querySelector('#send-msg');
const modelToggle = document.querySelector("#toggle-models");
const modelList = document.querySelector("#model-list");
const modelName = document.querySelector('.model-name');
const themeBtn = document.querySelector('.theme');
const fileInput = document.querySelector('#file-input');

// === State ===
let defaultModel = 'gemini-2.5-flash-lite';
let conversationHistory = [];
let darkMode = false;

// === User Data ===
const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null
    }
};

// === Model Dropdown Handling ===
modelToggle.addEventListener('click', e => {
    e.preventDefault();
    modelList.classList.toggle('hidden');
});

modelList.querySelectorAll('li').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const selectedText = e.target.textContent.trim();
        modelName.innerText = selectedText;
        modelList.classList.add('hidden');
        defaultModel = selectedText.toLowerCase().replace(/\s+/g, '-');
    });
});

// === Theme Change ===
themeBtn.addEventListener('click', () => {
    darkMode = !darkMode;
    document.querySelectorAll('.chat-body, .chat-footer').forEach(el => {
        el.classList.toggle('dark', darkMode);
    });
    document.querySelectorAll('.msgText').forEach(el => {
        el.classList.toggle('lightDark', darkMode);
    });

    const chatForm = document.querySelector(".chat-form");
    chatForm.style.backgroundColor = darkMode ? '#474747' : '#ffffff';
    msgInput.style.color = darkMode ? '#ffffff' : 'black';
    msgInput.style.caretColor = darkMode ? '#ffffff' : 'black';

    themeBtn.src = themeBtn.src.includes("images/night.svg") ? "images/day.svg" : "images/night.svg";
    document.querySelectorAll('.clip').forEach(clip => {
    clip.src = clip.src.includes("images/clipboard.svg") 
        ? "images/clipboard_white.svg" 
        : "images/clipboard.svg";
});

});

// === Utility Functions ===
const escapeHTML = str => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

function addSalawat(text) {
    return text.replace(/\b(?:Hazrat\s+|Prophet\s+)?Muhammad\b/gi, match => `${match} ﷺ`);
}

function formatMarkdown(text) {
    let formatted = text.replace(/\r\n/g, "\n");
    formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>');
    formatted = formatted.replace(/(?:^|\n)([-*+] .+(?:\n[-*+] .+)*)/g, match => {
        const items = match.trim().split("\n").map(line => line.replace(/^[-*+]\s+/, "")).map(line => `<li>${line}</li>`).join("");
        return `<ul>${items}</ul>`;
    });
    formatted = formatted.replace(/(?:^|\n)((?:\d+\..+(?:\n\d+\..+)*)+)/g, match => {
        const items = match.trim().split("\n").map(line => line.replace(/^\d+\.\s+/, "")).map(line => `<li>${line}</li>`).join("");
        return `<ol>${items}</ol>`;
    });
    formatted = formatted.replace(/\n{2,}/g, '</p><p>');
    formatted = `<p>${formatted}</p>`;
    return formatted;
}

function typeText(element, text, speed = 0.5, onComplete) {
    element.innerHTML = "";
    let i = 0;
    (function type() {
        if (i < text.length) {
            element.innerHTML += escapeHTML(text.charAt(i));
            i++;
            setTimeout(type, speed);
        } else {
            onComplete?.();
        }
    })();
}

const createDiv = (classNames, innerHTML) => {
    const div = document.createElement('div');
    div.className = classNames;
    div.innerHTML = innerHTML;
    if (darkMode) {
        div.querySelectorAll('.msgText').forEach(el => el.classList.add('lightDark'));
    }
    return div;
};

// === Send Message ===
function sendUserMessage(userMsg) {
    const safeMsg = escapeHTML(addSalawat(userMsg));
    chatBody.appendChild(createDiv('flex justify-end flex-col items-end gap-2', `
        <div class="message user-msg">${safeMsg}</div>
        ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />` : ""}
    `));
    msgInput.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    const botMsg = createDiv(
        'message bot-msg thinking flex-col md:flex-row md:items-center gap-3',
        `
        <img class="avatar bg-[#0022ff] rounded-full p-[5px]" src="images/logo_white.svg" height="30" width="30" alt="">
        <div class="msgText flex flex-col p-[16px] max-w-[100%] bg-[#F2F2F2] text-[0.95rem]">
            <div class="thinking flex gap-[4px] pt-[15px] pb-[15px]">
                ${'<div class="dot h-[7px] w-[7px] bg-[#0022ff] rounded-full"></div>'.repeat(3)}
            </div>
        </div>
        `
    );
    chatBody.appendChild(botMsg);
    chatBody.scrollTop = chatBody.scrollHeight;

    generateBotResponse(userMsg, botMsg);
}

// === Generate Bot Response ===
async function generateBotResponse(prompt, botMsgElement) {
    try {
        conversationHistory.push({ role: "user", parts: [{ text: prompt }] });

        const response = await fetch('/api/chat', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: prompt,
                history: conversationHistory,
                file: userData.file.data ? userData.file : null,
                model: defaultModel // always send current model
            })
        });

        const data = await response.json();
        let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply available.";
        botReply = addSalawat(botReply);
        conversationHistory.push({ role: "model", parts: [{ text: botReply }] });

        botMsgElement.classList.remove('thinking');

        const wrapper = document.createElement('div');
        wrapper.className = 'wrapper flex items-end gap-2';

        const msgText = document.createElement('div');
        msgText.className = 'msgText flex flex-col p-4 max-w-[75%] bg-[#F2F2F2] text-sm rounded-lg';
        if (darkMode) msgText.classList.add('lightDark');

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy relative p-1 hover:opacity-70 w-6 h-6 flex items-center justify-center';
        copyBtn.innerHTML = `<img width="15" height="15" src="images/clipboard.svg" alt="Copy" class="clip h-4 w-4">`;

        copyBtn.addEventListener('click', async () => {
            const icon = copyBtn.querySelector('img');
            try {
                await navigator.clipboard.writeText(botReply);
            } catch (err) {
                const textArea = document.createElement('textarea');
                textArea.value = botReply;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            icon.style.display = 'none';
            const tick = document.createElement('span');
            tick.textContent = '✓';
            tick.className = 'text-green-600 text-base font-bold';
            copyBtn.appendChild(tick);
            setTimeout(() => {
                tick.remove();
                icon.style.display = 'block';
            }, 1000);
        });

        wrapper.appendChild(msgText);
        wrapper.appendChild(copyBtn);

        botMsgElement.querySelector('.msgText').replaceWith(wrapper);

        typeText(msgText, botReply, 0.5, () => {
            msgText.innerHTML = formatMarkdown(botReply);
            chatBody.scrollTop = chatBody.scrollHeight;
        });
    } catch (err) {
        console.error("Error fetching response:", err);
        botMsgElement.querySelector('.msgText').textContent = "Error fetching response.";
    }
}

// === Input Handlers ===
function handleUserInput(userMsg) {
    if (userMsg) sendUserMessage(userMsg.trim());
}

msgInput.addEventListener('keydown', e => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleUserInput(e.target.value);
    }
});

sendIcon.addEventListener('click', e => {
    e.preventDefault();
    handleUserInput(msgInput.value);
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64String = e.target.result.split(",")[1];
        userData.file = { data: base64String, mime_type: file.type };
        fileInput.value = "";
    };
    reader.readAsDataURL(file);
});

document.querySelector('#file-upload').addEventListener('click', () => fileInput.click());
