/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { MatchState, SportType, ThemeType, ScoreHistoryEntry } from "./src/types.js";

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Middleware for parsing large JSON payloads (base64 logos)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// In-memory room storage
const rooms: Record<string, MatchState> = {};

// Keep track of connected WebSocket clients per room
const activeRooms = new Map<string, Set<WebSocket>>();

// Generate an 8-character unique room ID
function generateRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Initial state creator
function createInitialState(params: {
  roomId: string;
  sport: SportType;
  theme: ThemeType;
  teamA: string;
  teamB: string;
  logoA: string | null;
  logoB: string | null;
  setsNeeded?: number;
}): MatchState {
  const { roomId, sport, theme, teamA, teamB, logoA, logoB, setsNeeded = 2 } = params;

  const defaultState: MatchState = {
    roomId,
    sport,
    theme,
    teamA: teamA || "Tim A",
    teamB: teamB || "Tim B",
    logoA,
    logoB,
    scoreA: 0,
    scoreB: 0,
    time: 0,
    timerRunning: false,
    commentary: "Selamat datang di ScoreWave! Pertandingan akan segera dimulai.",
    ended: false,
    summary: "",
    history: [],
    eventLogs: [`Mempersiapkan pertandingan ${sport} antara ${teamA || "Tim A"} dan ${teamB || "Tim B"}`],
  };

  if (sport === "basketball") {
    defaultState.quarter = 1;
    defaultState.timeoutA = 5;
    defaultState.timeoutB = 5;
    defaultState.foulA = 0;
    defaultState.foulB = 0;
    defaultState.time = 600; // 10 minutes counting down
  } else if (sport === "volleyball") {
    defaultState.setA = 0;
    defaultState.setB = 0;
    defaultState.setsNeeded = setsNeeded;
    defaultState.serving = "teamA";
    defaultState.volleyballTimeoutsA = 2;
    defaultState.volleyballTimeoutsB = 2;
  } else if (sport === "futsal") {
    defaultState.period = "1st Half";
    defaultState.yellowA = 0;
    defaultState.yellowB = 0;
    defaultState.redA = 0;
    defaultState.redB = 0;
    defaultState.time = 0; // starts at 0, counts UP to 1200 (20 mins) or indefinitely
  } else if (sport === "badminton") {
    defaultState.gameA = 0;
    defaultState.gameB = 0;
    defaultState.serving = "teamA";
  }

  return defaultState;
}

// AI Commentary helper using Google GenAI SDK (lazy-load API key check)
async function generateLiveCommentary(room: MatchState, team: "A" | "B", change: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const scoringTeamName = team === "A" ? room.teamA : room.teamB;
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    const defaultComments = [
      `Luar biasa! Skor bertambah untuk ${scoringTeamName}! Atmosfer pertandingan semakin panas!`,
      `Poin masuk berkah kerja keras ${scoringTeamName}! Skor kini ${room.scoreA} - ${room.scoreB}!`,
      `Aksi gemilang dari ${scoringTeamName} membuahkan hasil! Skor terus merangkak naik!`,
      `Tembakan jitu/serangan kilat dari ${scoringTeamName} tak mampu dihalau lawan!`,
      `Pendukung ${scoringTeamName} bersorak gembira menyaksikan poin terbaru ini!`
    ];
    return defaultComments[Math.floor(Math.random() * defaultComments.length)];
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const info = `Olahraga: ${room.sport}. Tim A: ${room.teamA} (Skor: ${room.scoreA}), Tim B: ${room.teamB} (Skor: ${room.scoreB}). Poin terbaru dicetak oleh ${scoringTeamName} sebanyak +${change}.`;

    const prompt = `Anda adalah komentator olahraga profesional Indonesia yang sangat antusias, ekspresif, dan legendaris (seperti Bung 'Ahay' atau Bung 'Jebret').
Berikan SATU kalimat komentar yang sangat pendek, padat, berenergi tinggi, dan dramatis dalam Bahasa Indonesia gratis dari tanda kutip ganda atau tunggal.
Gunakan jargon seru khas komentator TV Indonesia (seperti: "AHAY!", "JEBRET!", "Luar biasa!", "Peluang emas!", "Sangat cerdik!").

Detail Keadaan Laga Terbaru:
${info}

Berikan komentar 1 kalimat saja!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || `Poin penting dicetak oleh ${scoringTeamName}!`;
  } catch (err) {
    console.error("Gemini Commentary Error:", err);
    return `Poin krusial didapatkan oleh ${scoringTeamName}! Skor berubah menjadi ${room.scoreA} - ${room.scoreB}.`;
  }
}

// AI Summary helper at match end
async function generateMatchSummary(room: MatchState): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return `Pertandingan ${room.sport} yang sangat seru antara ${room.teamA} dan ${room.teamB} telah berakhir dengan skor akhir ${room.scoreA} - ${room.scoreB}. Kedua belah pihak telah menunjukkan komitmen olahraga yang fantastis dan perjuangan maksimal tanpa lelah di arena. Selamat kepada pemenang, dan apresiasi tinggi untuk kedua tim atas laga spektakuler ini!`;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const logs = room.eventLogs.slice(-40).join("\n");

    const prompt = `Anda adalah jurnalis olahraga profesional Indonesia.
Tulis ringkasan narative yang mendalam, emosional, dan berapi-api mengenai jalannya pertandingan ini sebanyak 3 sampai 5 kalimat (dalam 1 paragraf tunggal saja) dalam Bahasa Indonesia. Jangan gunakan tanda kutip dalam teks Anda.

Hasil Akhir:
Olahraga: ${room.sport}
Tim A: ${room.teamA} (Skor Akhir: ${room.scoreA})
Tim B: ${room.teamB} (Skor Akhir: ${room.scoreB})

Log Kejadian Laga:
${logs}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || "Pertandingan mengesankan yang penuh drama telah selesai dilaksanakan.";
  } catch (err) {
    console.error("Gemini Summary Error:", err);
    return `Pertandingan sengit antara ${room.teamA} dan ${room.teamB} selesai dengan skor akhir ${room.scoreA} - ${room.scoreB}. Kedua tim meluncurkan performa terbaik mereka, memberikan hiburan memukau bagi seluruh penonton.`;
  }
}

// Express REST API
app.post("/api/rooms", (req, res) => {
  const { sport, teamA, teamB, logoA, logoB, theme, setsNeeded } = req.body;
  const roomId = generateRoomId();

  const newRoom = createInitialState({
    roomId,
    sport,
    theme,
    teamA,
    teamB,
    logoA,
    logoB,
    setsNeeded: setsNeeded ? parseInt(setsNeeded) : undefined
  });

  rooms[roomId] = newRoom;
  res.json({ roomId });
});

app.get("/api/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];

  if (!room) {
    return res.status(404).json({ error: "Room tidak ditemukan" });
  }

  res.json(room);
});

// Setup WebSocket Server attached to the HTTP server
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Helper to broadcast to a room
function broadcastToRoom(roomId: string, message: any) {
  const clients = activeRooms.get(roomId);
  if (clients) {
    const payloadStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payloadStr);
      }
    });
  }
}

// Timer Ticking Server-Authoritative Loop (runs every 1 second)
setInterval(() => {
  Object.keys(rooms).forEach((roomId) => {
    const room = rooms[roomId];
    if (room && room.timerRunning && !room.ended) {
      if (room.sport === "basketball") {
        if (room.time > 0) {
          room.time -= 1;
          // Sync timer state
          broadcastToRoom(roomId, {
            type: "TIMER_UPDATE",
            payload: { time: room.time, running: true },
          });

          if (room.time === 0) {
            room.timerRunning = false;
            room.eventLogs.push(`Waktu babak ${room.quarter} habis!`);
            broadcastToRoom(roomId, {
              type: "ROOM_STATE",
              payload: room,
            });
            broadcastToRoom(roomId, {
              type: "TIMER_UPDATE",
              payload: { time: 0, running: false },
            });
          }
        }
      } else if (room.sport === "futsal") {
        room.time += 1;
        // Sync timer state
        broadcastToRoom(roomId, {
          type: "TIMER_UPDATE",
          payload: { time: room.time, running: true },
        });

        // Optional log milestone (e.g. 20 mins / 1200s is half time)
        if (room.time === 1200) {
          room.eventLogs.push(`Mencapai menit ke-20 babak pertama.`);
          broadcastToRoom(roomId, {
            type: "ROOM_STATE",
            payload: room,
          });
        }
      }
    }
  });
}, 1000);

wss.on("connection", (ws: WebSocket) => {
  let joinedRoomId: string | null = null;

  ws.on("message", async (messageStr: string) => {
    try {
      const { type, payload } = JSON.parse(messageStr);

      if (type === "JOIN_ROOM") {
        const { roomId } = payload;
        const room = rooms[roomId];
        if (!room) {
          ws.send(JSON.stringify({ type: "ERROR", payload: "Room tidak ditemukan" }));
          return;
        }

        joinedRoomId = roomId;
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, new Set());
        }
        activeRooms.get(roomId)!.add(ws);

        // Send full state on join
        ws.send(JSON.stringify({ type: "ROOM_STATE", payload: room }));
        return;
      }

      // Beyond this point, we need a valid room ID context
      if (!joinedRoomId) return;
      const room = rooms[joinedRoomId];
      if (!room) return;

      // Handle other operator actions
      switch (type) {
        case "UPDATE_SCORE": {
          const { team, diff } = payload; // team: 'A' | 'B', diff: number
          
          // Capture current score in history for undo
          const historyEntry: ScoreHistoryEntry = {
            scoreA: room.scoreA,
            scoreB: room.scoreB,
            timestamp: Date.now(),
            description: `Poin untuk Tim ${team} (${diff > 0 ? "+" : ""}${diff})`,
          };

          // Capture sport specific fields for history
          if (room.sport === "volleyball") {
            historyEntry.setA = room.setA;
            historyEntry.setB = room.setB;
          } else if (room.sport === "badminton") {
            historyEntry.gameA = room.gameA;
            historyEntry.gameB = room.gameB;
          }
          room.history.push(historyEntry);

          const teamName = team === "A" ? room.teamA : room.teamB;

          // Apply score changes
          if (team === "A") {
            room.scoreA = Math.max(0, room.scoreA + diff);
          } else {
            room.scoreB = Math.max(0, room.scoreB + diff);
          }

          room.eventLogs.push(`Skor berubah: ${room.teamA} ${room.scoreA} - ${room.scoreB} ${room.teamB} (${teamName} +${diff})`);

          // Auto-detect endings/winners for Volleyball or Badminton
          if (room.sport === "volleyball") {
            const decSet = (room.setsNeeded === 3) ? (room.setA! + room.setB! === 4) : (room.setA! + room.setB! === 2);
            const scoreCap = decSet ? 15 : 25;

            if (room.scoreA >= scoreCap && room.scoreA - room.scoreB >= 2) {
              room.setA! += 1;
              room.eventLogs.push(`Set berakhir! ${room.teamA} memenangkan set ini dengan skor ${room.scoreA} - ${room.scoreB}`);
              room.scoreA = 0;
              room.scoreB = 0;
              room.volleyballTimeoutsA = 2;
              room.volleyballTimeoutsB = 2;
            } else if (room.scoreB >= scoreCap && room.scoreB - room.scoreA >= 2) {
              room.setB! += 1;
              room.eventLogs.push(`Set berakhir! ${room.teamB} memenangkan set ini dengan skor ${room.scoreB} - ${room.scoreA}`);
              room.scoreA = 0;
              room.scoreB = 0;
              room.volleyballTimeoutsA = 2;
              room.volleyballTimeoutsB = 2;
            }

            // Check overall Volleyball match winner
            const winTarget = room.setsNeeded; // best of 3 needs 2, best of 5 needs 3
            if (room.setA === winTarget) {
              room.eventLogs.push(`Pertandingan Selesai! ${room.teamA} memenangkan laga Best of ${room.setsNeeded === 2 ? 3 : 5}!`);
              room.ended = true;
            } else if (room.setB === winTarget) {
              room.eventLogs.push(`Pertandingan Selesai! ${room.teamB} memenangkan laga Best of ${room.setsNeeded === 2 ? 3 : 5}!`);
              room.ended = true;
            }
          } else if (room.sport === "badminton") {
            // First to 21, must lead by 2, max 30
            const checkWinner = (sa: number, sb: number): boolean => {
              if (sa >= 21) {
                if (sa - sb >= 2 || sa === 30) return true;
              }
              return false;
            };

            if (checkWinner(room.scoreA, room.scoreB)) {
              room.gameA! += 1;
              room.eventLogs.push(`Game selesai! ${room.teamA} memenangkan game ini dengan skor ${room.scoreA} - ${room.scoreB}`);
              room.scoreA = 0;
              room.scoreB = 0;
            } else if (checkWinner(room.scoreB, room.scoreA)) {
              room.gameB! += 1;
              room.eventLogs.push(`Game selesai! ${room.teamB} memenangkan game ini dengan skor ${room.scoreB} - ${room.scoreA}`);
              room.scoreA = 0;
              room.scoreB = 0;
            }

            // Check overall Badminton match winner (Best of 3, needs 2 games to win)
            if (room.gameA === 2) {
              room.eventLogs.push(`Pertandingan Selesai! ${room.teamA} keluar sebagai pemenang dengan kedudukan 2 game!`);
              room.ended = true;
            } else if (room.gameB === 2) {
              room.eventLogs.push(`Pertandingan Selesai! ${room.teamB} keluar sebagai pemenang dengan kedudukan 2 game!`);
              room.ended = true;
            }
          }

          // Broadcast state immediately
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          broadcastToRoom(joinedRoomId, { type: "SCORE_UPDATE", payload: { teamA: room.scoreA, teamB: room.scoreB } });

          // Asynchronously call Gemini for live commentary
          if (diff > 0 && !room.ended) {
            generateLiveCommentary(room, team, diff).then((commentaryText) => {
              room.commentary = commentaryText;
              room.eventLogs.push(`Komentar AI: "${commentaryText}"`);
              broadcastToRoom(joinedRoomId!, { type: "COMMENTARY", payload: { text: commentaryText } });
              broadcastToRoom(joinedRoomId!, { type: "ROOM_STATE", payload: room });
            });
          }
          break;
        }

        case "UNDO_SCORE": {
          if (room.history.length === 0) return;
          const prevEntry = room.history.pop()!;
          room.scoreA = prevEntry.scoreA;
          room.scoreB = prevEntry.scoreB;
          if (room.sport === "volleyball" && prevEntry.setA !== undefined && prevEntry.setB !== undefined) {
            room.setA = prevEntry.setA;
            room.setB = prevEntry.setB;
          }
          if (room.sport === "badminton" && prevEntry.gameA !== undefined && prevEntry.gameB !== undefined) {
            room.gameA = prevEntry.gameA;
            room.gameB = prevEntry.gameB;
          }
          room.ended = false; // allow reverting ended matches

          room.eventLogs.push("Aksi poin dibatalkan (Undo).");
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          broadcastToRoom(joinedRoomId, { type: "SCORE_UPDATE", payload: { teamA: room.scoreA, teamB: room.scoreB } });
          break;
        }

        case "TOGGLE_TIMER": {
          room.timerRunning = reqPayloadValueBoolean(payload);
          room.eventLogs.push(room.timerRunning ? "Timer diaktifkan." : "Timer dihentikan.");
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          broadcastToRoom(joinedRoomId, { type: "TIMER_UPDATE", payload: { time: room.time, running: room.timerRunning } });
          break;
        }

        case "MODIFY_TIMER": {
          const { action, value } = payload; // action: 'add' | 'subtract' | 'set', value: seconds
          if (action === "add") {
            room.time += value;
          } else if (action === "subtract") {
            room.time = Math.max(0, room.time - value);
          } else if (action === "set") {
            room.time = Math.max(0, value);
          }

          room.eventLogs.push(`Waktu disesuaikan menjadi ${Math.floor(room.time / 60)}m ${room.time % 60}s.`);
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          broadcastToRoom(joinedRoomId, { type: "TIMER_UPDATE", payload: { time: room.time, running: room.timerRunning } });
          break;
        }

        case "UPDATE_PERIOD": {
          const { period } = payload; // Basketball quarter or Futsal half
          if (room.sport === "basketball") {
            room.quarter = period;
            room.eventLogs.push(`Babak berganti menjadi Quarter ${period === 5 ? "Overtime" : period}`);
            room.time = period === 5 ? 300 : 600; // OT is 5 mins, standard quarter 10 mins
          } else if (room.sport === "futsal") {
            room.period = period;
            room.eventLogs.push(`Babak berganti menjadi ${period}`);
          }
          room.timerRunning = false;
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          broadcastToRoom(joinedRoomId, { type: "PERIOD_UPDATE", payload: { period } });
          break;
        }

        case "USE_TIMEOUT": {
          const { team } = payload;
          if (room.sport === "basketball") {
            if (team === "A" && room.timeoutA! > 0) {
              room.timeoutA! -= 1;
              room.timerRunning = false;
              room.eventLogs.push(`Timeout diambil oleh ${room.teamA}. Sisa timeout: ${room.timeoutA}`);
            } else if (team === "B" && room.timeoutB! > 0) {
              room.timeoutB! -= 1;
              room.timerRunning = false;
              room.eventLogs.push(`Timeout diambil oleh ${room.teamB}. Sisa timeout: ${room.timeoutB}`);
            }
          } else if (room.sport === "volleyball") {
            if (team === "A" && room.volleyballTimeoutsA! > 0) {
              room.volleyballTimeoutsA! -= 1;
              room.eventLogs.push(`Timeout set diambil oleh ${room.teamA}. Sisa timeout set ini: ${room.volleyballTimeoutsA}`);
            } else if (team === "B" && room.volleyballTimeoutsB! > 0) {
              room.volleyballTimeoutsB! -= 1;
              room.eventLogs.push(`Timeout set diambil oleh ${room.teamB}. Sisa timeout set ini: ${room.volleyballTimeoutsB}`);
            }
          }
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          broadcastToRoom(joinedRoomId, { type: "TIMER_UPDATE", payload: { time: room.time, running: room.timerRunning } });
          broadcastToRoom(joinedRoomId, { type: "TIMEOUT_UPDATE", payload: { teamA: room.timeoutA ?? room.volleyballTimeoutsA, teamB: room.timeoutB ?? room.volleyballTimeoutsB } });
          break;
        }

        case "UPDATE_FOUL": {
          const { team, diff } = payload;
          if (room.sport === "basketball") {
            if (team === "A") {
              room.foulA = Math.max(0, room.foulA! + diff);
              room.eventLogs.push(`Foul ${room.teamA} menjadi ${room.foulA}${room.foulA >= 5 ? " (BONUS!)" : ""}`);
            } else {
              room.foulB = Math.max(0, room.foulB! + diff);
              room.eventLogs.push(`Foul ${room.teamB} menjadi ${room.foulB}${room.foulB >= 5 ? " (BONUS!)" : ""}`);
            }
          }
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          broadcastToRoom(joinedRoomId, { type: "FOUL_UPDATE", payload: { teamA: room.foulA, teamB: room.foulB } });
          break;
        }

        case "UPDATE_SERVING": {
          const { team } = payload;
          room.serving = team;
          room.eventLogs.push(`Servis dipindahkan ke ${team === "A" ? room.teamA : room.teamB}`);
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          break;
        }

        case "UPDATE_CARDS": {
          const { team, card, diff } = payload; // card: 'yellow' | 'red', diff: number
          if (room.sport === "futsal") {
            if (team === "A") {
              if (card === "yellow") room.yellowA = Math.max(0, room.yellowA! + diff);
              if (card === "red") room.redA = Math.max(0, room.redA! + diff);
              room.eventLogs.push(`Kartu ${card} untuk ${room.teamA} disesuaikan. Sisa/Total: Y:${room.yellowA} R:${room.redA}`);
            } else {
              if (card === "yellow") room.yellowB = Math.max(0, room.yellowB! + diff);
              if (card === "red") room.redB = Math.max(0, room.redB! + diff);
              room.eventLogs.push(`Kartu ${card} untuk ${room.teamB} disesuaikan. Sisa/Total: Y:${room.yellowB} R:${room.redB}`);
            }
          }
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          break;
        }

        case "END_MATCH": {
          room.ended = true;
          room.timerRunning = false;
          room.eventLogs.push("Pertandingan Diakhiri oleh operator.");
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });

          // Generate summary in background and store & broadcast
          generateMatchSummary(room).then((narration) => {
            room.summary = narration;
            room.eventLogs.push(`AI Jurnalis Summary Generated.`);
            broadcastToRoom(joinedRoomId!, { type: "MATCH_END", payload: { summary: narration } });
            broadcastToRoom(joinedRoomId!, { type: "ROOM_STATE", payload: room });
          });
          break;
        }

        case "RESET_ROOM": {
          room.scoreA = 0;
          room.scoreB = 0;
          room.time = room.sport === "basketball" ? 600 : 0;
          room.timerRunning = false;
          room.ended = false;
          room.summary = "";
          room.commentary = "Pertandingan direset! Bersiap untuk memulai kembali.";
          room.history = [];
          room.eventLogs = ["Pertandingan direset oleh operator."];

          if (room.sport === "basketball") {
            room.quarter = 1;
            room.timeoutA = 5;
            room.timeoutB = 5;
            room.foulA = 0;
            room.foulB = 0;
          } else if (room.sport === "volleyball") {
            room.setA = 0;
            room.setB = 0;
            room.serving = "teamA";
            room.volleyballTimeoutsA = 2;
            room.volleyballTimeoutsB = 2;
          } else if (room.sport === "futsal") {
            room.period = "1st Half";
            room.yellowA = 0;
            room.yellowB = 0;
            room.redA = 0;
            room.redB = 0;
          } else if (room.sport === "badminton") {
            room.gameA = 0;
            room.gameB = 0;
            room.serving = "teamA";
          }
          broadcastToRoom(joinedRoomId, { type: "ROOM_STATE", payload: room });
          break;
        }
      }

    } catch (err) {
      console.error("WS Message handling error:", err);
    }
  });

  ws.on("close", () => {
    if (joinedRoomId && activeRooms.has(joinedRoomId)) {
      activeRooms.get(joinedRoomId)!.delete(ws);
      if (activeRooms.get(joinedRoomId)!.size === 0) {
        activeRooms.delete(joinedRoomId);
      }
    }
  });
});

// Helper for type-safe payload boolean extraction
function reqPayloadValueBoolean(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === 1) return true;
  return false;
}

// Build & serve combined Server / Frontend app
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`ScoreWave fullstack server running on http://localhost:${PORT}`);
  });
}

startServer();
