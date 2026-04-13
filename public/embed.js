(function() {
  // Prevent multiple injections
  if (window.DrDentWidgetLoaded) return;
  window.DrDentWidgetLoaded = true;

  const scriptTag = document.currentScript;
  const scriptUrl = new URL(scriptTag.src);
  const token = scriptUrl.searchParams.get('token');
  if (!token) {
    console.error('Dr. Dent Chat Widget: Missing token in script source.');
    return;
  }

  const API_BASE = scriptUrl.origin;
  
  // Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #drdent-widget-container { 
      position: fixed; 
      z-index: 999999; 
      bottom: 24px; 
      right: 24px; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #drdent-bubble { 
      width: 56px; 
      height: 56px; 
      border-radius: 28px; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      box-shadow: 0 4px 16px rgba(0,0,0,0.2); 
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
      transform-origin: center;
    }
    #drdent-bubble:hover { 
      transform: scale(1.1); 
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    }
    #drdent-bubble:active {
      transform: scale(0.95);
    }
    #drdent-bubble svg { 
      width: 24px; 
      height: 24px; 
      color: white; 
    }
    #drdent-iframe-container {
      position: absolute; 
      bottom: 80px; 
      right: 0; 
      width: 380px; 
      height: 600px; 
      max-height: calc(100vh - 120px);
      border-radius: 16px; 
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0,0,0,0.15); 
      display: none; 
      background: white; 
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(0,0,0,0.1);
    }
    #drdent-iframe-container.visible {
      display: block;
      opacity: 1;
      transform: translateY(0);
    }
    #drdent-iframe { 
      width: 100%; 
      height: 100%; 
      border: none; 
    }
    @media (max-width: 480px) { 
      #drdent-widget-container {
        bottom: 16px;
        right: 16px;
      }
      #drdent-iframe-container { 
        width: calc(100vw - 32px); 
        height: min(600px, calc(100vh - 100px));
        bottom: 72px; 
        right: 0; 
      } 
    }
  `;
  document.head.appendChild(style);

  // Fetch Config
  fetch(`${API_BASE}/api/widget/config?token=${token}`)
    .then(r => r.json())
    .then(config => {
      if (config.error) {
        console.warn('Dr. Dent Chat Widget:', config.error);
        return;
      }
      
      const container = document.createElement('div');
      container.id = 'drdent-widget-container';
      if (config.position === 'bottom-left') {
        container.style.right = 'auto'; 
        container.style.left = '24px';
      }

      const bubble = document.createElement('div');
      bubble.id = 'drdent-bubble';
      bubble.style.backgroundColor = config.primaryColor;
      bubble.title = "Chat with " + config.workspaceName;
      bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
      
      const frameContainer = document.createElement('div');
      frameContainer.id = 'drdent-iframe-container';
      
      const iframe = document.createElement('iframe');
      iframe.id = 'drdent-iframe';
      iframe.allow = "microphone; camera";
      iframe.src = `${API_BASE}/widget?token=${token}`;
      
      let isOpen = false;
      bubble.onclick = () => {
        isOpen = !isOpen;
        if (isOpen) {
          frameContainer.style.display = 'block';
          // Small delay to trigger transition
          setTimeout(() => frameContainer.classList.add('visible'), 10);
          bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        } else {
          frameContainer.classList.remove('visible');
          setTimeout(() => frameContainer.style.display = 'none', 300);
          bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
        }
      };

      frameContainer.appendChild(iframe);
      container.appendChild(frameContainer);
      container.appendChild(bubble);
      document.body.appendChild(container);
    })
    .catch(err => {
      console.error('Dr. Dent Chat Widget: Failed to load configuration.', err);
    });
})();
