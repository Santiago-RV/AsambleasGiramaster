import { useState } from "react";
import Sidebar from "./components/layout/SidebarCO";
import AssemblyPage from "./components/CoDashboard/AssemblyPage";
import VotingPage from "./components/CoDashboard/VotingPage";
import ProfilePage from "./components/CoDashboard/ProfilePage";

export default function App() {
  const [section, setSection] = useState("assembly");

  return (
  <div className="flex min-h-screen">
    <Sidebar section={section} setSection={setSection} />

    <main className="flex-1 ml-[280px] p-6">
    {section === "assembly" && <AssemblyPage />}
    {section === "voting" && <VotingPage />}
    {section === "profile" && <ProfilePage />}
    </main>
  </div>
  );
}
