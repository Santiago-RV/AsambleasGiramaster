import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Users, CheckSquare, Handshake, Download, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { ReportsService } from '../../../services/api/ReportsService';

// ─── Helpers PDF ────────────────────────────────────────────────────────────

const addHeader = (doc, title, meetingTitle, unitName, date) => {
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pw, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('GIRAMASTER — Sistema de Gestión de Asambleas', pw / 2, 11, { align: 'center' });

    doc.setFontSize(15);
    doc.text(title, pw / 2, 21, { align: 'center' });

    doc.setFillColor(245, 247, 255);
    doc.rect(0, 32, pw, 20, 'F');
    doc.setTextColor(40, 40, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reunión: ${meetingTitle}`, 14, 40);
    doc.text(`Unidad Residencial: ${unitName}`, 14, 47);

    const fmtDate = new Date(date).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
    doc.text(`Fecha: ${fmtDate}`, pw - 14, 40, { align: 'right' });
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pw - 14, 47, { align: 'right' });

    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.3);
    doc.line(14, 52, pw - 14, 52);

    doc.setTextColor(0, 0, 0);
    return 58; // y start
};

const addFooter = (doc) => {
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 200, 220);
        doc.line(14, ph - 14, pw - 14, ph - 14);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Página ${i} de ${total}`, pw / 2, ph - 8, { align: 'center' });
        doc.text('Confidencial — Solo para uso interno', 14, ph - 8);
    }
};

// ─── Generadores PDF ─────────────────────────────────────────────────────────

const generateAttendancePDF = (data) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { meeting, summary, attended, absent } = data;

    let y = addHeader(doc, 'INFORME DE ASISTENCIA', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    // Resumen
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('RESUMEN GENERAL', 14, y + 4);
    y += 8;

    autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor']],
        body: [
            ['Total Invitados', summary.total_invited],
            ['Asistentes', summary.total_attended],
            ['Ausentes', summary.total_absent],
            ['% Asistencia', `${Math.round((summary.total_attended / summary.total_invited) * 100)}%`],
            ['Quórum Alcanzado', `${summary.quorum_achieved.toFixed(4)}`],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 58, 138] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
        margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Asistentes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(`✔ ASISTENTES (${attended.length})`, 14, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        head: [['Nombre Completo', 'Apartamento', 'Email', 'Coeficiente']],
        body: attended.map(p => [p.full_name, p.apartment, p.email, p.quorum_base.toFixed(4)]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [22, 101, 52] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Ausentes
    if (absent.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(185, 28, 28);
        doc.text(`✘ AUSENTES (${absent.length})`, 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Nombre Completo', 'Apartamento', 'Email', 'Coeficiente']],
            body: absent.map(p => [p.full_name, p.apartment, p.email, p.quorum_base.toFixed(4)]),
            styles: { fontSize: 8.5 },
            headStyles: { fillColor: [185, 28, 28] },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: 14, right: 14 },
        });
    }

    addFooter(doc);
    doc.save(`Asistencia_${meeting.title.replace(/\s/g, '_')}.pdf`);
};

const generatePollsPDF = (data) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { meeting, polls } = data;

    let y = addHeader(doc, 'INFORME DE ENCUESTAS Y VOTACIONES', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Total de encuestas: ${polls.length}`, 14, y);
    y += 8;

    polls.forEach((poll, idx) => {
        if (y > 240) { doc.addPage(); y = 20; }

        // Título encuesta
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(14, y - 1, doc.internal.pageSize.getWidth() - 28, 10, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 58, 138);
        doc.text(`${idx + 1}. ${poll.title}`, 17, y + 6);
        y += 14;

        // Info general encuesta
        autoTable(doc, {
            startY: y,
            head: [['Tipo', 'Estado', 'Total Votantes', 'Peso Total Votado']],
            body: [[poll.type, poll.status, poll.total_voters, poll.total_weight_voted.toFixed(4)]],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [99, 102, 241] },
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
        });
        y = doc.lastAutoTable.finalY + 4;

        // Resultados por opción
        poll.options.forEach(opt => {
            if (opt.voters.length === 0) return;
            if (y > 240) { doc.addPage(); y = 20; }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(55, 65, 81);
            doc.text(`Opción: "${opt.text}" — Votos: ${opt.votes_count} | Peso: ${opt.votes_weight.toFixed(4)}`, 16, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Copropietario', 'Apto', 'Peso de Voto']],
                body: opt.voters.map(v => [
                    v.full_name,
                    v.apartment,
                    parseFloat(v.voting_weight).toFixed(4),
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [67, 56, 202] },
                alternateRowStyles: { fillColor: [238, 242, 255] },
                columnStyles: {
                    0: { cellWidth: 90 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 30 },
                },
                margin: { left: 20, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 4;
        });

        // Abstenciones
        if (poll.abstentions.length > 0) {
            if (y > 240) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128);
            doc.text(`Abstenciones: ${poll.abstentions.length}`, 16, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Copropietario', 'Apartamento', 'Peso']],
                body: poll.abstentions.map(v => [v.full_name, v.apartment, v.voting_weight.toFixed(4)]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [229, 231, 235], textColor: 60 },
                margin: { left: 20, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 4;
        }

        y += 6;
    });

    addFooter(doc);
    doc.save(`Encuestas_${meeting.title.replace(/\s/g, '_')}.pdf`);
};

const generateDelegationsPDF = (data) => {
    onsole.log('DATA DELEGACIONES:', JSON.stringify(data, null, 2));
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { meeting, total_delegations, delegations } = data;

    let y = addHeader(doc, 'INFORME DE CESIÓN DE PODERES', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text(`Total de delegaciones registradas: ${total_delegations}`, 14, y);
    y += 8;

    if (delegations.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        doc.text('No se registraron delegaciones de poderes en esta reunión.', 14, y);
    } else {
        autoTable(doc, {
            startY: y,
            head: [['Delegante', 'Apto', 'Email Delegante', 'Coeficiente', 'Delegado A', 'Email Delegado']],
            body: delegations.map(d => [
                d.delegator.full_name,
                d.delegator.apartment,
                d.delegator.email,
                d.delegated_weight.toFixed(4),
                d.delegate.full_name,
                d.delegate.email,
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [124, 58, 237] },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 12 },
                4: { cellWidth: 35 },
            },
            margin: { left: 14, right: 14 },
        });
    }

    addFooter(doc);
    doc.save(`Poderes_${meeting.title.replace(/\s/g, '_')}.pdf`);
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const REPORT_TYPES = [
    {
        id: 'attendance',
        label: 'Informe de Asistencia',
        description: 'Copropietarios presentes y ausentes con sus coeficientes de participación.',
        icon: Users,
        color: 'from-emerald-500 to-emerald-600',
        border: 'border-emerald-200',
        bg: 'bg-emerald-50',
        generator: generateAttendancePDF,
        fetcher: ReportsService.getAttendance,
    },
    {
        id: 'polls',
        label: 'Informe de Encuestas',
        description: 'Preguntas, opciones y detalle de cómo votó cada copropietario.',
        icon: CheckSquare,
        color: 'from-indigo-500 to-indigo-600',
        border: 'border-indigo-200',
        bg: 'bg-indigo-50',
        generator: generatePollsPDF,
        fetcher: ReportsService.getPolls,
    },
    {
        id: 'delegations',
        label: 'Informe de Poderes',
        description: 'Registro completo de cesión de poderes entre copropietarios.',
        icon: Handshake,
        color: 'from-violet-500 to-violet-600',
        border: 'border-violet-200',
        bg: 'bg-violet-50',
        generator: generateDelegationsPDF,
        fetcher: ReportsService.getDelegations,
    },
];

const InformesTab = () => {
    const [selectedMeeting, setSelectedMeeting] = useState('');
    const [loadingReport, setLoadingReport] = useState(null);

    const { data: meetingsData, isLoading: loadingMeetings } = useQuery({
        queryKey: ['report-meetings'],
        queryFn: ReportsService.getMeetings,
    });

    const meetings = meetingsData?.data?.meetings || [];

    const handleDownload = async (report) => {
        if (!selectedMeeting) {
            Swal.fire({ icon: 'warning', title: 'Selecciona una reunión', text: 'Debes elegir una reunión antes de descargar el informe.', confirmButtonColor: '#6366f1' });
            return;
        }

        setLoadingReport(report.id);
        try {
            const response = await report.fetcher(selectedMeeting);
            report.generator(response.data);
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'Error al generar informe', text: err.response?.data?.detail || 'Ocurrió un error inesperado.', confirmButtonColor: '#dc2626' });
        } finally {
            setLoadingReport(null);
        }
    };

    const selectedMeetingInfo = meetings.find(m => m.id === Number(selectedMeeting));

    return (
        <div className="space-y-8 p-1">
            {/* Encabezado */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <FileText className="text-indigo-600" size={32} />
                    Informes de Reunión
                </h1>
                <p className="text-gray-500 mt-1">Genera y descarga informes en PDF para cada reunión.</p>
            </div>

            {/* Selector de reunión */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    1. Selecciona la reunión
                </label>
                <div className="relative">
                    <select
                        value={selectedMeeting}
                        onChange={e => setSelectedMeeting(e.target.value)}
                        disabled={loadingMeetings}
                        className="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
                    >
                        <option value="">— Elige una reunión —</option>
                        {meetings.map(m => (
                            <option key={m.id} value={m.id}>
                                [{m.status}] {m.title} — {m.residential_unit}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                </div>

                {selectedMeetingInfo && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded-lg">📅 {new Date(selectedMeetingInfo.scheduled_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded-lg">🏢 {selectedMeetingInfo.residential_unit}</span>
                        <span className={`px-2 py-1 rounded-lg font-medium ${selectedMeetingInfo.status === 'En Curso' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{selectedMeetingInfo.status}</span>
                    </div>
                )}
            </div>

            {/* Tarjetas de informes */}
            <div>
                <p className="text-sm font-semibold text-gray-600 mb-4">2. Descarga el informe deseado</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {REPORT_TYPES.map((report) => {
                        const Icon = report.icon;
                        const isLoading = loadingReport === report.id;

                        return (
                            <div
                                key={report.id}
                                className={`bg-white rounded-2xl border ${report.border} shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow`}
                            >
                                <div className={`w-14 h-14 rounded-xl bg-linear-to-r ${report.color} flex items-center justify-center text-white shadow`}>
                                    <Icon size={28} />
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-base">{report.label}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                                </div>

                                <button
                                    onClick={() => handleDownload(report)}
                                    disabled={isLoading || !selectedMeeting}
                                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all
                                        ${!selectedMeeting
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : `bg-linear-to-r ${report.color} text-white hover:opacity-90 active:scale-95`
                                        }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} />
                                            Descargar PDF
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default InformesTab;