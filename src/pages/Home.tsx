/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Flame, Play, Award, Zap } from "lucide-react";

const sports = [
  {
    id: "basketball",
    name: "Basketball",
    icon: Flame,
    color: "from-orange-500 to-red-600",
    bgLight: "bg-orange-50",
    description: "Quarter 1-4 + OT, Timers, Fouls, Timeout Tracker",
  },
  {
    id: "volleyball",
    name: "Volleyball",
    icon: Trophy,
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50",
    description: "Sets tracker, Auto-detect winner, Servis indicator, Timeouts",
  },
  {
    id: "futsal",
    name: "Futsal",
    icon: Zap,
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50",
    description: "Count-up timer, Babak 1 & 2, Kartu kuning & merah tracker",
  },
  {
    id: "badminton",
    name: "Badminton",
    icon: Award,
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50",
    description: "Game Tracker, Servis, Auto-detect game & match winner",
  },
];

export default function Home() {
  const [selectedSport, setSelectedSport] = useState<string>("basketball");
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(`/setup?sport=${selectedSport}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 md:p-12 font-sans overflow-hidden relative">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

      <header className="max-w-4xl mx-auto w-full text-center mt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-sm text-emerald-400 font-mono mb-4 shadow-sm animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          #JuaraVibeCoding Event Ready
        </div>
        <h1 className="text-4xl md:text-6xl font-sans font-extrabold tracking-tight text-white mb-2">
          Score<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-blue-400">Wave</span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto font-sans">
          Platform papan skor multi-cabang olahraga real-time interaktif dengan laporan taktis terpandu kecerdasan buatan Gemini API.
        </p>
      </header>

      <main className="max-w-4xl mx-auto w-full my-auto py-8">
        <h2 className="text-center text-sm font-semibold tracking-wider uppercase text-slate-500 mb-6">
          PANGKALAN UTAMA: PILIH CABANG OLAHRAGA
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {sports.map((sport) => {
            const IconComponent = sport.icon;
            const isSelected = selectedSport === sport.id;

            return (
              <button
                key={sport.id}
                id={`sport-btn-${sport.id}`}
                onClick={() => setSelectedSport(sport.id)}
                className={`flex flex-col text-left p-5 rounded-2xl transition-all duration-300 border cursor-pointer group relative overflow-hidden ${
                  isSelected
                    ? "bg-slate-800 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] translate-y-[-2px]"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                {/* Accent background highlight on hover */}
                <div className={`absolute inset-0 bg-gradient-to-r ${sport.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`}></div>

                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-3 rounded-xl bg-slate-800/80 border ${
                    isSelected ? "border-orange-500 text-orange-400" : "border-slate-700 text-slate-400 group-hover:text-slate-200"
                  }`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white font-sans">{sport.name}</h3>
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                      MODE SCOREBOARD
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-sans pr-4">
                  {sport.description}
                </p>

                {isSelected && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-orange-500"></div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            id="start-match-btn"
            onClick={handleStart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 hover:opacity-95 shadow-lg shadow-orange-500/20 text-white font-semibold rounded-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer text-lg font-sans"
          >
            Mulai Pertandingan
            <Play className="w-5 h-5 fill-current" />
          </button>
        </div>
      </main>

      <footer className="text-center font-mono text-xs text-slate-600 mt-6 max-w-4xl mx-auto w-full">
        Realtime WebSockets &bull; Gemini-3.5-Flash &bull; Google Cloud Run
      </footer>
    </div>
  );
}
