/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, QrCode, MessageSquare, Flame, HelpCircle } from "lucide-react";
import { MatchState } from "../types.js";

const themeStyles = {
  dark: {
    bg: "bg-[#0a0a0a] text-white",
    card: "bg-zinc-900/40 border-zinc-800 backdrop-blur-md",
    scoreText: "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.25)]",
    scoreBg: "bg-[#121212]/90 border-zinc-800/80",
    label: "text-zinc-400 font-mono tracking-widest",
    border: "border-zinc-800",
    accent: "text-emerald-400",
    tagLine: "text-zinc-500",
    tickerBg: "bg-zinc-900/60 border-zinc-800 text-emerald-400",
  },
  light: {
    bg: "bg-slate-50 text-slate-900",
    card: "bg-white border-slate-200/80 shadow-md",
    scoreText: "text-slate-950 font-black",
    scoreBg: "bg-slate-100 border-slate-200",
    label: "text-slate-500 font-sans font-bold tracking-wider",
    border: "border-slate-200",
    accent: "text-indigo-600",
    tagLine: "text-slate-400",
    tickerBg: "bg-indigo-50 border-indigo-100 text-indigo-700",
  },
  retro: {
    bg: "bg-[#050505] text-[#ff5500]",
    card: "bg-[#0f0702] border-[#441804] shadow-[inset_0_0_15px_rgba(255,85,0,0.05)]",
    scoreText: "text-[#ff3c00] font-mono tracking-tighter filter drop-shadow-[0_0_10px_rgba(255,60,0,0.5)] uppercase",
    scoreBg: "bg-[#000000] border-[#311103]",
    label: "text-[#ffa600] font-mono uppercase tracking-widest font-bold",
    border: "border-[#2d1105]",
    accent: "text-[#ffd400] drop-shadow-[0_0_5px_rgba(255,212,0,0.3)]",
    tagLine: "text-[#55220c] font-mono",
    tickerBg: "bg-[#0f0702] border-[#2d1105] text-[#ffa600] font-mono",
  },
};

export default function Display() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<MatchState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  // Core WS reference
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;

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
          // Auto-migrate display to final result page
          navigate(`/result/${roomId}`);
        } else if (type === "ERROR") {
          setErrorMsg(payload);
        }
      } catch (err) {
        console.error("Failed parsing display WS message:", err);
      }
    };

    socket.onclose = () => {
      console.log("Display WS disconnected. Attempting reconnect...");
    };

    return () => {
      socket.close();
    };
  }, [roomId, navigate]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-black text-[#ff3c00] font-mono flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-600 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold uppercase tracking-wider">ERROR DETECTED</h1>
        <p className="text-slate-400 font-sans mt-2">{errorMsg}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-2 border border-[#ff3c00] rounded hover:bg-[#ff3c00] hover:text-black font-semibold transition"
        >
          KEMBALI KE BERANDA
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs tracking-wider text-emerald-400 uppercase">MENGHUBUNGKAN DISPLAY KE ROOM {roomId}...</p>
      </div>
    );
  }

  const currentTheme = room.theme || "dark";
  const styles = themeStyles[currentTheme] || themeStyles.dark;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // QR share target url represents the spectator screen
  const specShareUrl = window.location.href;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=090d16&data=${encodeURIComponent(
    specShareUrl
  )}`;

  return (
    <div className={`min-h-screen ${styles.bg} transition-colors duration-500 p-6 flex flex-col justify-between font-sans relative select-none`}>
      {/* Background neon glows for dark/retro themes */}
      {currentTheme !== "light" && (
        <>
          <div className="absolute top-[15%] left-[20%] w-[30vw] h-[30vh] bg-yellow-500/5 rounded-full blur-[140px] pointer-events-none"></div>
          <div className="absolute top-[15%] right-[20%] w-[30vw] h-[30vh] bg-orange-600/5 rounded-full blur-[140px] pointer-events-none"></div>
        </>
      )}

      {/* Arena Display Header */}
      <header className="flex items-center justify-between z-10 max-w-7xl mx-auto w-full">
        <div>
          <span className={`text-[10px] uppercase tracking-widest block font-bold ${styles.tagLine} font-mono`}>
            LIVE SCOREBOARD MONITOR
          </span>
          <h2 className={`text-xl md:text-2xl font-bold font-sans flex items-center gap-2 tracking-tight ${currentTheme === 'retro' ? 'text-[#ff5500]' : 'text-slate-500'}`}>
            Score<span className={currentTheme === 'retro' ? 'text-[#ffd400]' : 'text-orange-500'}>Wave</span>
            <span className="text-xs font-mono uppercase bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
              LIVE
            </span>
          </h2>
        </div>

        {/* QR Code Trigger and Info */}
        <div className="relative">
          <button
            onClick={() => setShowQr(!showQr)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer hover:scale-[1.03] transition-all ${
              currentTheme === "retro"
                ? "bg-black border-[#ff5510] text-[#ffa600]"
                : currentTheme === "light"
                ? "bg-white border-slate-200 text-slate-700 shadow-sm"
                : "bg-zinc-900 border-zinc-800 text-white"
            }`}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            Scan QR Penonton
          </button>

          {/* Floater overlay pop for QR Code popup */}
          <AnimatePresence>
            {showQr && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 bg-white text-zinc-900 p-5 rounded-2xl shadow-2xl border border-slate-100 z-50 flex flex-col items-center justify-center w-64 text-center"
              >
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  referrerPolicy="no-referrer"
                  className="w-44 h-44 border border-zinc-100 rounded-lg"
                />
                <span className="text-[11px] font-sans font-bold text-slate-800 tracking-tight mt-3 block">
                  Scan Dengan HP Penonton
                </span>
                <span className="text-[10px] text-slate-500 leading-normal block mt-1 font-sans">
                  Saksikan papan skor real-time ini tetap singkron langsung di layar ponsel Anda!
                </span>
                <button
                  onClick={() => setShowQr(false)}
                  className="text-[10px] uppercase font-bold tracking-wider text-orange-500 hover:underline mt-3 cursor-pointer"
                >
                  Tutup Panel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* MAIN SCREENBOARD STAGE */}
      <main className="max-w-7xl mx-auto w-full z-10 my-auto py-6">
        <div className={`border-2 rounded-[36px] ${styles.card} p-8 md:p-12 relative overflow-hidden flex flex-col justify-between min-h-[440px] md:min-h-[500px]`}>
          
          {/* Centered Sport specific indicator */}
          <div className="text-center absolute top-4 left-1/2 transform -translate-x-1/2">
            <span className={`text-[10px] uppercase tracking-[0.25em] font-mono leading-none font-bold ${styles.tagLine}`}>
              {room.sport} CHAMPIONSHIP
            </span>
          </div>

          <div className="grid grid-cols-12 items-center gap-4 my-auto">
            {/* TEAM A MODULE (Cols 5) */}
            <div className="col-span-5 flex flex-col items-center text-center space-y-4">
              <div className="flex justify-center flex-col items-center">
                {room.logoA ? (
                  <img
                    src={room.logoA}
                    alt={room.teamA}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 md:w-28 md:h-28 object-cover rounded-full border-2 border-slate-700/40 p-1 bg-zinc-950"
                  />
                ) : (
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-slate-800/80 flex items-center justify-center font-extrabold text-white text-3xl uppercase tracking-tighter shadow-inner">
                    A
                  </div>
                )}
                <h3 className="font-extrabold text-2xl md:text-4xl mt-3 tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300">
                  {room.teamA}
                </h3>
              </div>

              {/* Bonus Indicator / Service Indicator */}
              <div className="flex items-center gap-2">
                {room.sport === "volleyball" && room.serving === "teamA" && (
                  <span className="text-[10px] uppercase bg-yellow-500 text-black px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span> Servis
                  </span>
                )}
                {room.sport === "badminton" && room.serving === "teamA" && (
                  <span className="text-[10px] uppercase bg-yellow-500 text-black px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span> Servis
                  </span>
                )}
                {room.sport === "basketball" && room.foulA !== undefined && room.foulA >= 5 && (
                  <span className="text-[10px] uppercase bg-red-600 text-white px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider animate-pulse">
                    Foul Bonus
                  </span>
                )}
              </div>

              {/* Score card A */}
              <div className={`rounded-3xl border-2 ${styles.scoreBg} w-full py-8 md:py-12 relative overflow-hidden flex items-center justify-center shadow-lg min-h-[140px] md:min-h-[180px]`}>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={room.scoreA}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`text-6xl md:text-8xl select-none font-bold leading-none ${styles.scoreText} ${
                      currentTheme === "retro" ? "font-mono" : "font-sans"
                    }`}
                  >
                    {room.scoreA}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Supplementary details bottom of Team A */}
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                {room.sport === "volleyball" && (
                  <>
                    <span className={`px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono`}>
                      Set Menang: {room.setA}
                    </span>
                    <span className={`px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-mono`}>
                      Timeout: {room.volleyballTimeoutsA}
                    </span>
                  </>
                )}
                {room.sport === "badminton" && (
                  <span className={`px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono`}>
                    Game Menang: {room.gameA}
                  </span>
                )}
                {room.sport === "basketball" && (
                  <>
                    <span className={`px-2 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-800 font-mono`}>
                      T: {room.timeoutA}
                    </span>
                    <span className={`px-2 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-800 font-mono`}>
                      Foul: {room.foulA}
                    </span>
                  </>
                )}
                {room.sport === "futsal" && (
                  <>
                    {room.yellowA! > 0 && (
                      <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold font-mono">
                        Y: {room.yellowA}
                      </span>
                    )}
                    {room.redA! > 0 && (
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold font-mono">
                        R: {room.redA}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* CENTER TRANSIT TIMERS AND STATS (Cols 2) */}
            <div className="col-span-2 flex flex-col items-center justify-center text-center space-y-4">
              <span className={`text-xs uppercase font-mono tracking-widest font-bold ${styles.tagLine}`}>
                {room.sport === "basketball" && `Quarter ${room.quarter === 5 ? "OT" : room.quarter}`}
                {room.sport === "futsal" && room.period}
                {room.sport === "volleyball" && `Set ${room.setA! + room.setB! + 1}`}
                {room.sport === "badminton" && `Game ${room.gameA! + room.gameB! + 1}`}
              </span>

              {/* Divider lines representing LED scores */}
              <div className={`w-8 h-1 rounded ${currentTheme === "retro" ? "bg-[#ff5500]/40" : "bg-slate-400/20"}`}></div>

              {/* Live Ticking Monitor */}
              {(room.sport === "basketball" || room.sport === "futsal") ? (
                <div className={`text-3xl md:text-5xl font-mono tracking-tighter font-extrabold flex items-center justify-center ${
                  room.timerRunning && currentTheme === "retro" 
                    ? "text-[#ff3c00] animate-pulse" 
                    : room.timerRunning 
                    ? styles.accent 
                    : "text-slate-500"
                }`}>
                  {formatTime(room.time)}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className={`text-xs font-mono font-bold uppercase tracking-widest ${styles.accent}`}>
                    Voli/BuluT
                  </div>
                  <span className={`text-[10px] uppercase font-mono mt-1 ${styles.tagLine}`}>
                    Rally Point
                  </span>
                </div>
              )}

              {/* Status Tag */}
              <div className="space-y-1">
                {room.ended ? (
                  <span className="inline-block text-[10px] uppercase bg-green-500 text-black font-extrabold px-3 py-1 rounded-full animate-bounce tracking-wider">
                    SELESAI
                  </span>
                ) : room.timerRunning ? (
                  <span className={`inline-block text-[9px] uppercase font-bold tracking-wider font-mono ${styles.accent}`}>
                    ● LIVE PLAYING
                  </span>
                ) : (
                  <span className="inline-block text-[9px] uppercase font-bold tracking-wider font-mono text-slate-500">
                    ⏸ PAUSED
                  </span>
                )}
              </div>
            </div>

            {/* TEAM B MODULE (Cols 5) */}
            <div className="col-span-5 flex flex-col items-center text-center space-y-4">
              <div className="flex justify-center flex-col items-center">
                {room.logoB ? (
                  <img
                    src={room.logoB}
                    alt={room.teamB}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 md:w-28 md:h-28 object-cover rounded-full border-2 border-slate-700/40 p-1 bg-zinc-950"
                  />
                ) : (
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-slate-800/80 flex items-center justify-center font-extrabold text-white text-3xl uppercase tracking-tighter shadow-inner">
                    B
                  </div>
                )}
                <h3 className="font-extrabold text-2xl md:text-4xl mt-3 tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300">
                  {room.teamB}
                </h3>
              </div>

              {/* Service Indicator / Bonus Badge */}
              <div className="flex items-center gap-2">
                {room.sport === "volleyball" && room.serving === "teamB" && (
                  <span className="text-[10px] uppercase bg-yellow-500 text-black px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span> Servis
                  </span>
                )}
                {room.sport === "badminton" && room.serving === "teamB" && (
                  <span className="text-[10px] uppercase bg-yellow-500 text-black px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span> Servis
                  </span>
                )}
                {room.sport === "basketball" && room.foulB !== undefined && room.foulB >= 5 && (
                  <span className="text-[10px] uppercase bg-red-600 text-white px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider animate-pulse">
                    Foul Bonus
                  </span>
                )}
              </div>

              {/* Score card B */}
              <div className={`rounded-3xl border-2 ${styles.scoreBg} w-full py-8 md:py-12 relative overflow-hidden flex items-center justify-center shadow-lg min-h-[140px] md:min-h-[180px]`}>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={room.scoreB}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`text-6xl md:text-8xl select-none font-bold leading-none ${styles.scoreText} ${
                      currentTheme === "retro" ? "font-mono" : "font-sans"
                    }`}
                  >
                    {room.scoreB}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Supplementary details bottom of Team B */}
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                {room.sport === "volleyball" && (
                  <>
                    <span className={`px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono`}>
                      Set Menang: {room.setB}
                    </span>
                    <span className={`px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-mono`}>
                      Timeout: {room.volleyballTimeoutsB}
                    </span>
                  </>
                )}
                {room.sport === "badminton" && (
                  <span className={`px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono`}>
                    Game Menang: {room.gameB}
                  </span>
                )}
                {room.sport === "basketball" && (
                  <>
                    <span className={`px-2 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-800 font-mono`}>
                      T: {room.timeoutB}
                    </span>
                    <span className={`px-2 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-800 font-mono`}>
                      Foul: {room.foulB}
                    </span>
                  </>
                )}
                {room.sport === "futsal" && (
                  <>
                    {room.yellowB! > 0 && (
                      <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold font-mono">
                        Y: {room.yellowB}
                      </span>
                    )}
                    {room.redB! > 0 && (
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold font-mono">
                        R: {room.redB}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER SCROLLING COMPASS COMMENTARY TICKER */}
      <footer className="z-10 max-w-7xl mx-auto w-full mt-4">
        <div className={`rounded-2xl border p-4 shadow-inner overflow-hidden relative flex items-center gap-4 ${styles.tickerBg}`}>
          <div className="flex items-center gap-1 text-xs uppercase font-extrabold font-mono border-r border-current pr-4 shrink-0 tracking-widest">
            <MessageSquare className="w-4 h-4 fill-current text-orange-500 animate-bounce" />
            Live Commentary
          </div>

          {/* Clean Horizontal Sliding Marquee */}
          <div className="overflow-hidden w-full relative h-[25px] flex items-center select-none whitespace-nowrap">
            <style>{`
              @keyframes slideTicker {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
              .sliding-item {
                display: inline-block;
                animation: slideTicker 18s linear infinite;
              }
            `}</style>
            <div className="sliding-item w-full pl-[5%] font-sans font-medium text-xs md:text-sm">
              &ldquo;{room.commentary || "Selamat datang di ScoreWave! Pertandingan akan disiarkan langsung secara penuh kemitraan cerdas."}&rdquo;
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
