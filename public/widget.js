(function() {
  if (window.__chatsela_loaded) return;
  window.__chatsela_loaded = true;

  const scriptTag = document.currentScript;
  const userId = scriptTag.getAttribute('data-id');
  if (!userId) return console.error('ChatSela: data-id missing');

  const API_BASE = scriptTag.src.replace('/widget.js', '');
  let contactId = localStorage.getItem('chatsela_contact_id') || 'web_' + Math.random().toString(36).slice(2, 11);
  localStorage.setItem('chatsela_contact_id', contactId);

  // 1. Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #chatsela-widget-container { position: fixed; bottom: 30px; right: 30px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #chatsela-bubble { width: 60px; height: 60px; background: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transition: transform 0.3s; }
    #chatsela-bubble:hover { transform: scale(1.1); }
    #chatsela-bubble svg { width: 30px; height: 30px; fill: #00ff88; }
    
    #chatsela-window { display: none; width: 380px; height: 550px; background: #111; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: absolute; bottom: 80px; right: 0; }
    #chatsela-header { padding: 20px; background: linear-gradient(135deg, #1a1a1a, #000); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 12px; }
    #chatsela-header h4 { margin: 0; color: #fff; font-size: 15px; font-weight: 700; }
    #chatsela-header span { width: 8px; height: 8px; background: #00ff88; border-radius: 50%; box-shadow: 0 0 10px #00ff88; }
    
    #chatsela-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flexDirection: column; gap: 12px; }
    .chatsela-msg { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; margin-bottom: 8px; }
    .chatsela-msg-user { align-self: flex-end; background: #00ff88; color: #000; margin-left: auto; }
    .chatsela-msg-bot { align-self: flex-start; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.05); }
    
    #chatsela-input-area { padding: 15px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 8px; background: #000; }
    #chatsela-input { flex: 1; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 15px; color: #fff; font-size: 14px; outline: none; }
    #chatsela-send { background: #00ff88; color: #000; border: none; border-radius: 10px; padding: 0 15px; cursor: pointer; font-weight: 700; }
    
    #chatsela-footer { padding: 10px; text-align: center; font-size: 10px; color: rgba(255,255,255,0.3); border-top: 1px solid rgba(255,255,255,0.02); }
    #chatsela-footer a { color: #00ff88; text-decoration: none; }
  `;
  document.head.appendChild(style);

  // 2. HTML Structure
  const container = document.createElement('div');
  container.id = 'chatsela-widget-container';
  container.innerHTML = `
    <div id="chatsela-window">
      <div id="chatsela-header">
        <span></span>
        <h4>Agent Sela</h4>
        <div style="margin-left: auto; cursor: pointer; opacity: 0.5;" onclick="document.getElementById('chatsela-window').style.display='none'">✕</div>
      </div>
      <div id="chatsela-messages"></div>
      <div id="chatsela-input-area">
        <input type="text" id="chatsela-input" placeholder="Type a message...">
        <button id="chatsela-send">SEND</button>
      </div>
      <div id="chatsela-footer">Powered by <a href="https://chatsela.com" target="_blank">ChatSela AI</a></div>
    </div>
    <div id="chatsela-bubble">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    </div>
  `;
  document.body.appendChild(container);

  // 3. Logic
  const bubble = document.getElementById('chatsela-bubble');
  const windowEl = document.getElementById('chatsela-window');
  const input = document.getElementById('chatsela-input');
  const sendBtn = document.getElementById('chatsela-send');
  const messagesEl = document.getElementById('chatsela-messages');

  bubble.onclick = () => {
    windowEl.style.display = windowEl.style.display === 'flex' ? 'none' : 'flex';
    if (messagesEl.children.length === 0) {
      addMessage('bot', 'Hello! 👋 How can I help you today?');
    }
  };

  input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
  sendBtn.onclick = handleSend;

  function addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `chatsela-msg chatsela-msg-${role}`;
    msg.innerText = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);

    const typing = document.createElement('div');
    typing.className = 'chatsela-msg chatsela-msg-bot';
    typing.innerText = '...';
    messagesEl.appendChild(typing);

    try {
      const resp = await fetch(`${API_BASE}/api/chat/web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: text, contactId })
      });
      const data = await resp.json();
      messagesEl.removeChild(typing);
      addMessage('bot', data.response || "I'm having a bit of trouble thinking right now. Try again?");
    } catch (e) {
      messagesEl.removeChild(typing);
      addMessage('bot', "Connection error. Please check your internet.");
    }
  }
})();
