import AssemblyHeader from "./AssemblyHeader";
import PowerIndicator from "./PowerIndicator";
import ZoomEmbed from "./ZoomEmbed";
import QuorumCard from "./QuorumCard";
import AgendaList from "./AgendaList";

export default function AssemblyPage() {
  return (
    <section className="bg-white rounded-xl p-6 shadow-md">

      <AssemblyHeader />
      <PowerIndicator />
      <ZoomEmbed />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <QuorumCard
          number="38/45"
          sub="Asistentes Conectados"
          percentage={84}
          title="84% de Participación"
        />

        <QuorumCard
          number="87.5%"
          sub="Quórum Alcanzado"
          percentage={87.5}
          title="Válido para Votar"
        />
      </div>

      <AgendaList />
    </section>
  );
}
