import { useState } from "react";
import { FileText, Info } from "lucide-react";
import VotingItem from "./VotingItem";

export default function VotingPage() {
  const [votes, setVotes] = useState({
    1: { active: true, completed: false },
    2: { active: false, completed: false },
  });

  const handleVoteConfirmed = (id, selected) => {
    setVotes((prev) => ({
      ...prev,
      [id]: { ...prev[id], completed: true, active: false },
    }));

    if (id === 1) {
      setVotes((prev) => ({
        ...prev,
        2: { ...prev[2], active: true },
      }));
    }

    alert(`Voto registrado: ${selected.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Banner informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">
            Sistema de Votaciones
          </h3>
          <p className="text-sm text-blue-700">
            Aquí podrás participar en las votaciones activas de tu unidad residencial. 
            Tu voto se registrará de forma segura y ponderada según tu coeficiente de propiedad.
          </p>
        </div>
      </div>

      {/* Votaciones */}
      <div className="space-y-6">
        <VotingItem
          id={1}
          question="¿Aprueba el presupuesto para obras 2026 por $45.000.000?"
          meta="Tema 4 de la agenda • Iniciada hace unos minutos"
          details="Incluye reparación de fachada, impermeabilización y pintura."
          active={votes[1].active}
          completed={votes[1].completed}
          duration={180}
          options={[
            { value: "favor", label: "✓ A FAVOR" },
            { value: "contra", label: "✗ EN CONTRA" },
            { value: "abstencion", label: "○ ABSTENCIÓN" },
          ]}
          onVoteConfirmed={handleVoteConfirmed}
        />

        <VotingItem
          id={2}
          question="Elección del nuevo comité de convivencia"
          meta={
            votes[2].active
              ? "Votación habilitada"
              : "Pendiente (se habilita al terminar la votación anterior)"
          }
          details="Candidatos: Ana Martínez, Luis García, Pedro Sánchez."
          active={votes[2].active}
          completed={votes[2].completed}
          duration={180}
          options={[
            { value: "ana", label: "Ana Martínez" },
            { value: "luis", label: "Luis García" },
            { value: "pedro", label: "Pedro Sánchez" },
            { value: "blanco", label: "Voto en Blanco" },
          ]}
          onVoteConfirmed={handleVoteConfirmed}
        />
      </div>
    </div>
  );
}