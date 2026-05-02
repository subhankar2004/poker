import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Room } from '@/lib/models/Room';

export async function POST(request: Request) {
  try {
    const { dealerName, playersCount, startingBalance } = await request.json();

    if (!dealerName || !startingBalance) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Generate 6 character code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newRoom = new Room({
      roomCode,
      dealerId: dealerName, // Using name as dealerId for simplicity
      players: [{
        name: dealerName,
        balance: startingBalance,
        status: 'active',
        currentBet: 0
      }],
      pot: 0,
      currentBid: 0,
      currentTurn: 0,
      round: 1,
      gameStatus: 'waiting'
    });

    await newRoom.save();

    return NextResponse.json({ roomCode }, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
