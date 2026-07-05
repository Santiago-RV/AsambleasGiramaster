import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Users, CheckSquare, Handshake, Download, ChevronDown, Calendar, Building2, Bell } from 'lucide-react';
import Swal from 'sweetalert2';
import { ReportsService } from '../../../services/api/ReportsService';
import { getLlamadoReportSA } from '../../../services/api/ActiveMeetingService';
import { formatDateLong, formatDateTime } from '../../../utils/dateUtils';
import { truncar3 } from '../../../utils/numberUtils';
import logoGiramaster from '../../../assets/logo-giramaster.png';

// ─── Helpers PDF ────────────────────────────────────────────────────────────

const addHeader = (doc, title, meetingTitle, unitName, date) => {
    const pw = doc.internal.pageSize.getWidth();
    const logo = logoGiramaster;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pw, 32, 'F');
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.line(0, 32, pw, 32);

    doc.addImage(logo, 'jpeg', 10, 6, 50, 20);

    doc.setTextColor(30, 58, 138);
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

    const fmtDate = formatDateLong(date);

    doc.text(`Fecha: ${fmtDate}`, pw - 14, 40, { align: 'right' });
    doc.text(`Generado: ${formatDateTime(new Date())}`, pw - 14, 47, { align: 'right' });
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

const centerLabelsPlugin = (unit = "") => ({
    id: 'centerLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;

        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.visible) return;

            const total = dataset.data.reduce((acc, val) => acc + val, 0);

            meta.data.forEach((element, index) => {
                const rawValue = Number(dataset.data[index]);

                if (!rawValue) return;

                const percentage = total > 0
                    ? (rawValue / total) * 100
                    : 0;

                const midAngle =
                    (element.startAngle + element.endAngle) / 2;

                const radius = element.outerRadius * 0.6;

                const x = element.x + Math.cos(midAngle) * radius;
                const y = element.y + Math.sin(midAngle) * radius;

                ctx.save();

                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.round(element.outerRadius * 0.14)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const labelValue = unit
                    ? `${truncar3(rawValue)}${unit}`
                    : `${Math.round(rawValue)}`;

                ctx.fillText(labelValue, x, y - 12);

                ctx.fillText(
                    `(${percentage.toFixed(1)}%)`,
                    x,
                    y + 10
                );

                ctx.restore();
            });
        });
    }
});

const generatePieChartImage = async (
    attendedValue,
    absentValue,
    unit = ""
) => {
    const { Chart } = await import('chart.js/auto');

    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Asistentes', 'Sin Ingresar'],
                datasets: [{
                    data: [attendedValue, absentValue],
                    backgroundColor: ['#16a34a', '#dc2626']
                }]
            },
            options: {
                responsive: false,
                animation: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 16
                            },
                            padding: 20
                        }
                    }
                }
            },
            plugins: [centerLabelsPlugin(unit)]
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
    const { Chart } = await import('chart.js/auto');

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;

    const ctx = canvas.getContext('2d');

    const labels = poll.options.map(opt => opt.text);
    const dataValues = poll.options.map(opt => opt.votes_weight);

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
                backgroundColor: colors,
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
                            size: 16
                        }
                    }
                }
            }
        },
        plugins: [centerLabelsPlugin()]
    });

    chart.update();

    await new Promise(r => setTimeout(r, 100));

    const image = canvas.toDataURL('image/png');

    chart.destroy();

    return image;
};

// ─── Generadores PDF ─────────────────────────────────────────────────────────

const buildDelegateMap = (delegations) => {
    const map = {};
    (delegations || []).forEach(d => {
        const key = `${d.delegator.full_name}|${d.delegator.apartment}`;
        map[key] = d.delegate.full_name;
    });
    return map;
};

const generateAttendancePDF = async (data, delegateMap = {}) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
    ]);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { meeting, summary, attended, absent } = data;
    const pw = doc.internal.pageSize.getWidth();

    // Generar gráficas (coeficiente primero, nominal segundo)
    const quorumChartImage = await generatePieChartImage(summary.total_quorum_attended, summary.total_quorum_absent, "Q");
    const attendanceChartImage = await generatePieChartImage(attended.length, absent.length);

    let y = addHeader(doc, 'INFORME DE ASISTENCIA', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    // QUÓRUM destacado
    doc.setFillColor(255, 247, 230);
    doc.roundedRect(14, y, pw - 28, 20, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text('Quórum de la Asamblea:', 18, y + 6);
    doc.setFont('helvetica', 'normal');
    const quorumValue = truncar3(summary?.total_quorum_attended);
    const quorumTotal = truncar3(summary?.total_quorum_invited);
    doc.text(`${quorumValue}  (de ${quorumTotal} total invitado)`, 68, y + 6);

    // Cifras nominales (cantidad de personas, no coeficiente)
    doc.setFont('helvetica', 'bold');
    doc.text('Conectados:', 18, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(`${attended.length}`, 44, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.text('No conectados:', 65, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(`${absent.length}`, 96, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.text('Total a ingresar:', 117, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(`${attended.length + absent.length}`, 150, y + 13);

    y += 26;

    // GRÁFICOS DE ASISTENCIA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text('GRÁFICOS DE ASISTENCIA', 14, y);

    y += 6;

    const imgSizeChart = 45;
    const gap = 15;

    const totalWidth = (imgSizeChart * 2) + gap;
    const startX = (pw - totalWidth) / 2;

    doc.setFontSize(9);
    doc.text('Por Coeficiente (Principal)', startX + (imgSizeChart / 2), y, { align: 'center' });
    doc.text('Por Porcentual (Cantidad)', startX + imgSizeChart + gap + (imgSizeChart / 2), y, { align: 'center' });

    y += 4;

    doc.addImage(quorumChartImage, 'PNG', startX, y, imgSizeChart, imgSizeChart);
    doc.addImage(attendanceChartImage, 'PNG', startX + imgSizeChart + gap, y, imgSizeChart, imgSizeChart);

    y += imgSizeChart + 10;

    // RESUMEN
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('RESUMEN GENERAL', 14, y + 4);
    doc.text(`QUÓRUM: ${quorumValue}`, pw - 14, y + 4, { align: 'right' });
    y += 8;

    // ASISTENTES
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(`>> ASISTENTES (${attended.length})`, 14, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        head: [['Nombre Completo', 'Apartamento', 'Apoderado', 'Fecha y Hora Ingreso', 'Quorum Real', 'Quorum Cedido']],
        body: attended.map(p => [
            p.full_name,
            p.apartment,
            delegateMap[`${p.full_name}|${p.apartment}`] || '—',
            p.attended_at ? formatDateTime(p.attended_at) : '—',
            truncar3(p.quorum_base),
            truncar3(Math.max(0, (p.voting_weight || 0) - p.quorum_base)),
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
            head: [['Nombre Completo', 'Apartamento', 'Apoderado', 'Quorum Real', 'Quorum Cedido']],
            body: absent.map(p => [
                p.full_name,
                p.apartment,
                delegateMap[`${p.full_name}|${p.apartment}`] || '—',
                truncar3(p.quorum_base),
                '0.000',
            ]),
            styles: { fontSize: 8.5 },
            headStyles: { fillColor: [185, 28, 28] },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: 14, right: 14 },
        });
    }
    y = doc.lastAutoTable.finalY + 10;

    addFooter(doc);
    doc.save(`Asistencia_${meeting.title.replace(/\s/g, '_')}.pdf`);
};



const generatePollsPDF = async (data) => {
    const [{ default: jsPDF }, { default: autoTable }, { Chart }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        import('chart.js/auto')
    ]);
     //Variables para diferenciar tipos de encuestas
    const graphTypes = [
        'single',
        'multiple',
    ];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { meeting, polls } = data;
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidth = 65;
    const x = (pageWidth - imgWidth) / 2;

    let y = addHeader(doc, 'INFORME DE VOTACIÓN', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Pregunta: ${polls[0]?.title || ''}`, 14, y);
    y += 8;

    for (let idx = 0; idx < polls.length; idx++) {
        const poll = polls[idx];
        //Variables para diferenciar tipos de encuestas
        const isGraphType = graphTypes.includes(poll.type);
        const isFreeText = poll.type === 'text';
        const isNumeric = poll.type === 'numeric';
        const responses = poll.responses || [];
        // Generar gráfica al inicio de cada encuesta
        let resultChart = null;
        let attendanceChart = null;
        let totalChart = null;

        if (isGraphType) {
            resultChart = await generatePollChartImage(poll);

            attendanceChart = await generatePieChartImage(
                poll.participation_by_attendance.voted,
                poll.participation_by_attendance.not_voted,
                "Q"
            );

            totalChart = await generatePieChartImage(
                poll.participation_by_total.voted,
                poll.participation_by_total.not_voted,
                "Q"
            );
        }

        if (isGraphType && resultChart) {

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 58, 138);
            doc.text('Gráficos de votación', 14, y);

            y += 6;

            const chartSize = 45;
            const gap = 8;

            const totalWidth = (chartSize * 3) + (gap * 2);
            const startX = (pageWidth - totalWidth) / 2;

            doc.setFontSize(8);

            doc.text(
                'Por Coeficiente (Principal)',
                startX + chartSize / 2,
                y,
                { align: 'center' }
            );

            doc.text(
                'Sobre asistentes',
                startX + chartSize + gap + chartSize / 2,
                y,
                { align: 'center' }
            );

            doc.text(
                'Sobre Total Copropietarios',
                startX + (chartSize * 2) + (gap * 2) + chartSize / 2,
                y,
                { align: 'center' }
            );

            y += 4;

            doc.addImage(
                resultChart,
                'PNG',
                startX,
                y,
                chartSize,
                chartSize
            );

            doc.addImage(
                attendanceChart,
                'PNG',
                startX + chartSize + gap,
                y,
                chartSize,
                chartSize
            );

            doc.addImage(
                totalChart,
                'PNG',
                startX + (chartSize * 2) + (gap * 2),
                y,
                chartSize,
                chartSize
            );

            y += chartSize + 8;
        }

        if (y > 240) { doc.addPage(); y = 20; }

        // RESUMEN GENERAL (Opción | Coeficiente | Porcentual | Votos)
        if (isGraphType && poll.options.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 58, 138);
            doc.text('RESUMEN GENERAL', 14, y);
            y += 4;

            const totalVotos = poll.options.reduce((s, o) => s + (o.votes_count || 0), 0);
            autoTable(doc, {
                startY: y,
                head: [['Opción', 'Coeficiente', 'Porcentual', 'Votos']],
                body: poll.options.map(opt => [
                    opt.text,
                    truncar3(opt.votes_weight),
                    totalVotos > 0 ? `${Math.round((opt.votes_count / totalVotos) * 100)}%` : '0%',
                    opt.votes_count,
                ]),
                styles: { fontSize: 9 },
                headStyles: { fillColor: [30, 58, 138] },
                columnStyles: {
                    1: { halign: 'right' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 6;
        }

        if (y > 240) { doc.addPage(); y = 20; }

        // Info general encuesta
        autoTable(doc, {
            startY: y,
            head: [['Tipo', 'Estado', 'Total Votantes', 'Quorum Total Votado']],
            body: [[poll.type, poll.status, poll.total_voters, truncar3(poll.total_weight_voted)]],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [99, 102, 241] },
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
        });
        y = doc.lastAutoTable.finalY + 4;
        
        // RESPUESTAS TEXTO LIBRE
        if (isFreeText) {

            if (y > 240) {
                doc.addPage();
                y = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 58, 138);
            doc.text('Respuestas de los participantes', 14, y);

            y += 4;

            

            autoTable(doc, {
                startY: y,
                head: [['Copropietario', 'Apartamento', 'Respuesta']],
                body: responses.map(r => [
                    r.full_name,
                    r.apartment || '—',
                    r.answer || '—'
                ]),
                styles: {
                    fontSize: 8,
                    cellWidth: 'wrap',
                    valign: 'top'
                },
                headStyles: {
                    fillColor: [67, 56, 202]
                },
                columnStyles: {
                    0: { cellWidth: 45 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 105 }
                },
                margin: { left: 14, right: 14 },
            });

            y = doc.lastAutoTable.finalY + 6;
        }
        // RESPUESTAS NUMÉRICAS
        if (isNumeric) {

            if (y > 240) {
                doc.addPage();
                y = 20;
            }

            const values = responses
                .map(r => Number(r.answer))
                .filter(v => !isNaN(v));

            const avg = values.length
                ? values.reduce((a, b) => a + b, 0) / values.length
                : 0;

            const min = values.length ? Math.min(...values) : 0;
            const max = values.length ? Math.max(...values) : 0;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 58, 138);
            doc.text('Resultados numéricos', 14, y);

            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Copropietario', 'Apartamento', 'Valor']],
                body: responses.map(r => [
                    r.full_name,
                    r.apartment || '—',
                    r.answer || '—'
                ]),
                styles: {
                    fontSize: 8
                },
                headStyles: {
                    fillColor: [67, 56, 202]
                },
                margin: { left: 14, right: 14 },
            });

            y = doc.lastAutoTable.finalY + 4;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(55, 65, 81);

            doc.text(`Promedio: ${avg.toFixed(2)}`, 14, y);
            y += 4;

            doc.text(`Mínimo: ${min}`, 14, y);
            y += 4;

            doc.text(`Máximo: ${max}`, 14, y);
            y += 6;
        }
        // Resultados por opción
        if (isGraphType) {
            poll.options.forEach(opt => {
                if (opt.voters.length === 0) return;
                if (y > 240) { doc.addPage(); y = 20; }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(55, 65, 81);
                doc.text(`Opción: "${opt.text}" — Votos: ${opt.votes_count} | Quorum: ${truncar3(opt.votes_weight)}`, 16, y);
                y += 4;

                autoTable(doc, {
                    startY: y,
                    head: [['Copropietario', 'Apto', 'Tipo', 'Fecha y Hora del Voto', 'Q. Real', 'Q. Cedido']],
                    body: opt.voters.map(v => [
                        v.full_name,
                        v.apartment || '—',
                        v.is_delegation_vote ? 'Vía delegado' : 'Directo',
                        v.voted_at ? formatDateTime(v.voted_at) : '—',
                        truncar3(v.quorum_base),
                        truncar3(Math.max(0, (v.voting_weight || 0) - (v.quorum_base || 0))),
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
           } 

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
                head: [['Copropietario', 'Apartamento', 'Quorom']],
                body: poll.abstentions.map(v => [v.full_name, v.apartment, truncar3(v.voting_weight)]),
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
                body: poll.non_voters.map(v => [v.full_name, v.apartment, truncar3(v.quorum_base)]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [209, 213, 219], textColor: 60 },
                alternateRowStyles: { fillColor: [249, 250, 251] },
                margin: { left: 20, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 4;
        }
        console.log(poll.type);
    };
    
    addFooter(doc);
    doc.save(`Votacion_${(polls[0]?.title?.replace(/\s/g, '_') || meeting.title.replace(/\s/g, '_'))}.pdf`);
};

const generateDelegationsPDF = async (data) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
    ]);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { meeting, total_delegations, delegations } = data;
    const pw = doc.internal.pageSize.getWidth();
    const usableWidth = pw - 28; // 297 - 28 margins = 269mm

    let y = addHeader(doc, 'INFORME DE CESIÓN DE PODERES', meeting.title, meeting.residential_unit, meeting.scheduled_date);

    const fmtDate = (iso) => iso ? formatDateTime(iso) : '—';

    // Totales en la línea de resumen
    const totalWeight = delegations.reduce((sum, d) => sum + (typeof d.delegated_weight === 'number' ? d.delegated_weight : 0), 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60);
    doc.text(`Total de delegaciones registradas:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${total_delegations}`, 80, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`Coeficiente total delegado`, 110, y);
    doc.setFont('helvetica', 'normal');
    doc.text(truncar3(totalWeight), 175, y);
    y += 10;

    if (delegations.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        doc.text('No se registraron delegaciones de poderes en esta reunión.', 14, y);
    } else {
        // Agrupar por delegado (quien recibe los poderes)
        const grouped = {};
        const groupOrder = [];
        delegations.forEach(d => {
            const key = d.delegate.full_name + '|' + (d.delegate.apartment || '');
            if (!grouped[key]) {
                grouped[key] = { delegate: d.delegate, delegators: [], totalWeight: 0 };
                groupOrder.push(key);
            }
            grouped[key].delegators.push(d);
            grouped[key].total_weight = (grouped[key].total_weight || 0) + (typeof d.delegated_weight === 'number' ? d.delegated_weight : 0);
        });

        groupOrder.forEach((key) => {
            const group = grouped[key];
            if (y > 175) { doc.addPage(); y = 20; }

            // Fila encabezado del delegado (fondo violeta) — nombre/apto + desglose de coeficientes
            const headerH = 16;
            doc.setFillColor(124, 58, 237);
            doc.rect(14, y, usableWidth, headerH, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);

            const delegateApt = group.delegate.apartment || '—';
            const ownWeight = typeof group.delegate.original_weight === 'number' ? group.delegate.original_weight : 0;
            const delegatedWeight = group.total_weight || 0;
            const representedTotal = ownWeight + delegatedWeight;

            doc.text(group.delegate.full_name, 17, y + 6);
            doc.text(`apto ${delegateApt}`, 200, y + 6);

            doc.setFontSize(8);
            doc.text('Coeficiente propio:', 17, y + 13);
            doc.setFont('helvetica', 'normal');
            doc.text(truncar3(ownWeight), 60, y + 13);
            doc.setFont('helvetica', 'bold');
            doc.text('Coeficiente cedido:', 90, y + 13);
            doc.setFont('helvetica', 'normal');
            doc.text(truncar3(delegatedWeight), 133, y + 13);
            doc.setFont('helvetica', 'bold');
            doc.text('Coeficiente Total Representado:', 163, y + 13);
            doc.setFont('helvetica', 'normal');
            doc.text(truncar3(representedTotal), 255, y + 13);
            y += headerH;

            // Tabla de delegantes
            autoTable(doc, {
                startY: y,
                tableWidth: usableWidth,
                head: [['#', 'Delegante', 'Apto', 'Coeficiente', 'Estado', 'Fecha y Hora']],
                body: group.delegators.map((d, idx) => [
                    idx + 1,
                    d.delegator.full_name,
                    d.delegator.apartment || '—',
                    typeof d.delegated_weight === 'number' ? truncar3(d.delegated_weight) : d.delegated_weight,
                    'Registrado',
                    fmtDate(d.delegated_at),
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [167, 139, 250], fontSize: 8, fontStyle: 'bold', textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 243, 255] },
                columnStyles: {
                    0: { cellWidth: 8,  halign: 'center' },
                    1: { cellWidth: 90 },
                    2: { cellWidth: 16, halign: 'center' },
                    3: { cellWidth: 25, halign: 'right' },
                    4: { cellWidth: 28 },
                    5: { cellWidth: 52 },
                },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        });
    }

    addFooter(doc);
    doc.save(`Poderes_${meeting.title.replace(/\s/g, '_')}.pdf`);
};

// ─── PDF Llamados ─────────────────────────────────────────────────────────────

const NOMBRES_LLAMADO = ['Primer', 'Segundo', 'Tercer'];

const generateLlamadoPDF = async (data, delegateMap = {}) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
    ]);

    const { meeting, residential_unit, llamado, snapshot } = data;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const nombreLlamado = NOMBRES_LLAMADO[llamado - 1];

    const timestamp = snapshot.timestamp ? formatDateTime(snapshot.timestamp) : '—';

    let y = addHeader(doc, `${nombreLlamado.toUpperCase()} LLAMADO DE ASISTENCIA`, meeting.title, residential_unit.name, meeting.scheduled_date);

    // Info del llamado
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Llamado registrado: ${timestamp}`, 14, y);
    y += 8;

    // Caja resumen quórum
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(14, y, 182, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text('Resumen de Quórum al momento del llamado', 18, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(
        `Presentes: ${snapshot.present?.length || 0}   ·   Ausentes: ${snapshot.absent?.length || 0}   ·   Quórum activo: ${truncar3(snapshot.connected_quorum)}   ·   Quórum total: ${truncar3(snapshot.total_quorum)}   ·   %: ${snapshot.quorum_percentage || 0}%`,
        18, y + 13
    );
    y += 24;

    // Tabla presentes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(`>> PRESENTES (${snapshot.present?.length || 0})`, 14, y);
    doc.setTextColor(30, 58, 138);
    doc.text(`QUÓRUM: ${snapshot.quorum_percentage || 0}%`, pw - 14, y, { align: 'right' });
    y += 4;

    autoTable(doc, {
        startY: y,
        head: [['#', 'Nombre Completo', 'Apartamento', 'Quórum Base', 'Apoderado']],
        body: (snapshot.present || []).map((u, i) => [
            i + 1,
            u.full_name,
            u.apartment_number,
            truncar3(u.quorum_base),
            delegateMap[`${u.full_name}|${u.apartment_number}`] || '—',
        ]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [22, 163, 74] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Tabla ausentes
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text(`XX AUSENTES (${snapshot.absent?.length || 0})`, 14, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        head: [['#', 'Nombre Completo', 'Apartamento', 'Quórum Base', 'Observación']],
        body: (snapshot.absent || []).map((u, i) => [
            i + 1,
            u.full_name,
            u.apartment_number,
            truncar3(u.quorum_base),
            u.has_delegated ? 'Cedió poder' : '—',
        ]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [220, 38, 38] },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        margin: { left: 14, right: 14 },
    });

    addFooter(doc);
    doc.save(`Llamado_${llamado}_${meeting.title.replace(/\s+/g, '_')}.pdf`);
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
    {
        id: 'llamados',
        label: 'Informe de Llamados',
        description: 'Tomas de de asistencia y % de quórum para cada uno de los 3 llamados de lista.',
        icon: Bell,
        color: 'from-indigo-500 to-indigo-600',
        border: 'border-indigo-200',
        bg: 'bg-indigo-50',
        generator: generateLlamadoPDF,
        fetcher: null, // manejo especial en handleDownload
    },
];

const SPINNER = (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
);

const LLAMADO_LABELS = ['Primer Llamado', 'Segundo Llamado', 'Tercer Llamado'];

const InformesTab = () => {
    const [selectedMeeting, setSelectedMeeting] = useState('');
    const [loadingReport, setLoadingReport] = useState(null);
    const [selectedPollIdxs, setSelectedPollIdxs] = useState(new Set());
    const [selectedLlamados, setSelectedLlamados] = useState(new Set());

    const { data: meetingsData, isLoading: loadingMeetings } = useQuery({
        queryKey: ['report-meetings'],
        queryFn: ReportsService.getMeetings,
    });

    const { data: pollsData, isLoading: isLoadingPolls } = useQuery({
        queryKey: ['report-polls-list', selectedMeeting],
        queryFn: () => ReportsService.getPolls(selectedMeeting),
        enabled: !!selectedMeeting,
        staleTime: 5 * 60 * 1000,
    });

    const meetings = meetingsData?.data?.meetings || [];
    const pollsList = pollsData?.data?.polls || [];

    useEffect(() => {
        setSelectedPollIdxs(new Set());
        setSelectedLlamados(new Set());
    }, [selectedMeeting]);

    const togglePoll = (idx) =>
        setSelectedPollIdxs(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });

    const toggleAllPolls = () =>
        setSelectedPollIdxs(prev =>
            prev.size === pollsList.length ? new Set() : new Set(pollsList.map((_, i) => i))
        );

    const toggleLlamado = (num) =>
        setSelectedLlamados(prev => {
            const next = new Set(prev);
            next.has(num) ? next.delete(num) : next.add(num);
            return next;
        });

    const handleDownloadStatic = async (report) => {
        if (!selectedMeeting) {
            Swal.fire({ icon: 'warning', title: 'Selecciona una reunión', text: 'Debes elegir una reunión antes de descargar el informe.', confirmButtonColor: '#6366f1' });
            return;
        }
        setLoadingReport(report.id);
        try {
            const response = await report.fetcher(selectedMeeting);
            const data = response.data;
            if (report.id === 'attendance') {
                let delegateMap = {};
                try {
                    const delRes = await ReportsService.getDelegations(selectedMeeting);
                    delegateMap = buildDelegateMap(delRes.data?.delegations || []);
                } catch (_) {}
                report.generator(data, delegateMap);
            } else {
                report.generator(data);
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error al generar informe', text: err.response?.data?.detail || 'Ocurrió un error inesperado.', confirmButtonColor: '#dc2626' });
        } finally {
            setLoadingReport(null);
        }
    };

    const handleDownloadPolls = async () => {
        if (!selectedMeeting) {
            Swal.fire({ icon: 'warning', title: 'Selecciona una reunión', confirmButtonColor: '#6366f1' });
            return;
        }
        if (selectedPollIdxs.size === 0) {
            Swal.fire({ icon: 'warning', title: 'Selecciona al menos una votación', text: 'Marca las votaciones que deseas descargar.', confirmButtonColor: '#6366f1' });
            return;
        }
        setLoadingReport('polls');
        try {
            const data = pollsData?.data;
            const toDownload = pollsList.filter((_, idx) => selectedPollIdxs.has(idx));
            for (const poll of toDownload) {
                await generatePollsPDF({ ...data, polls: [poll] });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error al generar informe', text: err.response?.data?.detail || 'Ocurrió un error inesperado.', confirmButtonColor: '#dc2626' });
        } finally {
            setLoadingReport(null);
        }
    };

    const handleDownloadLlamados = async () => {
        if (!selectedMeeting) {
            Swal.fire({ icon: 'warning', title: 'Selecciona una reunión', confirmButtonColor: '#6366f1' });
            return;
        }
        if (selectedLlamados.size === 0) {
            Swal.fire({ icon: 'warning', title: 'Selecciona al menos un llamado', text: 'Marca los llamados que deseas descargar.', confirmButtonColor: '#6366f1' });
            return;
        }
        setLoadingReport('llamados');
        try {
            const delResponse = await ReportsService.getDelegations(selectedMeeting).catch(() => null);
            const delegateMap = buildDelegateMap(delResponse?.data?.delegations || []);
            for (const numero of [...selectedLlamados].sort()) {
                const response = await getLlamadoReportSA(Number(selectedMeeting), numero);
                if (!response.success) throw new Error(response.message);
                await generateLlamadoPDF(response.data, delegateMap);
            }
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Ocurrió un error inesperado.';
            Swal.fire({ icon: 'error', title: 'Error al generar informe', text: msg, confirmButtonColor: '#dc2626' });
        } finally {
            setLoadingReport(null);
        }
    };

    const selectedMeetingInfo = meetings.find(m => m.id === Number(selectedMeeting));
    const staticReports = REPORT_TYPES.filter(r => r.id === 'attendance' || r.id === 'delegations');

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
                        <span className="bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1"><Calendar size={14} /> {formatDateLong(selectedMeetingInfo.scheduled_date)}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1"><Building2 size={14} /> {selectedMeetingInfo.residential_unit}</span>
                        <span className={`px-2 py-1 rounded-lg font-medium ${selectedMeetingInfo.status === 'En Curso' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{selectedMeetingInfo.status}</span>
                    </div>
                )}
            </div>

            {/* Informes de descarga única: Asistencia y Poderes */}
            <div>
                <p className="text-sm font-semibold text-gray-600 mb-4">2. Descarga el informe deseado</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {staticReports.map((report) => {
                        const Icon = report.icon;
                        const isLoading = loadingReport === report.id;
                        return (
                            <div key={report.id} className={`bg-white rounded-2xl border ${report.border} shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow`}>
                                <div className={`w-14 h-14 rounded-xl bg-linear-to-r ${report.color} flex items-center justify-center text-white shadow`}>
                                    <Icon size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-base">{report.label}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                                </div>
                                <button
                                    onClick={() => handleDownloadStatic(report)}
                                    disabled={isLoading || !selectedMeeting}
                                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all
                                        ${!selectedMeeting
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : `bg-linear-to-r ${report.color} text-white hover:opacity-90 active:scale-95`}`}
                                >
                                    {isLoading ? <>{SPINNER}Generando...</> : <><Download size={16} />Descargar PDF</>}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Informes con selección múltiple: Votaciones y Llamados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Card Votaciones */}
                <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-xl bg-linear-to-r from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow">
                        <CheckSquare size={28} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-base">Informe de Votaciones</h3>
                        <p className="text-sm text-gray-500 mt-1">Selecciona una o varias votaciones para descargar un PDF por cada una.</p>
                    </div>

                    {selectedMeeting && (
                        <div className="border border-indigo-100 rounded-xl p-3 bg-indigo-50 space-y-2 min-h-[72px]">
                            {isLoadingPolls ? (
                                <div className="flex items-center gap-2 text-sm text-indigo-500">
                                    {SPINNER} Cargando votaciones...
                                </div>
                            ) : pollsList.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">Esta reunión no tiene votaciones registradas.</p>
                            ) : (
                                <>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-indigo-700 cursor-pointer pb-1.5 border-b border-indigo-200">
                                        <input
                                            type="checkbox"
                                            checked={selectedPollIdxs.size === pollsList.length}
                                            onChange={toggleAllPolls}
                                            className="w-4 h-4 accent-indigo-600"
                                        />
                                        Seleccionar todas ({pollsList.length})
                                    </label>
                                    {pollsList.map((poll, idx) => (
                                        <label key={poll.id} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedPollIdxs.has(idx)}
                                                onChange={() => togglePoll(idx)}
                                                className="mt-0.5 w-4 h-4 accent-indigo-600 shrink-0"
                                            />
                                            <span className="leading-tight">
                                                {poll.title}
                                                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                                    poll.status === 'closed' ? 'bg-gray-200 text-gray-600' :
                                                    poll.status === 'active' ? 'bg-green-100 text-green-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {poll.status === 'closed' ? 'Cerrada' : poll.status === 'active' ? 'Activa' : 'Borrador'}
                                                </span>
                                            </span>
                                        </label>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleDownloadPolls}
                        disabled={loadingReport === 'polls' || !selectedMeeting || selectedPollIdxs.size === 0}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all
                            ${!selectedMeeting || selectedPollIdxs.size === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-linear-to-r from-indigo-500 to-indigo-600 text-white hover:opacity-90 active:scale-95'}`}
                    >
                        {loadingReport === 'polls' ? (
                            <>{SPINNER}Generando...</>
                        ) : (
                            <><Download size={16} />
                            {selectedPollIdxs.size > 1
                                ? `Descargar ${selectedPollIdxs.size} PDFs`
                                : selectedPollIdxs.size === 1
                                ? 'Descargar PDF'
                                : 'Descargar PDFs'}
                            </>
                        )}
                    </button>
                </div>

                {/* Card Llamados */}
                <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-xl bg-linear-to-r from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow">
                        <Bell size={28} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-base">Informe de Llamados</h3>
                        <p className="text-sm text-gray-500 mt-1">Selecciona los llamados de asistencia que deseas exportar como PDF.</p>
                    </div>

                    {selectedMeeting && (
                        <div className="border border-indigo-100 rounded-xl p-3 bg-indigo-50 space-y-2">
                            {[1, 2, 3].map(num => (
                                <label key={num} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedLlamados.has(num)}
                                        onChange={() => toggleLlamado(num)}
                                        className="w-4 h-4 accent-indigo-600"
                                    />
                                    {LLAMADO_LABELS[num - 1]}
                                </label>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleDownloadLlamados}
                        disabled={loadingReport === 'llamados' || !selectedMeeting || selectedLlamados.size === 0}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all
                            ${!selectedMeeting || selectedLlamados.size === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-linear-to-r from-indigo-500 to-indigo-600 text-white hover:opacity-90 active:scale-95'}`}
                    >
                        {loadingReport === 'llamados' ? (
                            <>{SPINNER}Generando...</>
                        ) : (
                            <><Download size={16} />
                            {selectedLlamados.size > 1
                                ? `Descargar ${selectedLlamados.size} PDFs`
                                : selectedLlamados.size === 1
                                ? 'Descargar PDF'
                                : 'Descargar PDFs'}
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default InformesTab;