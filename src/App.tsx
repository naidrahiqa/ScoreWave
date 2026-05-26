/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Setup from "./pages/Setup.jsx";
import Operator from "./pages/Operator.jsx";
import Display from "./pages/Display.jsx";
import Result from "./pages/Result.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/operator/:roomId" element={<Operator />} />
        <Route path="/display/:roomId" element={<Display />} />
        <Route path="/result/:roomId" element={<Result />} />
        {/* Wildcard fallback to Home split */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
