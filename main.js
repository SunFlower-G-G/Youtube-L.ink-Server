// Node.js 메인 프로세스에 브라우저 전역 객체(File)가 없어 발생하는 ReferenceError 방지
if (typeof global.File === 'undefined') {
  global.File = class File {};
}

const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const yts = require('yt-search');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 850,
    minWidth: 1000,
    minHeight: 680,
    frame: false,
    backgroundColor: '#09090b',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // 데스크톱 최신 크롬 브라우저 User-Agent 설정
  const desktopChromeUA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

  const defaultSession = session.defaultSession;
  defaultSession.setUserAgent(desktopChromeUA);

  // 💡 [핵심] 유튜브 임베드 오류 코드 152-4 해결: 요청 헤더 감춤 및 유튜브 출처(Origin/Referer) 우회
  defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*/*', 'http://*/*'] },
    (details, callback) => {
      details.requestHeaders['User-Agent'] = desktopChromeUA;
      
      // 유튜브 서버로 들어가는 모든 요청의 출처를 youtube.com으로 조작
      if (details.url.includes('youtube.com') || details.url.includes('youtube-nocookie.com') || details.url.includes('googlevideo.com')) {
        details.requestHeaders['Referer'] = 'https://www.youtube.com/';
        details.requestHeaders['Origin'] = 'https://www.youtube.com';
      }

      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  // 응답 헤der에서 Frame 차단 정책(X-Frame-Options) 해제
  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];

    callback({ cancel: false, responseHeaders });
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC 이벤트 등록
function registerIpcHandlers() {
  ipcMain.handle('search-youtube', async (event, query) => {
    try {
      if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
      }

      const r = await yts(query);
      const videos = r.videos ? r.videos.slice(0, 20) : [];

      return videos.map((video) => ({
        id: video.videoId,
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail,
        duration: video.timestamp,
        author: video.author ? video.author.name : 'Unknown',
        views: video.views
      }));
    } catch (error) {
      console.error('유튜브 검색 중 에러 발생:', error);
      return [];
    }
  });
}

// 앱 초기화
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 창이 닫혔을 때 종료 처리
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});