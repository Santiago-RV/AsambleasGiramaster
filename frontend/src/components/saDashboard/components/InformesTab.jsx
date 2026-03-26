import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Users, CheckSquare, Handshake, Download, ChevronDown, Calendar, Building2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { ReportsService } from '../../../services/api/ReportsService';
import { Chart } from 'chart.js/auto';

// ─── Helpers PDF ────────────────────────────────────────────────────────────

const addHeader = (doc, title, meetingTitle, unitName, date) => {
    const pw = doc.internal.pageSize.getWidth();
    const logo = '/src/assets/logo-giramaster.jpeg'; 

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pw, 32, 'F');


    doc.addImage(logo, 'jpeg', 10, 6, 50, 20); 

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    doc.text('GIRAMASTER — Sistema de Gestión de Asambleas', pw / 2 + 10, 11, { align: 'center' });

    doc.setFontSize(15);
    doc.text(title, pw / 2 + 10, 21, { align: 'center' });
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

    return 58;
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

// ─── PDF Graphics ────────────────────────────────────────────────────────────

const generatePieChartImage = (attendedCount, absentCount) => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 500;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Asistentes', 'Ausentes'],
                position: 'right',
                datasets: [{
                    data: [attendedCount, absentCount],
                    backgroundColor: ['#16a34a', '#dc2626']
                }]
            },
            options: {
                responsive: false,
                animation: false 
            }
        });

        try {
            chart.update();
            setTimeout(() => {
                try {
                    const image = canvas.toDataURL('image/png');
                    chart.destroy();

                    if (!image || image.length < 1000) {
                        throw new Error('Imagen vacía');
                    }

                    resolve(image);
                } catch (err) {
                    reject(err);
                }
            }, 100);

        } catch (err) {
            reject(err);
        }
    });
};

const generatePollChartImage = async (poll) => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;

    const ctx = canvas.getContext('2d');

    const labels = poll.options.map(opt => opt.text);
    const dataValues = poll.options.map(opt => opt.votes_weight); // 🔥 usa peso

    const colors = [
        '#4f46e5', '#16a34a', '#dc2626', '#f59e0b',
        '#0ea5e9', '#9333ea', '#14b8a6'
    ];

    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors
            }]
        },
        options: {
            animation: false,
            responsive: false,
            plugins: {
                legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            },
                        }   
                }
            }
        }
    });

    chart.update();

    await new Promise(r => setTimeout(r, 100));

    const image = canvas.toDataURL('image/png');
    chart.destroy();

    return image;
};

// ─── Generadores PDF ─────────────────────────────────────────────────────────

const generateAttendancePDF = async (data) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { meeting, summary, attended, absent } = data;

    let y = addHeader(doc, 'INFORME DE ASISTENCIA', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    // RESUMEN
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('RESUMEN GENERAL', 14, y + 4);
    y += 8;

    // ASISTENTES
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(`>> ASISTENTES (${attended.length})`, 14, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        head: [['Nombre Completo', 'Apartamento', 'Tipo', 'Fecha y Hora Ingreso', 'Quorum Real', 'Quorum Cedido']],
        body: attended.map(p => [
            p.full_name,
            p.apartment,
            p.attendance_type === 'Delegado' ? 'Por delegación' : 'Titular',
            p.attended_at
                ? new Date(p.attended_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : '—',
            p.quorum_base.toFixed(4),
            Math.max(0, (p.voting_weight || 0) - p.quorum_base).toFixed(4),
        ]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [22, 101, 52] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 10;


    // AUSENTES 
    if (absent.length > 0) {
        if (y > 230) {
            doc.addPage();
            y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(185, 28, 28);
        doc.text(`XX AUSENTES (${absent.length})`, 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Nombre Completo', 'Apartamento', 'Fecha y Hora Ingreso', 'Quorum Real', 'Quorum Cedido']],
            body: absent.map(p => [
                p.full_name,
                p.apartment,
                '—',
                p.quorum_base.toFixed(4),
                '0.0000',
            ]),
            styles: { fontSize: 8.5 },
            headStyles: { fillColor: [185, 28, 28] },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: 14, right: 14 },
        });
    }
    y = doc.lastAutoTable.finalY + 10;
    // GRAFICO
    const chartImage = await generatePieChartImage(attended.length, absent.length);

    if (y > 160) {
        doc.addPage();
        y = 20;
    }

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text('GRAFICO DE ASISTENCIA', 14, y);
    y += 6;

    const pageWidth = doc.internal.pageSize.getWidth();
    const imgSize = 65;
    const x = (pageWidth - imgSize) / 2;

    doc.addImage(chartImage, 'PNG', x, y, imgSize, imgSize);
    y += imgSize + 10;
 
    addFooter(doc);
    doc.save(`Asistencia_${meeting.title.replace(/\s/g, '_')}.pdf`);
};

const generatePollsPDF = async (data) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { meeting, polls } = data;
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidth = 120;
    const x = (pageWidth - imgWidth) / 2;

    let y = addHeader(doc, 'INFORME DE VOTACIÓN', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Pregunta: ${polls[0]?.title || ''}`, 14, y);
    y += 8;

    for (let idx = 0; idx < polls.length; idx++) {
        const poll = polls[idx];

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
                head: [['Copropietario', 'Apto', 'Tipo', 'Fecha y Hora del Voto', 'Q. Real', 'Q. Cedido']],
                body: opt.voters.map(v => [
                    v.full_name,
                    v.apartment || '—',
                    v.is_delegation_vote ? 'Vía delegado' : 'Directo',
                    v.voted_at
                        ? new Date(v.voted_at).toLocaleString('es-ES', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        })
                        : '—',
                    parseFloat(v.quorum_base || 0).toFixed(4),
                    Math.max(0, (v.voting_weight || 0) - (v.quorum_base || 0)).toFixed(4),
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [67, 56, 202] },
                alternateRowStyles: { fillColor: [238, 242, 255] },
                didParseCell: (hookData) => {
                    if (hookData.section === 'body' && opt.voters[hookData.row.index]?.is_delegation_vote) {
                        hookData.cell.styles.fillColor = [254, 243, 199];
                        hookData.cell.styles.textColor = [120, 53, 15];
                    }
                },
                columnStyles: {
                    0: { cellWidth: 52 },
                    1: { cellWidth: 12 },
                    2: { cellWidth: 22 },
                    3: { cellWidth: 37 },
                    4: { cellWidth: 18 },
                    5: { cellWidth: 18 },
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

        // NO VOTARON
        if (poll.non_voters && poll.non_voters.length > 0) {
            if (y > 240) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128);
            doc.text(`No votaron: ${poll.non_voters.length}`, 16, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Copropietario', 'Apartamento', 'Q. Real']],
                body: poll.non_voters.map(v => [v.full_name, v.apartment, parseFloat(v.quorum_base || 0).toFixed(4)]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [209, 213, 219], textColor: 60 },
                alternateRowStyles: { fillColor: [249, 250, 251] },
                margin: { left: 20, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 4;
        }

        //GRAFICO
        const chartImage = await generatePollChartImage(poll);

        if (y > 160) {
            doc.addPage();
            y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text('Resultados de votación', 14, y);
        y += 6;

        const pageWidth = doc.internal.pageSize.getWidth();
        const imgSize = 65;
        const x = (pageWidth - imgSize) / 2;

        doc.addImage(chartImage, 'PNG', x, y, imgSize, imgSize);
        y += imgSize + 10;
        
    };

    addFooter(doc);
    doc.save(`Votacion_${(polls[0]?.title?.replace(/\s/g, '_') || meeting.title.replace(/\s/g, '_'))}.pdf`);
};

const generateDelegationsPDF = (data) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { meeting, total_delegations, delegations } = data;

    let y = addHeader(doc, 'INFORME DE CESIÓN DE PODERES', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text(`Total de delegaciones registradas: ${total_delegations}`, 14, y);
    y += 8;

    const fmtDate = (iso) => iso
        ? new Date(iso).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : '—';

    if (delegations.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        doc.text('No se registraron delegaciones de poderes en esta reunión.', 14, y);
    } else {
        autoTable(doc, {
            startY: y,
            head: [['#', 'Delegante', 'Apto', 'Coeficiente', 'Delegado A', 'Fecha y Hora']],
            body: delegations.map((d, idx) => [
                idx + 1,
                d.delegator.full_name,
                d.delegator.apartment,
                typeof d.delegated_weight === 'number' ? d.delegated_weight.toFixed(4) : d.delegated_weight,
                d.delegate.full_name,
                fmtDate(d.delegated_at),
                //d.notes || '—',
            ]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [124, 58, 237], fontSize: 8, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 22, halign: 'right' },
                4: { cellWidth: 50 },
                5: { cellWidth: 35 },
                6: { cellWidth: 'auto' },
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
            const data = response.data;

            if (report.id === 'polls') {
                const polls = data?.polls || [];
                if (polls.length === 0) {
                    Swal.fire({ icon: 'info', title: 'Sin encuestas', text: 'Esta reunión no tiene encuestas registradas.', confirmButtonColor: '#6366f1' });
                    return;
                }
                if (polls.length === 1) {
                    report.generator({ ...data, polls: [polls[0]] });
                    return;
                }
                const inputOptions = polls.reduce((acc, p, idx) => {
                    acc[idx] = `${p.title} (${p.status === 'closed' ? 'Cerrada' : p.status === 'active' ? 'Activa' : 'Borrador'})`;
                    return acc;
                }, {});
                const { value: selectedIdx, isConfirmed } = await Swal.fire({
                    title: 'Selecciona la pregunta',
                    text: 'Elige la pregunta para la cual deseas generar el informe.',
                    input: 'select',
                    inputOptions,
                    inputPlaceholder: '— Elige una pregunta —',
                    showCancelButton: true,
                    confirmButtonText: 'Generar PDF',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#6366f1',
                    cancelButtonColor: '#6b7280',
                    inputValidator: (value) => {
                        if (value === '') return 'Debes seleccionar una pregunta';
                    },
                });
                if (!isConfirmed) return;
                const selectedPoll = polls[Number(selectedIdx)];
                report.generator({ ...data, polls: [selectedPoll] });
            } else {
                report.generator(data);
            }
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
                        <span className="bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1"><Calendar size={14} /> {new Date(selectedMeetingInfo.scheduled_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1"><Building2 size={14} /> {selectedMeetingInfo.residential_unit}</span>
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