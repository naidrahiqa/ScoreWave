/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SportType = 'basketball' | 'volleyball' | 'futsal' | 'badminton';
export type ThemeType = 'dark' | 'light' | 'retro';

export interface ScoreHistoryEntry {
  scoreA: number;
  scoreB: number;
  setA?: number;
  setB?: number;
  gameA?: number;
  gameB?: number;
  timestamp: number;
  description: string;
}

export interface MatchState {
  roomId: string;
  sport: SportType;
  theme: ThemeType;
  teamA: string;
  teamB: string;
  logoA: string | null; // base64 representation
  logoB: string | null; // base64 representation
  scoreA: number;
  scoreB: number;
  // Volleyball specific
  setsNeeded?: number; // 2 for best of 3, 3 for best of 5
  setA?: number; // Volleyball sets won
  setB?: number;
  // Badminton specific
  gameA?: number; // Badminton games won
  gameB?: number;
  // Serves (Volleyball / Badminton)
  serving?: 'teamA' | 'teamB';
  // Basketball specific
  quarter?: number; // 1 to 4, 5 for OT
  timeoutA?: number; // starts at 5 for basketball
  timeoutB?: number;
  foulA?: number;
  foulB?: number;
  // Volleyball set timeouts
  volleyballTimeoutsA?: number; // max 2 per set
  volleyballTimeoutsB?: number;
  // Futsal specific
  period?: '1st Half' | '2nd Half' | 'Extra Time';
  yellowA?: number;
  yellowB?: number;
  redA?: number;
  redB?: number;
  // Generic timer
  time: number; // seconds (countdown or countup)
  timerRunning: boolean;
  // AI Commentary and Ending Summary
  commentary: string;
  ended: boolean;
  summary: string;
  // History and logs
  history: ScoreHistoryEntry[];
  eventLogs: string[];
}
