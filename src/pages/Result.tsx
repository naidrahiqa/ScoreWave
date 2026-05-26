/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Medal, Bookmark, RefreshCw, Calendar, FileText, ArrowRight, Home, ChevronRight } from "lucide-react";
import { MatchState } from "../types.js";

export default function Result() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    fetch(`/api/rooms/${roomId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Gagal mengambil data ringkasan pertandingan.");
        }
        return res.json();
      })
      .then((data) => {
        setRoom(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(err.message || "Pertandingan tidak ditemukan.");
        setLoading(false);
      });
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-mono text-sm tracking-wider uppercase">Menghimpun Berita Pertandingan...</p>
      </div>
    );
  }

  if (errorMsg || !room) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4">
          <Bookmark className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold font-sans">Pertandingan Tidak Ditemukan</h1>
        <p className="text-slate-400 text-sm mt-2 font-sans max-w-sm">{errorMsg || "Room ID ini belum memproses pertandingan apa pun."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl hover:opacity-95 font-semibold text-sm cursor-pointer"
        >
          Kembali ke Home
        </button>
      </div>
    );
  }

  // Determine winner for headline decoration
  let statusBanner = "Laga Selesai";
  let winnerText = "";
  if (room.scoreA > room.scoreB) {
    winnerText = `${room.teamA} Menang!`;
  } else if (room.scoreB > room.scoreA) {
    winnerText = `${room.teamB} Menang!`;
  } else {
    winnerText = "Selesai Seri!";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 font-sans relative overflow-x-hidden">
      {/* Background neon splashes */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600 rounded-full blur-[140px] opacity-10 pointer-events-none"></div>

      <header className="max-w-4xl mx-auto w-full flex items-center justify-between mb-8 z-10">
        <h1 className="font-extrabold text-lg flex items-center gap-2">
          Score<span className="text-orange-400">Wave</span> Results
          <span className="text-[10px] font-mono leading-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
            Laporan AI
          </span>
        </h1>
        <button
          onClick={() => navigate("/")}
          className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5"
        >
          <Home className="w-4 h-4" /> Go to Home
        </button>
      </header>

      <main className="max-w-3xl mx-auto w-full my-auto z-10 space-y-6">
        {/* Victory Podium Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-4 right-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase font-mono tracking-wider flex items-center gap-1">
            <Medal className="w-3.5 h-3.5" />
            {winnerText}
          </div>

          <span className="text-xs font-mono uppercase tracking-widest text-slate-500 font-bold block mb-1">
            HASIL FINAL SKOR
          </span>
          <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight mb-6">
            Papan Peringkat Akhir Pertandingan
          </h2>

          <div className="grid grid-cols-11 items-center gap-4 text-center">
            {/* Team A representing logo */}
            <div className="col-span-4 space-y-2.5 flex flex-col items-center">
              {room.logoA ? (
                <img src={room.logoA} alt={room.teamA} className="w-16 h-16 object-cover rounded-full border border-slate-700 bg-slate-950 p-0.5" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center font-extrabold text-white text-lg">A</div>
              )}
              <h4 className="font-bold text-base text-orange-400 truncate w-full">{room.teamA}</h4>
              
              {/* Volleyball or Badminton secondary details */}
              {room.sport === "volleyball" && (
                <span className="text-xs uppercase font-semibold font-mono text-slate-500">
                  Sets Won: {room.setA}
                </span>
              )}
              {room.sport === "badminton" && (
                <span className="text-xs uppercase font-semibold font-mono text-slate-500">
                  Games Won: {room.gameA}
                </span>
              )}
            </div>

            {/* Score VS indicator */}
            <div className="col-span-3 flex flex-col items-center justify-center">
              <div className="text-4xl md:text-5xl font-mono font-black text-white flex items-center gap-2">
                <span>{room.scoreA}</span>
                <span className="text-slate-700 font-sans text-xl font-normal">vs</span>
                <span>{room.scoreB}</span>
              </div>
              <span className="text-[10px] uppercase font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 mt-2 text-slate-500">
                Laga {room.sport}
              </span>
            </div>

            {/* Team B representing logo */}
            <div className="col-span-4 space-y-2.5 flex flex-col items-center">
              {room.logoB ? (
                <img src={room.logoB} alt={room.teamB} className="w-16 h-16 object-cover rounded-full border border-slate-700 bg-slate-950 p-0.5" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center font-extrabold text-white text-lg">B</div>
              )}
              <h4 className="font-bold text-base text-blue-400 truncate w-full">{room.teamB}</h4>

              {/* Volleyball or Badminton sets */}
              {room.sport === "volleyball" && (
                <span className="text-xs uppercase font-semibold font-mono text-slate-500">
                  Sets Won: {room.setB}
                </span>
              )}
              {room.sport === "badminton" && (
                <span className="text-xs uppercase font-semibold font-mono text-slate-500">
                  Games Won: {room.gameB}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* AI GEN JOURNALIST SUMMARY COLUMN */}
        <div className="bg-gradient-to-r from-orange-400/5 via-pink-400/5 to-indigo-400/5 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-3 border-b border-slate-800/60 pb-3">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-1">
                Laporan Hasil Laga Cerdas
              </h3>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                NARIFIED BY @GOOGLE/GENAI (GEMINI-3.5-FLASH)
              </span>
            </div>
          </div>

          <div className="text-slate-300 text-sm leading-relaxed font-sans first-letter:text-3xl first-letter:font-bold first-letter:text-orange-400 first-letter:mr-2 first-letter:float-left bg-slate-950/20 p-4 border border-slate-800/30 rounded-2xl italic">
            {room.summary || "Sedang memproses ringkasan naratif olahraga..."}
          </div>
        </div>

        {/* Chronological events history logs collapse layout */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500 font-bold block mb-3">
            TIMELINE JALANNYA LAGA
          </span>
          <div className="max-h-52 overflow-y-auto space-y-2 pr-2">
            {room.eventLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2.5 text-xs text-slate-400 font-sans border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                <ChevronRight className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center font-mono text-xs text-slate-600 mt-8 z-10 max-w-4xl mx-auto w-full border-t border-slate-900 pt-4">
        Platform ScoreWave &bull; Event #JuaraVibeCoding
      </footer>
    </div>
  );
}
