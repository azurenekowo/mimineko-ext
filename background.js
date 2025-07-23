importScripts('lib/jszip.min.js');

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.action === 'download_manga') {
        downloadManga(msg.mangaId, sender.tab.id);
    }
});

function sanitizeFilename(name) {
    return name.replace(/[\/:*?"<>|\.]/g, '_').replace(/\s+/g, ' ').trim();
}

function extractFilename(url, fallback = 'unnamed.jpg') {
    try {
        const path = new URL(url).pathname;
        let name = path.split('/').pop() || fallback;

        // Strip Windows-forbidden characters
        return name.replace(/[\\/:*?"<>|]/g, '_');
    } catch {
        return fallback;
    }
}


async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.json();
}

async function fetchBlob(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    return await res.blob();
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function notify(tabId, type, message, options = {}) {
    chrome.tabs.sendMessage(tabId, {
        type,
        message,
        ...options
    });
}

async function downloadManga(id, tabId) {
    try {
        const meta = await fetchJson(`https://mimihentai.com/api/v1/manga/info/${id}`);
        const chapters = await fetchJson(`https://mimihentai.com/api/v1/manga/gallery/${id}`);
        const title = meta.title.replace(/[\\/:*?"<>|]/g, '_');

        notify(tabId, 'success', `📖 API Response: ${title}`);

        for (const chapter of chapters) {
            const chapterTitle = `${chapter.id}-${chapter.title}`.replace(/[\\/:*?"<>|]/g, '_');
            notify(tabId, 'info', `📂 Bắt đầu tải: ${chapterTitle}`);

            const zip = new JSZip();
            const pageResp = await fetchJson(`https://mimihentai.com/api/v1/manga/chapter?id=${chapter.id}`);
            const pages = Array.isArray(pageResp.pages) ? pageResp.pages : [];

            for (let i = 0; i < pages.length; i++) {
                const url = pages[i];

                try {
                    const blob = await fetchBlob(url);
                    const filename = extractFilename(url, `${String(i + 1).padStart(3, '0')}`) + '.jpg';
                    zip.file(filename, blob)
                } catch (err) {
                    console.warn(`⚠ Failed to fetch image ${i + 1}:`, err);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const dataUrl = await blobToDataUrl(zipBlob);

            console.log(`[📦] Preparing download for: ${sanitizeFilename(title)}/${sanitizeFilename(chapterTitle)}`);

            chrome.downloads.download({
                url: dataUrl,
                filename: `${sanitizeFilename(title)}/${sanitizeFilename(chapterTitle)}.zip`,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error(`[DOWNLOAD ERROR]`, chrome.runtime.lastError);
                } else {
                    console.log(`[✅] Download triggered: ${downloadId}`);
                }
            });

            notify(tabId, 'success', `📂 Hoàn tất: ${chapterTitle}`, {
                id: 'mimidl-progress',
                persistent: false
            })
        }

        notify(tabId, 'success', `✅ Đã tải xong tất cả chapter.`, {
            id: 'mimidl-progress',
            persistent: false
        })

    } catch (err) {
        console.error('❌ Error downloading manga:', err);
        if (tabId) notify(tabId, 'error', `❌ Failed to download: ${err.message}`);
    }
}
