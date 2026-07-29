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
  currentTitle: 'Queen - Bohemian Rhapsody'
};

io.on('connection', (socket) => {
  console.log(`[Youtube L.ink] 사용자 접속: ${socket.id}`);

  // 신규 접속 유저에게 현재 방 상태 전송
  socket.emit('init-state', roomState);

  // 재생 싱크 이벤트 수신 및 전파
  socket.on('sync-action', (data) => {
    roomState = { ...roomState, ...data };
    socket.broadcast.emit('sync-action', data);
  });

  // 자동재생 토글 상태 공유
  socket.on('toggle-autoplay', (data) => {
    roomState.isAutoplay = data.isAutoplay;
    socket.broadcast.emit('toggle-autoplay', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Youtube L.ink] 사용자 퇴장: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Youtube L.ink Sync Server running on port ${PORT}`);
});