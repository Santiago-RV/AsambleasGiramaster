import { useState } from "react";

export default function Sidebar() {
  const [section, setSection] = useState("assembly");

  return (
  <div className="flex min-h-screen">

    <main className="flex-1 ml-[280px] p-6">
    {section === "assembly" && <AssemblyPage />}
    {section === "voting" && <VotingPage />}
    {section === "profile" && <ProfilePage />}
    </main>
  </div>
  );
}
