const { app, BrowserWindow, ipcMain, session } = require('electron');
const https = require('https');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  // 🛡️ [네트워크 광고 서버 차단 레이어]
  const adFilter = {
    urls: [
      '*://*.doubleclick.net/*',
      '*://*.googleadservices.com/*',
      '*://*.googlesyndication.com/*',
      '*://www.youtube.com/pagead/*',
      '*://www.youtube.com/ptracking/*',
      '*://*.youtube.com/api/stats/ads*',
      '*://*.youtube.com/get_midroll_info*',
      '*://static.doubleclick.net/*',
      '*://s0.2mdn.net/*'
    ]
  };

  session.defaultSession.webRequest.onBeforeRequest(adFilter, (details, callback) => {
    callback({ cancel: true });
  });

  session.defaultSession.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 🔍 [동영상 전용 검색] 유튜브 결과 파싱 IPC
ipcMain.handle('search-youtube', async (event, query) => {
  return new Promise((resolve) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    };

    https.get(searchUrl, options, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        try {
          const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);
          if (!jsonMatch) {
            resolve([]);
            return;
          }

          const ytData = JSON.parse(jsonMatch[1]);
          const contents = ytData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

          const videoList = [];

          if (contents && contents.length > 0) {
            for (const section of contents) {
              const itemSection = section.itemSectionRenderer?.contents;
              if (!itemSection) continue;

              for (const item of itemSection) {
                const videoRenderer = item.videoRenderer;
                if (!videoRenderer) continue;

                const videoId = videoRenderer.videoId;
                const title = videoRenderer.title?.runs?.[0]?.text || '제목 없음';
                const author = videoRenderer.ownerText?.runs?.[0]?.text || 'YouTube Channel';
                const thumbnail = videoRenderer.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

                if (videoId) {
                  videoList.push({
                    id: videoId,
                    videoId: videoId,
                    title: title,
                    author: author,
                    channel: author,
                    thumbnail: thumbnail,
                    isKeyword: false
                  });
                }

                if (videoList.length >= 15) break;
              }
              if (videoList.length >= 15) break;
            }
          }

          resolve(videoList);
        } catch (err) {
          console.error('YouTube Parsing Error:', err);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error('Network search error:', err);
      resolve([]);
    });
  });
});