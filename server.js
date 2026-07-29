const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 중앙 재생 상태 관리 변수
let roomState = {
  videoId: 'fJ9rUzIMcZQ', // 기본 초기 곡
  action: 'pause',
  time: 0,
  isAutoplay: true,
  currentTitle: 'Queen - Bohemian Rhapsody',
  queue: [] // 대기열 목록 추가
};

// 동시 출발을 위해 준비 완료된 사용자 socket.id 추적 Set
let readyClients = new Set();

io.on('connection', (socket) => {
  console.log(`[Youtube L.ink] 사용자 접속: ${socket.id}`);

  // 신규 접속 유저에게 현재 방 상태 전송
  socket.emit('init-state', roomState);

  // 1. 재생 싱크 및 곡 변경 이벤트 수신
  socket.on('sync-action', (data) => {
    roomState = { ...roomState, ...data };

    // 곡이 새로 로드되는 상황이면 준비 완료 인원 리셋
    if (data.action === 'load') {
      readyClients.clear();
      roomState.time = 0;
    }

    socket.broadcast.emit('sync-action', data);
  });

  // 2. ⚡ [핵심] 각 사용자가 클라이언트 로딩 완료(`client-ready`)를 알릴 때
  socket.on('client-ready', (data) => {
    if (data.videoId === roomState.videoId) {
      readyClients.add(socket.id);

      const totalConnected = io.engine.clientsCount;
      console.log(`[Sync Ready] (${readyClients.size}/${totalConnected}) 명 동기화 준비 완료`);

      // 접속한 모든 친구들의 로딩이 끝났으면 동시 출발!
      if (readyClients.size >= totalConnected) {
        console.log(`🚀 [Youtube L.ink] 모든 인원 준비 완료! 동시 재생 신호 전송`);
        io.emit('start-play', {
          videoId: roomState.videoId,
          currentTime: 0
        });
        readyClients.clear(); // 다음 곡을 위해 준비 목록 초기화
      }
    }
  });

  // 3. 미세 시간 동기화 이벤트
  socket.on('sync-time', (data) => {
    roomState.time = data.currentTime;
    socket.broadcast.emit('sync-time', data);
  });

  // 4. 대기열(Queue) 상태 동기화
  socket.on('sync-queue', (data) => {
    roomState.queue = data.queue || [];
    socket.broadcast.emit('sync-queue', data);
  });

  // 5. 자동재생 토글 상태 공유
  socket.on('toggle-autoplay', (data) => {
    roomState.isAutoplay = data.isAutoplay;
    socket.broadcast.emit('toggle-autoplay', data);
  });

  // 6. 사용자 퇴장 처리
  socket.on('disconnect', () => {
    console.log(`[Youtube L.ink] 사용자 퇴장: ${socket.id}`);
    readyClients.delete(socket.id); // 퇴장 시 준비 인원 목록에서 제거
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Youtube L.ink Sync Server running on port ${PORT}`);
});