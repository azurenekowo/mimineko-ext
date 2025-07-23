(function () {
    setInterval(() => {
        // Find the "Đọc ngay!" button
        const readNowBtn = [...document.querySelectorAll('button')].find(
            b => b.textContent.trim() === 'Đọc ngay!'
        );

        if (!readNowBtn) return;

        // Get the parent container
        const container = readNowBtn.parentElement;
        if (!container || container.querySelector('#download-btn')) return;

        // Inject Download button
        const dlBtn = document.createElement('button');
        dlBtn.id = 'download-btn';
        dlBtn.innerText = 'Download';
        dlBtn.className = readNowBtn.className;
        dlBtn.style.marginLeft = '0.5rem';
        dlBtn.style.background = '#14b8a6';
        dlBtn.style.cursor = 'pointer';

        dlBtn.onclick = () => {
            const id = window.location.pathname.split('/').pop();
            console.log('[MimiDownloader] Sending message to background for ID:', id);

            chrome.runtime.sendMessage({
                action: 'download_manga',
                mangaId: id
            });
        };

        container.insertBefore(dlBtn, readNowBtn.nextSibling);
    }, 500); // Brute force every 500ms forever

    function notifyFrontend(message, type = 'info') {
        const color = {
            info: '#334155',
            success: '#16a34a',
            error: '#dc2626'
        }[type] || '#444';

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    background: ${color};
    color: white;
    padding: 8px 12px;
    margin-bottom: 8px;
    border-radius: 6px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

        document.body.appendChild(toast);
        requestAnimationFrame(() => (toast.style.opacity = '1'));

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type && msg?.message) {
            notifyFrontend(msg.message, msg.type);
        }
    });
    
    // Create or reuse the notification container
    function getToastContainer() {
        let container = document.querySelector('#mimidl-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mimidl-toast-container';
            container.style.position = 'fixed';
            container.style.top = '1rem';
            container.style.right = '1rem';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '0.5rem';
            document.body.appendChild(container);
        }
        return container;
    }

    // Create or update a persistent toast with an ID
    function notifySticky(id, message, type = 'info') {
        const color = {
            info: '#334155',
            success: '#16a34a',
            error: '#dc2626'
        }[type] || '#444';

        const container = getToastContainer();
        let toast = container.querySelector(`#${id}`);

        if (!toast) {
            toast = document.createElement('div');
            toast.id = id;
            toast.style.background = color;
            toast.style.color = 'white';
            toast.style.padding = '8px 12px';
            toast.style.borderRadius = '6px';
            toast.style.fontSize = '14px';
            toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            toast.style.transition = 'opacity 0.3s ease';
            container.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.background = color;
    }

    // Temporary one-shot message
    function notifyFrontend(message, type = 'info') {
        const id = `toast-${Date.now()}`;
        notifySticky(id, message, type);

        // Auto-remove after 3s
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.remove();
        }, 3000);
    }

    // Listener from background
    chrome.runtime.onMessage.addListener((msg) => {
        if (!msg?.type || !msg?.message) return;

        if (msg.persistent) {
            notifySticky(msg.id || 'mimidl-progress', msg.message, msg.type);
        } else {
            notifyFrontend(msg.message, msg.type);
        }
    });

})();
