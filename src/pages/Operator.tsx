/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Play, Pause, RotateCcw, AlertTriangle, ArrowRight, Share2, 
  ExternalLink, Copy, Check, MessageSquare, ListCollapse, Award
} from "lucide-react";
import { MatchState, SportType } from "../types.js";

export default function Operator() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<MatchState | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSeconds, setManualSeconds] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Initialize and maintain WebSocket connection
  useEffect(() => {
    if (!roomId) return;

    // Secure or non-secure depending on active frame URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "JOIN_ROOM", payload: { roomId } }));
    };

    socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        if (type === "ROOM_STATE") {
          setRoom(payload);
          setErrorMsg(null);
        } else if (type === "TIMER_UPDATE") {
          setRoom((prev) => 
            prev ? { ...prev, time: payload.time, timerRunning: payload.running } : null
          );
        } else if (type === "COMMENTARY") {
          setRoom((prev) => 
            prev ? { ...prev, commentary: payload.text } : null
          );
        } else if (type === "MATCH_END") {
          setRoom((prev) => 
            prev ? { ...prev, ended: true, summary: payload.summary } : null
          );
          // Navigate to result on ending
          navigate(`/result/${roomId}`);
        } else if (type === "ERROR") {
          setErrorMsg(payload);
        }
      } catch (err) {
        console.error("Failed to parse WS data:", err);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed. Retrying soon...");
    };

    return () => {
      socket.close();
    };
  }, [roomId, navigate]);

  const sendAction = (type: string, payload?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  const copyDisplayUrl = () => {
    const displayUrl = `${window.location.origin}/display/${roomId}`;
    navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold">Terjadi Gangguan</h1>
        <p className="text-slate-400 mt-2">{errorMsg}</p>
        <button 
          onClick={() => navigate("/")} 
          className="mt-6 px-6 py-2.5 bg-orange-500 rounded-xl hover:bg-orange-600 font-semibold cursor-pointer"
        >
          Kembali ke Home
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-mono">Menyambungkan ke Sinyal Arena...</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleManualTimerSet = (e: React.FormEvent) => {
    e.preventDefault();
    const mm = parseInt(manualMinutes) || 0;
    const ss = parseInt(manualSeconds) || 0;
    const totalSecs = mm * 60 + ss;
    sendAction("MODIFY_TIMER", { action: "set", value: totalSecs });
    setManualMinutes("");
    setManualSeconds("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner Control Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold uppercase text-xs">
            {room.sport === "basketball" && "🏀"}
            {room.sport === "volleyball" && "🏐"}
            {room.sport === "futsal" && "⚽"}
            {room.sport === "badminton" && "🏸"}
          </div>
          <div>
            <h1 className="font-extrabold text-base flex items-center gap-1.5 leading-none">
              ScoreWave Operator Panel
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-700/50">
                Live
              </span>
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              ROOM ID: {room.roomId} &bull; Sport: <span className="capitalize">{room.sport}</span>
            </span>
          </div>
        </div>

        {/* Display links & quick shares */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyDisplayUrl}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-755 hover:text-white rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            Salin Display URL
          </button>
          <a
            href={`/display/${room.roomId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-755 hover:text-white rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            Buka Display <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Grid: Left Controls, Right Timeline Event Logs & Ticker */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3">
        {/* Core Control Board Panel (Col-span 2) */}
        <div className="lg:col-span-2 p-6 overflow-y-auto space-y-6">
          {/* Main Scoreboard Representation */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
            {/* Theme & Sport Overlay badge */}
            <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              Tema: <span className="uppercase text-blue-400 font-bold">{room.theme}</span>
            </div>

            <div className="grid grid-cols-3 items-center text-center">
              {/* Team A */}
              <div className="space-y-2">
                <div className="flex justify-center mb-1">
                  {room.logoA ? (
                    <img src={room.logoA} alt="logo A" className="w-12 h-12 object-cover rounded-full border border-slate-700 p-0.5 bg-slate-950" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 uppercase">A</div>
                  )}
                </div>
                <h3 className="font-bold text-lg md:text-xl text-orange-400 truncate tracking-tight">{room.teamA}</h3>
                
                {/* Secondary indicators (Volleyball Sets / Badminton Games) */}
                {room.sport === "volleyball" && (
                  <span className="inline-block text-xs uppercase font-semibold font-mono bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded text-blue-400">
                    Set Menang: {room.setA}
                  </span>
                )}
                {room.sport === "badminton" && (
                  <span className="inline-block text-xs uppercase font-semibold font-mono bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded text-violet-400">
                    Game Menang: {room.gameA}
                  </span>
                )}
              </div>

              {/* Center Match Status/Timer */}
              <div className="flex flex-col items-center justify-center">
                {room.sport === "basketball" && (
                  <span className="text-xs uppercase tracking-widest text-slate-500 font-mono font-bold mb-1">
                    Quarter {room.quarter === 5 ? "OT" : room.quarter}
                  </span>
                )}
                {room.sport === "futsal" && (
                  <span className="text-xs uppercase tracking-widest text-slate-500 font-mono font-bold mb-1">
                    {room.period}
                  </span>
                )}
                {room.sport === "volleyball" && (
                  <span className="text-xs uppercase tracking-widest text-slate-500 font-mono font-bold mb-1">
                    Set Tracker
                  </span>
                )}
                {room.sport === "badminton" && (
                  <span className="text-xs uppercase tracking-widest text-slate-500 font-mono font-bold mb-1">
                    Match Tracker
                  </span>
                )}

                {/* Main Timer Display */}
                {(room.sport === "basketball" || room.sport === "futsal") ? (
                  <div className="text-4xl md:text-5xl font-mono tracking-tight font-extrabold text-white">
                    {formatTime(room.time)}
                  </div>
                ) : (
                  <div className="text-slate-600 font-mono text-sm uppercase font-semibold tracking-wider">
                    Auto-regulated
                  </div>
                )}

                {/* Sub status details */}
                {room.serving && (
                  <div className="mt-2 text-xs text-yellow-400 animate-pulse font-mono uppercase bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                    Servis: {room.serving === "teamA" ? room.teamA : room.teamB}
                  </div>
                )}
              </div>

              {/* Team B */}
              <div className="space-y-2">
                <div className="flex justify-center mb-1">
                  {room.logoB ? (
                    <img src={room.logoB} alt="logo B" className="w-12 h-12 object-cover rounded-full border border-slate-700 p-0.5 bg-slate-950" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 uppercase">B</div>
                  )}
                </div>
                <h3 className="font-bold text-lg md:text-xl text-blue-400 truncate tracking-tight">{room.teamB}</h3>
                
                {/* Secondary indicators */}
                {room.sport === "volleyball" && (
                  <span className="inline-block text-xs uppercase font-semibold font-mono bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded text-blue-400">
                    Set Menang: {room.setB}
                  </span>
                )}
                {room.sport === "badminton" && (
                  <span className="inline-block text-xs uppercase font-semibold font-mono bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded text-violet-400">
                    Game Menang: {room.gameB}
                  </span>
                )}
              </div>
            </div>

            {/* Neon Ticker Representation on Board */}
            <div className="mt-6 bg-slate-950 border border-slate-800 py-3.5 px-4 rounded-xl flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="overflow-hidden relative w-full">
                <span className="text-xs font-mono text-emerald-400 block whitespace-nowrap">
                  Komentar AI: &ldquo;{room.commentary}&rdquo;
                </span>
              </div>
            </div>
          </div>

          {/* Controls Per Sport */}
          <div>
            <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-500 mb-3">
              PANEL KONTROL SKOR & PERMAINAN
            </h2>

            {/* Score Actions Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-850 p-6 rounded-3xl">
              {/* TIM A (Kiri) Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold truncate text-orange-400">{room.teamA}</span>
                  <div className="text-3xl font-extrabold font-mono text-white bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                    {room.scoreA}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {room.sport === "basketball" ? (
                    <>
                      <button
                        onClick={() => sendAction("UPDATE_SCORE", { team: "A", diff: 1 })}
                        className="flex-1 min-w-[50px] bg-slate-800 hover:bg-slate-700 hover:text-white py-3.5 rounded-xl font-bold font-mono text-sm cursor-pointer border border-slate-700 transition"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => sendAction("UPDATE_SCORE", { team: "A", diff: 2 })}
                        className="flex-1 min-w-[50px] bg-slate-800 hover:bg-slate-700 hover:text-white py-3.5 rounded-xl font-bold font-mono text-sm cursor-pointer border border-slate-700 transition"
                      >
                        +2
                      </button>
                      <button
                        onClick={() => sendAction("UPDATE_SCORE", { team: "A", diff: 3 })}
                        className="flex-1 min-w-[50px] bg-slate-800 hover:bg-slate-700 hover:text-white py-3.5 rounded-xl font-bold font-mono text-sm cursor-pointer border border-slate-700 transition"
                      >
                        +3
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => sendAction("UPDATE_SCORE", { team: "A", diff: 1 })}
                      className="w-full bg-slate-800 hover:bg-slate-700 hover:text-white py-4 rounded-xl font-extrabold font-mono text-base cursor-pointer border border-slate-700 transition"
                    >
                      Poin (+1)
                    </button>
                  )}
                </div>

                {/* Serving Buttons Volleyball/Badminton */}
                {(room.sport === "volleyball" || room.sport === "badminton") && (
                  <button
                    onClick={() => sendAction("UPDATE_SERVING", { team: "A" })}
                    disabled={room.serving === "teamA"}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      room.serving === "teamA"
                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    Atur Servis: {room.teamA}
                  </button>
                )}

                {/* Team A timeouts / fouls */}
                {room.sport === "basketball" && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-slate-500 mb-1">Timeouts (Sisa {room.timeoutA})</span>
                      <button
                        onClick={() => sendAction("USE_TIMEOUT", { team: "A" })}
                        disabled={room.timeoutA === 0}
                        className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                      >
                        Kurangi Timeout (-1)
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-slate-500 mb-1">Fouls ({room.foulA})</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => sendAction("UPDATE_FOUL", { team: "A", diff: 1 })}
                          className="flex-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold cursor-pointer transition"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => sendAction("UPDATE_FOUL", { team: "A", diff: -1 })}
                          className="flex-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold cursor-pointer transition"
                        >
                          -1
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Volleyball Set Timeouts */}
                {room.sport === "volleyball" && (
                  <div>
                    <span className="text-[10px] uppercase font-mono block text-slate-500 mb-1">Set Timeouts (Sisa {room.volleyballTimeoutsA})</span>
                    <button
                      onClick={() => sendAction("USE_TIMEOUT", { team: "A" })}
                      disabled={room.volleyballTimeoutsA === 0}
                      className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-850 text-slate-300 disabled:opacity-30 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                    >
                      Ambil Timeout (-1)
                    </button>
                  </div>
                )}

                {/* Futsal Cards */}
                {room.sport === "futsal" && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-yellow-500 mb-1 font-bold">K. Kuning ({room.yellowA})</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => sendAction("UPDATE_CARDS", { team: "A", card: "yellow", diff: 1 })}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          onClick={() => sendAction("UPDATE_CARDS", { team: "A", card: "yellow", diff: -1 })}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold cursor-pointer"
                        >
                          -
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-red-500 mb-1 font-bold">K. Merah ({room.redA})</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => sendAction("UPDATE_CARDS", { team: "A", card: "red", diff: 1 })}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          onClick={() => sendAction("UPDATE_CARDS", { team: "A", card: "red", diff: -1 })}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold cursor-pointer"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* TIM B (Kanan) Controls */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold truncate text-blue-400">{room.teamB}</span>
                  <div className="text-3xl font-extrabold font-mono text-white bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                    {room.scoreB}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {room.sport === "basketball" ? (
                    <>
                      <button
                        onClick={() => sendAction("UPDATE_SCORE", { team: "B", diff: 1 })}
                        className="flex-1 min-w-[50px] bg-slate-800 hover:bg-slate-700 hover:text-white py-3.5 rounded-xl font-bold font-mono text-sm cursor-pointer border border-slate-700 transition"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => sendAction("UPDATE_SCORE", { team: "B", diff: 2 })}
                        className="flex-1 min-w-[50px] bg-slate-800 hover:bg-slate-700 hover:text-white py-3.5 rounded-xl font-bold font-mono text-sm cursor-pointer border border-slate-700 transition"
                      >
                        +2
                      </button>
                      <button
                        onClick={() => sendAction("UPDATE_SCORE", { team: "B", diff: 3 })}
                        className="flex-1 min-w-[50px] bg-slate-800 hover:bg-slate-700 hover:text-white py-3.5 rounded-xl font-bold font-mono text-sm cursor-pointer border border-slate-700 transition"
                      >
                        +3
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => sendAction("UPDATE_SCORE", { team: "B", diff: 1 })}
                      className="w-full bg-slate-800 hover:bg-slate-700 hover:text-white py-4 rounded-xl font-extrabold font-mono text-base cursor-pointer border border-slate-700 transition"
                    >
                      Poin (+1)
                    </button>
                  )}
                </div>

                {/* Serving Buttons Volleyball/Badminton */}
                {(room.sport === "volleyball" || room.sport === "badminton") && (
                  <button
                    onClick={() => sendAction("UPDATE_SERVING", { team: "B" })}
                    disabled={room.serving === "teamB"}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      room.serving === "teamB"
                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    Atur Servis: {room.teamB}
                  </button>
                )}

                {/* Team B timeouts / fouls */}
                {room.sport === "basketball" && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-slate-500 mb-1">Timeouts (Sisa {room.timeoutB})</span>
                      <button
                        onClick={() => sendAction("USE_TIMEOUT", { team: "B" })}
                        disabled={room.timeoutB === 0}
                        className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                      >
                        Kurangi Timeout (-1)
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-slate-500 mb-1">Fouls ({room.foulB})</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => sendAction("UPDATE_FOUL", { team: "B", diff: 1 })}
                          className="flex-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold cursor-pointer transition"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => sendAction("UPDATE_FOUL", { team: "B", diff: -1 })}
                          className="flex-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold cursor-pointer transition"
                        >
                          -1
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Volleyball Set Timeouts */}
                {room.sport === "volleyball" && (
                  <div>
                    <span className="text-[10px] uppercase font-mono block text-slate-500 mb-1">Set Timeouts (Sisa {room.volleyballTimeoutsB})</span>
                    <button
                      onClick={() => sendAction("USE_TIMEOUT", { team: "B" })}
                      disabled={room.volleyballTimeoutsB === 0}
                      className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-850 text-slate-300 disabled:opacity-30 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                    >
                      Ambil Timeout (-1)
                    </button>
                  </div>
                )}

                {/* Futsal Cards */}
                {room.sport === "futsal" && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-yellow-500 mb-1 font-bold">K. Kuning ({room.yellowB})</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => sendAction("UPDATE_CARDS", { team: "B", card: "yellow", diff: 1 })}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          onClick={() => sendAction("UPDATE_CARDS", { team: "B", card: "yellow", diff: -1 })}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold cursor-pointer"
                        >
                          -
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-red-500 mb-1 font-bold">K. Merah ({room.redB})</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => sendAction("UPDATE_CARDS", { team: "B", card: "red", diff: 1 })}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          onClick={() => sendAction("UPDATE_CARDS", { team: "B", card: "red", diff: -1 })}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold cursor-pointer"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Undo Score Button */}
            <div className="mt-3 text-right">
              <button
                onClick={() => sendAction("UNDO_SCORE")}
                disabled={room.history.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg disabled:opacity-30 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Undo Poin Terakhir
              </button>
            </div>
          </div>

          {/* Timers & Period Controllers */}
          {(room.sport === "basketball" || room.sport === "futsal") && (
            <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Direct timer triggers */}
              <div>
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-500 block mb-3">TIMER CONTROLLER</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => sendAction("TOGGLE_TIMER", !room.timerRunning)}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm ${
                      room.timerRunning
                        ? "bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {room.timerRunning ? <><Pause className="w-4 h-4 fill-current" /> Pause Timer</> : <><Play className="w-4 h-4 fill-current" /> Start Timer</>}
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  <button
                    onClick={() => sendAction("MODIFY_TIMER", { action: "add", value: 60 })}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded border border-slate-700 cursor-pointer"
                  >
                    +1m
                  </button>
                  <button
                    onClick={() => sendAction("MODIFY_TIMER", { action: "subtract", value: 60 })}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded border border-slate-700 cursor-pointer"
                  >
                    -1m
                  </button>
                  <button
                    onClick={() => sendAction("MODIFY_TIMER", { action: "add", value: 10 })}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded border border-slate-700 cursor-pointer"
                  >
                    +10s
                  </button>
                  <button
                    onClick={() => sendAction("MODIFY_TIMER", { action: "subtract", value: 10 })}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded border border-slate-700 cursor-pointer"
                  >
                    -10s
                  </button>
                </div>

                {/* Direct Manual Entry */}
                <form onSubmit={handleManualTimerSet} className="mt-4 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    placeholder="Min"
                    className="w-16 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-center font-mono text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                  />
                  <span className="font-mono text-xs text-slate-600">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualSeconds}
                    onChange={(e) => setManualSeconds(e.target.value)}
                    placeholder="Det"
                    className="w-16 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-center font-mono text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-semibold cursor-pointer text-slate-300"
                  >
                    Atur
                  </button>
                </form>
              </div>

              {/* Right Column: Period Updates */}
              <div>
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-500 block mb-3">BABAK / PERIOD TRACKER</span>
                {room.sport === "basketball" ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4, 5].map((qNum) => (
                      <button
                        key={qNum}
                        onClick={() => sendAction("UPDATE_PERIOD", { period: qNum })}
                        className={`py-2 px-3 text-xs font-semibold rounded border cursor-pointer capitalize ${
                          room.quarter === qNum
                            ? "bg-slate-750 border-orange-500 text-orange-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {qNum === 5 ? "Overtime" : `Quarter ${qNum}`}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(["1st Half", "2nd Half", "Extra Time"] as const).map((per) => (
                      <button
                        key={per}
                        onClick={() => sendAction("UPDATE_PERIOD", { period: per })}
                        className={`py-2.5 px-3 text-xs font-semibold rounded border cursor-pointer capitalize text-left ${
                          room.period === per
                            ? "bg-slate-750 border-emerald-500 text-emerald-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {per === "1st Half" && "Babak Pertama (1st Half)"}
                        {per === "2nd Half" && "Babak Kedua (2nd Half)"}
                        {per === "Extra Time" && "Perpanjangan Waktu (Extra Time)"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Match Logs Timeline & AI Command triggers (Col-span 1) */}
        <div className="bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col p-6 space-y-6">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-500 block mb-3 flex items-center gap-1.5">
              <ListCollapse className="w-3.5 h-3.5" /> LOG JALANNYA LAGA (REALTIME)
            </span>
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl h-80 overflow-y-auto space-y-2 box-border">
              {room.eventLogs.slice().reverse().map((log, index) => (
                <div key={index} className="text-[11px] font-mono leading-relaxed border-b border-slate-900 pb-1.5 last:border-0">
                  {log.includes("Komentar AI:") ? (
                    <span className="text-emerald-400 block font-sans italic">{log}</span>
                  ) : log.includes("Skor berubah:") ? (
                    <span className="text-orange-400 block font-bold">{log}</span>
                  ) : (
                    <span className="text-slate-400 block">{log}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI summaries and match endings */}
          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5 mb-1">
                <Award className="w-4 h-4 text-orange-400" />
                Akhiri & Rekap Pertandingan
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Menyimpulkan pertandingan saat ini. Kecerdasan buatan Gemini API akan menganalisis timeline permainan dan menyusun berita rekapitulasi olahraga.
              </p>
            </div>

            {!showResetConfirm && !showEndConfirm && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="py-3 px-4 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-red-400 cursor-pointer transition text-center"
                >
                  Reset Match
                </button>
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs cursor-pointer shadow-md text-center transition-all"
                >
                  Akhiri Laga
                </button>
              </div>
            )}

            {showResetConfirm && (
              <div className="pt-2 p-3.5 bg-red-950/40 border border-red-900/30 rounded-xl space-y-3">
                <p className="text-xs text-red-300 font-sans leading-relaxed">
                  Apakah Anda yakin ingin <strong>me-reset skor dan log pertandingan kembali ke 0-0</strong>? Tindakan ini tidak bisa dibatalkan!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sendAction("RESET_ROOM");
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                  >
                    Ya, Reset Match
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold cursor-pointer transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {showEndConfirm && (
              <div className="pt-2 p-3.5 bg-orange-950/40 border border-orange-900/30 rounded-xl space-y-3">
                <p className="text-xs text-orange-300 font-sans leading-relaxed">
                  Selesaikan laga & rekap otomatis dengan Gemini? <strong>Summary berita</strong> akan langsung digenerasi oleh AI.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sendAction("END_MATCH");
                      setShowEndConfirm(false);
                    }}
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition"
                  >
                    Ya, Akhiri Laga
                  </button>
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold cursor-pointer transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
