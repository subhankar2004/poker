"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  
  // Create Room State
  const [dealerName, setDealerName] = useState("");
  const [startingBalance, setStartingBalance] = useState("1000");
  const [isCreating, setIsCreating] = useState(false);

  // Join Room State
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerName || !startingBalance) return;
    
    setIsCreating(true);
    try {
      const res = await fetch(`/api/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerName,
          startingBalance: parseInt(startingBalance)
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("playerName", dealerName);
        router.push(`/room/${data.roomCode}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !playerName) return;

    setIsJoining(true);
    try {
      const res = await fetch(`/api/join-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: roomCode.toUpperCase(),
          playerName
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("playerName", playerName);
        router.push(`/room/${roomCode.toUpperCase()}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
        
        {/* Create Room */}
        <Card className="border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-3xl text-primary">Create Room</CardTitle>
            <CardDescription>Start a new poker session as the dealer.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name (Dealer)</label>
                <Input 
                  value={dealerName} 
                  onChange={(e) => setDealerName(e.target.value)} 
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Starting Balance</label>
                <Input 
                  type="number"
                  value={startingBalance} 
                  onChange={(e) => setStartingBalance(e.target.value)} 
                  min="1"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Room"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Join Room */}
        <Card className="border-secondary/20 shadow-lg shadow-secondary/5">
          <CardHeader>
            <CardTitle className="text-3xl">Join Room</CardTitle>
            <CardDescription>Enter a room code to join an existing session.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <Input 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)} 
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Room Code</label>
                <Input 
                  value={roomCode} 
                  onChange={(e) => setRoomCode(e.target.value)} 
                  placeholder="e.g. A1B2C3"
                  className="uppercase"
                  required
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={isJoining}>
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
