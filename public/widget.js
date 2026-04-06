(function() {
  // 🛡️ Prevent multiple initializations
  if (window.__chatsela_initialized) return;
  window.__chatsela_initialized = true;

  const scriptTag = document.currentScript;
  const scriptUrl = new URL(scriptTag.src);
  const apiKey = scriptUrl.searchParams.get('key');
  if (!apiKey) {
    console.error('ChatSela: Missing API Key (key=...) in script tag.');
    return;
  }

  // 📂 1. God-Mode Sync Logic
  async function syncIntelligence() {
    const data = {
      apiKey: apiKey,
      url: window.location.href,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      jsonLd: []
    };

    // Extract Product/Service schema
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(s => {
      try {
        const json = JSON.parse(s.innerText);
        data.jsonLd.push(json);
      } catch (e) {}
    });

    try {
      // Use the origin of the script to find the API
      const baseUrl = scriptUrl.origin;
      await fetch(`${baseUrl}/api/widget/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      // Silent fail in production
    }
  }

  // 💬 2. Floating Icon Logic
  function renderFloatingIcon() {
    const iconEnabled = scriptUrl.searchParams.get('icon') === 'true';
    const phone = scriptUrl.searchParams.get('phone');

    if (!iconEnabled || !phone) return;

    const container = document.createElement('div');
    container.id = 'chatsela-floating-icon';
    container.style.cssText = 'position: fixed; bottom: 30px; right: 30px; z-index: 999999; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
    
    container.onmouseover = () => container.style.transform = 'scale(1.1)';
    container.onmouseout = () => container.style.transform = 'scale(1)';

    const link = document.createElement('a');
    link.href = `https://wa.me/${phone}?text=Hi! I am visiting your website and have a question about ${document.title}.`;
    link.target = '_blank';
    link.style.textDecoration = 'none';

    const circle = document.createElement('div');
    circle.style.cssText = 'background: #25D366; width: 65px; height: 65px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);';
    
    circle.innerHTML = `
      <svg width="38" height="38" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.653a11.883 11.883 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    `;

    link.appendChild(circle);
    container.appendChild(link);
    document.body.appendChild(container);

    // Optional: Add a small pulse animation
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes chatsela-pulse {
        0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(37, 211, 102, 0); }
        100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
      }
      #chatsela-floating-icon div {
        animation: chatsela-pulse 2s infinite;
      }
    `;
    document.head.appendChild(style);
  }

  // 🚀 Start
  syncIntelligence();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderFloatingIcon);
  } else {
    renderFloatingIcon();
  }
})();
