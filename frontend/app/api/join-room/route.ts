import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Room } from '@/lib/models/Room';

export async function POST(request: Request) {
  try {
    const { roomCode, playerName } = await request.json();

    if (!roomCode || !playerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const room = await Room.findOne({ roomCode });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.gameStatus !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    // Check if player already exists
    const playerExists = room.players.find((p: any) => p.name === playerName);
    if (!playerExists) {
      // Starting balance should be the same as the dealer's or the first player's balance
      const startingBalance = room.players[0]?.balance || 1000;
      room.players.push({
        name: playerName,
        balance: startingBalance,
        status: 'active',
        currentBet: 0
      });
      await room.save();
    }

    return NextResponse.json({ success: true, roomCode }, { status: 200 });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
