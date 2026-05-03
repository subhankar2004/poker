require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Room = require('./models/Room');

const app = express();
app.use(cors({
  origin: "*", // or your frontend domain
}));
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.NEXT_PUBLIC_MONGO_URI || 'mongodb://127.0.0.1:27017/poker_money_manager';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinRoom', async ({ roomCode, playerName }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      const playerIndex = room.players.findIndex(p => p.name === playerName);
      if (playerIndex > -1) {
        room.players[playerIndex].socketId = socket.id;
        await room.save();
        socket.join(roomCode);
        io.to(roomCode).emit('roomUpdated', room);
      } else {
        socket.emit('error', 'Player not found in room');
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('startGame', async ({ roomCode, dealerName }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (room && room.dealerId === dealerName) {
        room.gameStatus = 'playing';
        room.round = 1;
        room.pot = 0;
        room.currentBid = 0;
        room.currentTurn = 0;
        room.players.forEach(p => {
          p.status = 'active';
          p.currentBet = 0;
        });
        await room.save();
        io.to(roomCode).emit('roomUpdated', room);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('playerAction', async ({ roomCode, playerName, action, amount }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room || room.gameStatus !== 'playing') return;

      const playerIndex = room.players.findIndex(p => p.name === playerName);
      if (playerIndex === -1 || room.currentTurn !== playerIndex) return;

      const player = room.players[playerIndex];

      if (action === 'fold') {
        player.status = 'folded';
      } else if (action === 'call') {
        const toCall = room.currentBid - player.currentBet;
        const actualCall = Math.min(toCall, player.balance);
        player.balance -= actualCall;
        player.currentBet += actualCall;
        room.pot += actualCall;
      } else if (action === 'raise') {
        const raiseAmount = parseInt(amount);
        const toCall = room.currentBid - player.currentBet;
        const totalAmount = toCall + raiseAmount;
        
        if (totalAmount <= player.balance) {
          player.balance -= totalAmount;
          player.currentBet += totalAmount;
          room.pot += totalAmount;
          room.currentBid += raiseAmount;
        } else {
          // Insufficient balance, maybe should reject but for now we just take all they have
          return;
        }
      }

      // Move turn to next active player
      let nextTurn = (room.currentTurn + 1) % room.players.length;
      let activeCount = 0;
      room.players.forEach(p => { if(p.status === 'active') activeCount++; });

      if (activeCount > 1) {
        while (room.players[nextTurn].status !== 'active') {
          nextTurn = (nextTurn + 1) % room.players.length;
        }
        room.currentTurn = nextTurn;
      } else {
        // Only one player left active, they win the pot
        const winner = room.players.find(p => p.status === 'active');
        if (winner) winner.balance += room.pot;
        room.pot = 0;
        room.gameStatus = 'finished';
      }

      await room.save();
      io.to(roomCode).emit('roomUpdated', room);

    } catch (err) {
      console.error(err);
    }
  });

  socket.on('nextRound', async ({ roomCode, dealerName }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (room && room.dealerId === dealerName) {
        room.round += 1;
        room.currentBid = 0;
        room.players.forEach(p => {
          if (p.status === 'active') {
            p.currentBet = 0;
          }
        });
        
        // Find next active player for turn starting from 0
        let nextTurn = 0;
        while (nextTurn < room.players.length && room.players[nextTurn].status !== 'active') {
          nextTurn++;
        }
        room.currentTurn = nextTurn < room.players.length ? nextTurn : 0;
        
        await room.save();
        io.to(roomCode).emit('roomUpdated', room);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('selectWinner', async ({ roomCode, dealerName, winnerName }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (room && room.dealerId === dealerName) {
        const winner = room.players.find(p => p.name === winnerName);
        if (winner) {
          winner.balance += room.pot;
          room.pot = 0;
          room.gameStatus = 'finished';
          await room.save();
          io.to(roomCode).emit('roomUpdated', room);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Socket Server running on port ${PORT}`);
});
