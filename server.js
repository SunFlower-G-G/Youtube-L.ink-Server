const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 중앙 재생 상태 관리
let roomState = {
  videoId: 'fJ9rUzIMcZQ',
  action: 'pause',
  time: 0,
  isAutoplay: true,
  currentTitle: 'Queen - Bohemian Rhapsody',
  queue: []
};

let hostSocketId = null;
// 동시 출발을 위해 광고 스킵/로딩 완료된 소켓 저장
let readyClients = new Set();

function updateHost() {
  const clients = Array.from(io.sockets.sockets.keys());
  if (clients.length > 0) {
    if (!hostSocketId || !clients.includes(hostSocketId)) {
      hostSocketId = clients[0];
      console.log(`👑 [Youtube L.ink] 새로운 방장(Host) 지정: ${hostSocketId}`);
    }
  } else {
    hostSocketId = null;
  }

  clients.forEach(socketId => {
    const clientSocket = io.sockets.sockets.get(socketId);
    if (clientSocket) {
      clientSocket.emit('host-status', {
        isHost: socketId === hostSocketId,
        hostId: hostSocketId
      });
    }
  });
}

io.on('connection', (socket) => {
  console.log(`[Youtube L.ink] 사용자 접속: ${socket.id}`);

  socket.emit('init-state', roomState);
  updateHost();

  // 곡 전환 요청 수신
  socket.on('sync-action', (data) => {
    roomState = { ...roomState, ...data };

    if (data.action === 'load') {
      readyClients.clear(); // 준원 상태 초기화
      roomState.time = 0;
    }

    socket.broadcast.emit('sync-action', data);
  });

  // ⚡ 광고 스킵 및 영상 준비 완료 보고 수신
  socket.on('client-ready', (data) => {
    if (data.videoId === roomState.videoId) {
      readyClients.add(socket.id);

      const totalConnected = io.engine.clientsCount;
      console.log(`[Sync Ready] (${readyClients.size}/${totalConnected}) 명 광고 스킵 완료/준비 완료`);

      // 파티 내 모든 접속자가 광고 스킵 및 로딩이 완료되면 동시 출발!
      if (readyClients.size >= totalConnected) {
        console.log(`🚀 [Youtube L.ink] 모든 인원 동시 재생 신호 전송`);
        io.emit('start-play', {
          videoId: roomState.videoId,
          currentTime: 0
        });
        readyClients.clear();
      }
    }
  });

  // 재생 상태 및 시간 미세 동기화
  socket.on('sync-time', (data) => {
    roomState.time = data.currentTime;
    socket.broadcast.emit('sync-time', data);
  });

  socket.on('sync-queue', (data) => {
    roomState.queue = data.queue || [];
    socket.broadcast.emit('sync-queue', data);
  });

  socket.on('toggle-autoplay', (data) => {
    roomState.isAutoplay = data.isAutoplay;
    socket.broadcast.emit('toggle-autoplay', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Youtube L.ink] 사용자 퇴장: ${socket.id}`);
    readyClients.delete(socket.id);
    updateHost();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Youtube L.ink Sync Server running on port ${PORT}`);
});