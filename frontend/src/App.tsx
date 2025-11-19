import { Routes, Route } from "react-router-dom";
import LandingApp from "./landing/App";
import DappApp from "./dapp/DappApp";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingApp />} />
      <Route path="/app" element={<DappApp />} />
    </Routes>
  );
}