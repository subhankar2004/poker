const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  dealerId: { type: String, required: true },
  players: [{
    socketId: { type: String, default: null },
    name: { type: String, required: true },
    balance: { type: Number, required: true },
    status: { type: String, enum: ['active', 'folded', 'waiting'], default: 'active' },
    currentBet: { type: Number, default: 0 }
  }],
  pot: { type: Number, default: 0 },
  currentBid: { type: Number, default: 0 },
  currentTurn: { type: Number, default: 0 },
  round: { type: Number, default: 1 },
  gameStatus: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' }
});

module.exports = mongoose.model('Room', RoomSchema);
