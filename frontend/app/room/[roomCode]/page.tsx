"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

let socket: Socket;

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const [playerName, setPlayerName] = useState<string | null>(null);
  
  const [roomState, setRoomState] = useState<any>(null);
  const [raiseAmount, setRaiseAmount] = useState("");
  const [winnerName, setWinnerName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("playerName");
    if (!name) {
      router.push("/");
      return;
    }
    setPlayerName(name);

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000");

    socket.on("connect", () => {
      console.log("Connected to socket server");
      socket.emit("joinRoom", { roomCode, playerName: name });
    });

    socket.on("roomUpdated", (roomData) => {
      setRoomState(roomData);
    });

    socket.on("error", (msg) => {
      alert(msg);
      router.push("/");
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode, router]);

  if (!roomState || !playerName) {
    return <div className="flex h-screen items-center justify-center">Loading game state...</div>;
  }

  const isDealer = roomState.dealerId === playerName;
  const me = roomState.players.find((p: any) => p.name === playerName);
  const myTurnIndex = roomState.players.findIndex((p: any) => p.name === playerName);
  const isMyTurn = roomState.currentTurn === myTurnIndex && roomState.gameStatus === "playing" && me?.status === "active";
  
  const toCallAmount = Math.max(0, roomState.currentBid - (me?.currentBet || 0));

  const handleStartGame = () => {
    socket.emit("startGame", { roomCode, dealerName: playerName });
  };

  const handleAction = (action: "call" | "raise" | "fold") => {
    if (action === "raise" && !raiseAmount) return;
    socket.emit("playerAction", {
      roomCode,
      playerName,
      action,
      amount: action === "raise" ? parseInt(raiseAmount) : 0
    });
    setRaiseAmount("");
  };

  const handleNextRound = () => {
    socket.emit("nextRound", { roomCode, dealerName: playerName });
  };

  const handleSelectWinner = () => {
    if (!winnerName) return;
    socket.emit("selectWinner", { roomCode, dealerName: playerName, winnerName });
    setWinnerName("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Room: <span className="text-primary">{roomCode}</span></h1>
            <p className="text-muted-foreground">Round: {roomState.round}/4 | Status: <span className="uppercase text-xs font-semibold tracking-wider">{roomState.gameStatus}</span></p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Pot</p>
            <p className="text-4xl font-bold text-primary">${roomState.pot}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Players List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Players</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {roomState.players.map((player: any, idx: number) => {
                const isTurn = roomState.currentTurn === idx && roomState.gameStatus === "playing";
                return (
                  <Card key={idx} className={`relative overflow-hidden transition-all ${isTurn ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-border opacity-90'}`}>
                    {isTurn && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary animate-pulse" />
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {player.name} {player.name === roomState.dealerId && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">Dealer</span>}
                          </CardTitle>
                          <CardDescription>
                            Status: <span className={player.status === 'folded' ? 'text-destructive' : 'text-primary'}>{player.status}</span>
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xl">${player.balance}</p>
                          <p className="text-xs text-muted-foreground">Bet: ${player.currentBet}</p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Your Actions</CardTitle>
                <CardDescription>Current Bid: <strong className="text-primary">${roomState.currentBid}</strong></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {roomState.gameStatus === "waiting" ? (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Waiting for dealer to start...</p>
                  </div>
                ) : roomState.gameStatus === "finished" ? (
                  <div className="text-center p-4 bg-primary/10 text-primary rounded-lg">
                    <p className="font-bold">Round Finished!</p>
                  </div>
                ) : isMyTurn ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleAction("fold")} variant="destructive" className="w-full font-bold">FOLD</Button>
                      <Button onClick={() => handleAction("call")} variant="secondary" className="w-full font-bold">
                        {toCallAmount > 0 ? `CALL $${toCallAmount}` : "CHECK"}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Raise amount" 
                        value={raiseAmount}
                        onChange={(e) => setRaiseAmount(e.target.value)}
                        min="1"
                      />
                      <Button onClick={() => handleAction("raise")} className="font-bold">RAISE</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Wait for your turn...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dealer Controls */}
            {isDealer && (
              <Card className="border-secondary">
                <CardHeader>
                  <CardTitle className="text-lg">Dealer Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(roomState.gameStatus === "waiting" || roomState.gameStatus === "finished") && (
                    <Button onClick={handleStartGame} className="w-full" variant="default">
                      {roomState.gameStatus === "finished" ? "Start New Game" : "Start Game"}
                    </Button>
                  )}
                  {roomState.gameStatus === "playing" && (
                    <Button onClick={handleNextRound} className="w-full" variant="outline">Force Next Round</Button>
                  )}
                  {(roomState.gameStatus === "playing" || (roomState.gameStatus === "finished" && roomState.pot > 0)) && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-border">
                      <p className="text-sm font-medium">Select Winner</p>
                      <div className="flex gap-2">
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={winnerName}
                          onChange={(e) => setWinnerName(e.target.value)}
                        >
                          <option value="">Select a player...</option>
                          {roomState.players.map((p: any) => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        <Button onClick={handleSelectWinner} size="sm" variant="secondary">Award Pot</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
