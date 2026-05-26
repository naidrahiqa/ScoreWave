/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Users, Upload, Layout, ArrowLeft, Play, ExternalLink, Copy, Check, Sliders } from "lucide-react";
import { SportType, ThemeType } from "../types.js";

const sportNames: Record<SportType, string> = {
  basketball: "Basketball",
  volleyball: "Volleyball",
  futsal: "Futsal",
  badminton: "Badminton",
};

export default function Setup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sport = (searchParams.get("sport") as SportType) || "basketball";

  // State fields
  const [teamA, setTeamA] = useState("Tim A");
  const [teamB, setTeamB] = useState("Tim B");
  const [logoA, setLogoA] = useState<string | null>(null);
  const [logoB, setLogoB] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [setsNeeded, setSetsNeeded] = useState<number>(2); // Volleyball default: Best of 3 (needs 2 sets to win)

  // Loading/Generating room state
  const [loading, setLoading] = useState(false);
  const [generatedRoomId, setGeneratedRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // File to base64 converter
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, team: "A" | "B") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (team === "A") {
          setLogoA(reader.result as string);
        } else {
          setLogoB(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateRoom = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          teamA,
          teamB,
          logoA,
          logoB,
          theme,
          setsNeeded: sport === "volleyball" ? setsNeeded : undefined,
        }),
      });

      const data = await response.json();
      if (data.roomId) {
        setGeneratedRoomId(data.roomId);
      }
    } catch (err) {
      console.error("Error creating room:", err);
      alert("Gagal membuat pertandingan. Hubungi administrator/coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  const displayUrl = `${window.location.origin}/display/${generatedRoomId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col justify-between p-6 relative">
      <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-pink-600 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

      <header className="max-w-4xl mx-auto w-full flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-sans"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <div className="text-right">
          <span className="text-xs font-mono text-slate-500 uppercase">CABANG OLAHRAGA</span>
          <h2 className="text-xl font-bold text-orange-400">{sportNames[sport]}</h2>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full my-auto bg-slate-800/60 border border-slate-700 p-6 md:p-8 rounded-3xl backdrop-blur-md shadow-2xl">
        {!generatedRoomId ? (
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6 flex items-center gap-3">
              <Sliders className="w-6 h-6 text-orange-400" />
              Pengaturan Pertandingan
            </h1>

            <div className="space-y-6">
              {/* Team Setup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A */}
                <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-2xl">
                  <span className="text-xs font-mono text-slate-500 block mb-2 font-bold text-orange-400 uppercase">TIM A (KIRI)</span>
                  <input
                    type="text"
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    placeholder="Nama Tim A"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <div className="mt-4 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs bg-slate-700 border border-slate-600 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-600 hover:text-white transition-all text-slate-300">
                      <Upload className="w-3.5 h-3.5" /> Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, "A")}
                        className="hidden"
                      />
                    </label>
                    {logoA ? (
                      <div className="flex items-center gap-2">
                        <img src={logoA} alt="logo A" className="w-7 h-7 object-cover rounded-full border border-slate-600 bg-slate-950" />
                        <button onClick={() => setLogoA(null)} className="text-[10px] text-red-400 hover:underline cursor-pointer">Hapus</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Logo kosong</span>
                    )}
                  </div>
                </div>

                {/* Team B */}
                <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-2xl">
                  <span className="text-xs font-mono text-slate-500 block mb-2 font-bold text-blue-400 uppercase">TIM B (KANAN)</span>
                  <input
                    type="text"
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    placeholder="Nama Tim B"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <div className="mt-4 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs bg-slate-700 border border-slate-600 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-600 hover:text-white transition-all text-slate-300">
                      <Upload className="w-3.5 h-3.5" /> Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, "B")}
                        className="hidden"
                      />
                    </label>
                    {logoB ? (
                      <div className="flex items-center gap-2">
                        <img src={logoB} alt="logo B" className="w-7 h-7 object-cover rounded-full border border-slate-600 bg-slate-950" />
                        <button onClick={() => setLogoB(null)} className="text-[10px] text-red-400 hover:underline cursor-pointer">Hapus</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Logo kosong</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <span className="text-xs font-mono text-slate-400 block mb-3 font-semibold uppercase">TEMA SCOREBOARD DISPLAY</span>
                <div className="grid grid-cols-3 gap-3">
                  {(["dark", "light", "retro"] as ThemeType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`py-3 px-4 rounded-xl border text-sm font-semibold capitalize cursor-pointer transition-all ${
                        theme === t
                          ? "bg-slate-700 border-orange-500 text-white"
                          : "bg-slate-900/60 border-slate-700 hover:border-slate-600 text-slate-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volleyball Specific */}
              {sport === "volleyball" && (
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs font-mono text-slate-400 block mb-2 font-semibold uppercase">VOLLEYBALL - SISTEM PEMENANG SET</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="setsNeeded"
                        checked={setsNeeded === 2}
                        onChange={() => setSetsNeeded(2)}
                        className="text-orange-500 focus:ring-0 cursor-pointer"
                      />
                      Best of 3 (Seri 1 - 1, penentuan di set ke-3)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="setsNeeded"
                        checked={setsNeeded === 3}
                        onChange={() => setSetsNeeded(3)}
                        className="text-orange-500 focus:ring-0 cursor-pointer"
                      />
                      Best of 5 (Penentuan di set ke-5)
                    </label>
                  </div>
                </div>
              )}

              {/* Generate Trigger */}
              <button
                onClick={handleGenerateRoom}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-indigo-600 hover:from-orange-600 hover:to-indigo-700 py-4 font-semibold text-lg cursor-pointer rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all font-sans"
              >
                {loading ? "Menyiapkan Arena..." : "Buat Pertandingan & Sambungkan Display"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
              Arena Berhasil Dibuat!
            </h1>
            <p className="text-sm text-slate-400 mb-6 font-sans">
              Pertandingan ready! Hubungkan operator panel dan monitor penonton / display proyektor menggunakan link unik di bawah.
            </p>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700 text-left mb-6 max-w-lg mx-auto">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                SHAREABLE DISPLAY SCOREBOARD URL (PROYEKTOR / LAYAR UTAMA)
              </span>
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  readOnly
                  value={displayUrl}
                  className="bg-transparent border-none text-slate-300 font-mono text-xs w-full focus:outline-none"
                />
                <button
                  onClick={copyUrl}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Salin URL"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto mt-8">
              <button
                onClick={() => window.open(displayUrl, "_blank")}
                className="flex-1 bg-slate-800 border border-slate-700 py-3.5 rounded-xl font-semibold hover:bg-slate-700 text-slate-200 cursor-pointer flex items-center justify-center gap-2 transition-all font-sans"
              >
                Buka Display <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/operator/${generatedRoomId}`)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-95 text-white py-3.5 rounded-xl font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all font-sans"
              >
                Mulai (Operator Panel) <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center font-mono text-xs text-slate-600 mt-8">
        Kode Pertandingan: {generatedRoomId || "BELUM_DIBUAT"}
      </footer>
    </div>
  );
}
