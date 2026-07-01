import React, { useState, useMemo } from 'react';
import {
  Monitor,
  Crosshair,
  ShieldCheck,
  Download,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  ClipboardList,
  User,
  ChevronRight,
  CircleDot,
  PhoneCall,
  FileCheck2,
  Megaphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Ocorrencia, Chamado, AvaliacaoPorteiro, RelatorioDiario } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const prioridadeVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  baixa: 'success',
  media: 'warning',
  alta: 'danger',
  critica: 'danger',
};

const statusChamadoVariant: Record<string, 'info' | 'warning' | 'success' | 'secondary' | 'danger'> = {
  aberto: 'info',
  atendido: 'warning',
  finalizado: 'success',
  encerrado: 'secondary',
};

const statusChamadoLabel: Record<string, string> = {
  aberto: 'Chamado Aberto',
  atendido: 'Em Atendimento',
  finalizado: 'Finalizado',
  encerrado: 'Encerrado',
};

const situacaoDiariaInfo = {
  normal: { label: 'Normal', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  atencao: { label: 'Atenção', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  critico: { label: 'Crítico', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const situacaoFechamentoLabel: Record<string, string> = {
  resolvido: 'Resolvido',
  resolvido_parcial: 'Resolvido Parcialmente',
  improcedente: 'Improcedente / Sem Ação Necessária',
  encaminhado_externo: 'Encaminhado para Órgão Externo / Manutenção',
  outros: 'Outros',
};

const situacaoFechamentoVariant: Record<string, 'success' | 'warning' | 'secondary' | 'info'> = {
  resolvido: 'success',
  resolvido_parcial: 'warning',
  improcedente: 'secondary',
  encaminhado_externo: 'info',
  outros: 'secondary',
};

// ─── sub-components ────────────────────────────────────────────────────────────

/** Um "caso" completo: Ocorrência + Chamado linkado (3 camadas) */
const CasoCard: React.FC<{ occ: Ocorrencia; chamado?: Chamado; idx: number }> = ({ occ, chamado, idx }) => {
  const temTatico = !!(chamado?.parecerTecnico || chamado?.conclusaoTecnica);
  const temAdmin = !!(chamado?.observacoesAdmin || chamado?.situacaoFechamento);

  return (
    <div className="relative">
      {/* Número do caso */}
      <div className="absolute -left-4 top-3 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow z-10">
        {idx}
      </div>

      <div className="ml-6 border border-gray-200 rounded-xl overflow-hidden shadow-sm">

        {/* ── BLOCO 1: TÉCNICO DE MONITORAMENTO ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-100 flex-shrink-0" />
          <span className="text-xs font-semibold text-blue-100 uppercase tracking-wide">
            Técnico de Monitoramento
          </span>
          <span className="ml-auto font-mono text-xs text-blue-200">
            {format(new Date(occ.dataAbertura), 'HH:mm')}
          </span>
        </div>

        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-semibold text-gray-800 text-sm">{occ.tipo}</span>
            <span className="text-gray-400 text-xs">/ {occ.categoria}</span>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
              {occ.ambiente}
            </span>
            <Badge variant={prioridadeVariant[occ.prioridade] || 'warning'} size="sm">
              {occ.prioridade}
            </Badge>
            {/* Status do chamado */}
            {chamado && (
              <Badge variant={statusChamadoVariant[chamado.status] || 'info'} size="sm">
                {statusChamadoLabel[chamado.status]}
              </Badge>
            )}
          </div>

          {/* Descrição do monitoramento */}
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
              <CircleDot className="w-3 h-3" />
              Descrição registrada pelo monitoramento:
            </p>
            <p className="text-sm text-gray-800 bg-white border border-blue-200 rounded-lg px-3 py-2 leading-relaxed">
              {occ.descricao || <span className="text-gray-400 italic">Sem descrição registrada.</span>}
            </p>
          </div>

          {/* Técnico que abriu */}
          {chamado?.tecnicoMonitoramento && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <User className="w-3 h-3" />
              Chamado aberto por: <strong>{chamado.tecnicoMonitoramento}</strong>
              {chamado.dataAbertura && (
                <> · {format(new Date(chamado.dataAbertura), 'HH:mm')}</>
              )}
            </p>
          )}
        </div>

        {/* ── CONECTOR ── */}
        {(temTatico || temAdmin) && (
          <div className="flex items-center justify-center py-1.5 bg-gray-50 border-b border-gray-100">
            <ChevronRight className="w-4 h-4 text-gray-300 rotate-90" />
          </div>
        )}

        {/* ── BLOCO 2: TÉCNICO TÁTICO ── */}
        {temTatico && (
          <>
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-green-100 flex-shrink-0" />
              <span className="text-xs font-semibold text-green-100 uppercase tracking-wide">
                Técnico Tático — Atendimento Presencial
              </span>
              {chamado?.tecnicoTatico && (
                <span className="ml-auto text-xs text-green-200 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {chamado.tecnicoTatico}
                </span>
              )}
            </div>

            <div className="bg-green-50 px-4 py-3 border-b border-green-100">
              {chamado?.dataAtendimento && (
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <PhoneCall className="w-3 h-3 text-green-600" />
                  Atendimento iniciado: <strong>{format(new Date(chamado.dataAtendimento), 'dd/MM/yyyy HH:mm')}</strong>
                </p>
              )}

              {chamado?.parecerTecnico && (
                <div className="mb-2">
                  <p className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                    <CircleDot className="w-3 h-3" />
                    Parecer Técnico:
                  </p>
                  <p className="text-sm text-gray-800 bg-white border border-green-200 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                    {chamado.parecerTecnico}
                  </p>
                </div>
              )}

              {chamado?.conclusaoTecnica && (
                <div>
                  <p className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                    <FileCheck2 className="w-3 h-3" />
                    Conclusão Técnica:
                  </p>
                  <p className="text-sm text-gray-800 bg-white border border-green-200 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                    {chamado.conclusaoTecnica}
                  </p>
                </div>
              )}

              {chamado?.dataFinalizacao && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Finalizado em: <strong>{format(new Date(chamado.dataFinalizacao), 'dd/MM/yyyy HH:mm')}</strong>
                </p>
              )}
            </div>

            {/* CONECTOR para admin */}
            {temAdmin && (
              <div className="flex items-center justify-center py-1.5 bg-gray-50 border-b border-gray-100">
                <ChevronRight className="w-4 h-4 text-gray-300 rotate-90" />
              </div>
            )}
          </>
        )}

        {/* ── BLOCO 3: ADMINISTRATIVO ── */}
        {temAdmin && (
          <>
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-200 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                Administrativo — Encerramento
              </span>
              {chamado?.encerradoPor && (
                <span className="ml-auto text-xs text-slate-300 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {chamado.encerradoPor}
                </span>
              )}
            </div>

            <div className="bg-slate-50 px-4 py-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                {chamado?.dataEncerramento && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    Encerrado em: <strong>{format(new Date(chamado.dataEncerramento), 'dd/MM/yyyy HH:mm')}</strong>
                  </p>
                )}
                {chamado?.situacaoFechamento && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Situação do encerramento:</span>
                    <Badge variant={situacaoFechamentoVariant[chamado.situacaoFechamento] || 'secondary'} size="sm">
                      {situacaoFechamentoLabel[chamado.situacaoFechamento] || chamado.situacaoFechamento}
                    </Badge>
                  </div>
                )}
              </div>

              {chamado?.observacoesAdmin && (
                <div>
                  <p className="text-xs text-slate-700 font-medium mb-1 flex items-center gap-1">
                    <Megaphone className="w-3 h-3" />
                    Parecer / Observações do Administrador:
                  </p>
                  <p className="text-sm text-gray-800 bg-white border border-slate-300 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                    {chamado.observacoesAdmin}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Se chamado aberto sem nenhum atendimento */}
        {chamado && chamado.status === 'aberto' && !temTatico && !temAdmin && (
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-t border-blue-100">
            <PhoneCall className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-600 font-medium">
              Aguardando atendimento do Técnico Tático
            </span>
          </div>
        )}

        {/* Sem chamado */}
        {!chamado && (
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
            <CircleDot className="w-4 h-4 text-gray-300" />
            <span className="text-xs text-gray-400">Nenhum chamado vinculado a esta ocorrência</span>
          </div>
        )}
      </div>
    </div>
  );
};



/** Avaliação de portaria */
const AvaliacaoCard: React.FC<{ aval: AvaliacaoPorteiro }> = ({ aval }) => (
  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
    <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2 flex items-center gap-2">
      <ShieldCheck className="w-4 h-4 text-slate-200" />
      <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
        Avaliação de Portaria — Técnico Tático
      </span>
    </div>
    <div className="bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <span className="font-medium text-sm text-gray-800 flex items-center gap-1">
          <User className="w-4 h-4 text-slate-500" />
          {aval.porteiroNome}
        </span>
        <Badge variant={aval.situacao === 'funcional' ? 'success' : 'danger'} size="sm">
          {aval.situacao === 'funcional' ? 'Funcional' : 'Não Funcional'}
        </Badge>
        {aval.motivo && (
          <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            {aval.motivo}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-500 flex items-center gap-1">
          <Crosshair className="w-3 h-3 text-green-600" />
          {aval.tecnicoResponsavel}
        </span>
      </div>
      {aval.observacoes && (
        <p className="text-sm text-gray-700 bg-white border border-slate-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
          {aval.observacoes}
        </p>
      )}
    </div>
  </div>
);

// ─── main page ─────────────────────────────────────────────────────────────────

const RelatorioDiarioUnificado: React.FC = () => {
  const { ocorrencias, chamados, avaliacoesPorteiros, escolas } = useApp();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEscola, setSelectedEscola] = useState('');

  const targetDate = useMemo(() => new Date(selectedDate + 'T12:00:00'), [selectedDate]);

  const ocorrenciasDia = useMemo(
    () => ocorrencias.filter(o => sameDay(new Date(o.dataAbertura), targetDate) && (!selectedEscola || o.escolaId === selectedEscola)),
    [ocorrencias, targetDate, selectedEscola]
  );

  const avaliacoesDia = useMemo(
    () => avaliacoesPorteiros.filter(a => sameDay(new Date(a.data), targetDate) && (!selectedEscola || a.escolaId === selectedEscola)),
    [avaliacoesPorteiros, targetDate, selectedEscola]
  );

  // helper: retorna o chamado vinculado a uma ocorrência
  const getChamado = (occId: string) => chamados.find(c => c.ocorrenciaId === occId);

  // lista de escolas com dados no dia
  const escolasList = useMemo(
    () => (selectedEscola ? escolas.filter(e => e.id === selectedEscola) : escolas),
    [escolas, selectedEscola]
  );

  const escolasComDados = useMemo(() => {
    return escolasList.map(escola => {
      const ocorrs = ocorrenciasDia.filter(o => o.escolaId === escola.id);
      const avals = avaliacoesDia.filter(a => a.escolaId === escola.id);
      const total = ocorrs.length + avals.length;
      return { escola, ocorrs, avals, total };
    });
  }, [escolasList, ocorrenciasDia, avaliacoesDia]);

  // contadores para os cards de resumo
  const summary = useMemo(() => {
    const totalOcorr = ocorrenciasDia.length;
    const totalTatico = ocorrenciasDia.filter(o => {
      const ch = getChamado(o.id);
      return ch?.parecerTecnico || ch?.conclusaoTecnica;
    }).length;
    const totalAdmin = ocorrenciasDia.filter(o => {
      const ch = getChamado(o.id);
      return ch?.observacoesAdmin;
    }).length;
    const abertos = ocorrenciasDia.filter(o => {
      const ch = getChamado(o.id);
      return ch?.status === 'aberto' || !ch;
    }).length;
    return { totalOcorr, totalTatico, totalAdmin, abertos };
  }, [ocorrenciasDia, chamados]);

  // ── PDF export ────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    const dateLabel = format(targetDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    let y = 18;

    // Cabeçalho
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 297, 14, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('RELATÓRIO DIÁRIO UNIFICADO – SIME / NISE', 14, 9.5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dateLabel}   |   Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 180, 9.5);
    doc.setTextColor(0, 0, 0);
    y = 22;

    for (const { escola, ocorrs, avals } of escolasComDados) {
      if (y > 170) { doc.addPage(); y = 20; }

      // Escola header
      doc.setFillColor(30, 64, 175);
      doc.rect(14, y, 268, 7, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`  ${escola.nome}  (${escola.tipo})`, 14, y + 5);
      doc.setTextColor(0, 0, 0);
      y += 11;

      // Ocorrências linkadas
      for (let i = 0; i < ocorrs.length; i++) {
        const occ = ocorrs[i];
        const ch = getChamado(occ.id);
        if (y > 150) { doc.addPage(); y = 20; }

        // Número do caso
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Caso ${i + 1} — ${format(new Date(occ.dataAbertura), 'HH:mm')}`, 14, y);
        y += 4;

        // Bloco Monitoramento
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('1. TÉCNICO DE MONITORAMENTO', 16, y);
        doc.setTextColor(0, 0, 0);
        y += 3;
        autoTable(doc, {
          startY: y,
          head: [['Hora', 'Tipo / Categoria', 'Ambiente', 'Prioridade', 'Status Chamado', 'Descrição — Monitoramento']],
          body: [[
            format(new Date(occ.dataAbertura), 'HH:mm'),
            `${occ.tipo} / ${occ.categoria}`,
            occ.ambiente,
            occ.prioridade.toUpperCase(),
            ch ? statusChamadoLabel[ch.status] : 'Sem chamado',
            occ.descricao,
          ]],
          styles: { fontSize: 7.5, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: { 5: { cellWidth: 90 } },
          margin: { left: 16, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 2;

        // Bloco Tático
        if (ch?.parecerTecnico || ch?.conclusaoTecnica) {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text('2. TÉCNICO TÁTICO', 16, y);
          doc.setTextColor(0, 0, 0);
          y += 3;
          autoTable(doc, {
            startY: y,
            head: [['Técnico Tático', 'Parecer Técnico', 'Conclusão Técnica']],
            body: [[
              ch.tecnicoTatico || '-',
              ch.parecerTecnico || '-',
              ch.conclusaoTecnica || '-',
            ]],
            styles: { fontSize: 7.5, cellPadding: 2 },
            headStyles: { fillColor: [5, 150, 105] },
            columnStyles: { 1: { cellWidth: 100 }, 2: { cellWidth: 80 } },
            margin: { left: 16, right: 14 },
          });
          y = (doc as any).lastAutoTable.finalY + 2;
        }

        // Bloco Admin
        if (ch?.observacoesAdmin || ch?.situacaoFechamento) {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text('3. ADMINISTRATIVO', 16, y);
          doc.setTextColor(0, 0, 0);
          y += 3;
          autoTable(doc, {
            startY: y,
            head: [['Encerrado por', 'Data Encerramento', 'Situação do Encerramento', 'Parecer / Observações do Administrador']],
            body: [[
              ch.encerradoPor || '-',
              ch.dataEncerramento ? format(new Date(ch.dataEncerramento), 'dd/MM/yyyy HH:mm') : '-',
              situacaoFechamentoLabel[ch.situacaoFechamento || ''] || ch.situacaoFechamento || '-',
              ch.observacoesAdmin || '-',
            ]],
            styles: { fontSize: 7.5, cellPadding: 2 },
            headStyles: { fillColor: [100, 116, 139] },
            columnStyles: { 2: { cellWidth: 50 }, 3: { cellWidth: 110 } },
            margin: { left: 16, right: 14 },
          });
          y = (doc as any).lastAutoTable.finalY + 2;
        }

        y += 4;
      }

      // Avaliações
      if (avals.length > 0) {
        if (y > 160) { doc.addPage(); y = 20; }
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('AVALIAÇÃO DE PORTARIA — Técnico Tático', 14, y);
        doc.setTextColor(0, 0, 0);
        y += 3;
        autoTable(doc, {
          startY: y,
          head: [['Porteiro', 'Situação', 'Motivos', 'Técnico Responsável', 'Observações']],
          body: avals.map(a => [
            a.porteiroNome,
            a.situacao === 'funcional' ? 'Funcional' : 'Não Funcional',
            a.motivo || '-',
            a.tecnicoResponsavel,
            a.observacoes || '-',
          ]),
          styles: { fontSize: 7.5, cellPadding: 2 },
          headStyles: { fillColor: [100, 116, 139] },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }
    }

    doc.save(`Relatorio_Diario_Unificado_${format(targetDate, 'yyyyMMdd')}.pdf`);
  };

  // ── Excel export ──────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateLabel = format(targetDate, 'dd/MM/yyyy');
    const escolasMap = new Map(escolas.map(e => [e.id, e.nome]));

    const rows = ocorrenciasDia.map(occ => {
      const ch = getChamado(occ.id);
      return {
        Data: dateLabel,
        Hora: format(new Date(occ.dataAbertura), 'HH:mm'),
        Unidade: occ.escolaNome || escolasMap.get(occ.escolaId) || '-',
        Tipo: occ.tipo,
        Categoria: occ.categoria,
        Ambiente: occ.ambiente,
        Prioridade: occ.prioridade,
        'Status do Chamado': ch ? statusChamadoLabel[ch.status] : 'Sem chamado',
        '— MONITORAMENTO — Descrição': occ.descricao,
        '— TÁTICO — Técnico': ch?.tecnicoTatico || '-',
        '— TÁTICO — Parecer Técnico': ch?.parecerTecnico || '-',
        '— TÁTICO — Conclusão Técnica': ch?.conclusaoTecnica || '-',
        '— ADMIN — Encerrado por': ch?.encerradoPor || '-',
        '— ADMIN — Observações': ch?.observacoesAdmin || '-',
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Ocorrências Unificadas');

    const avalRows = avaliacoesDia.map(a => ({
      Data: dateLabel,
      Unidade: a.escolaNome || escolasMap.get(a.escolaId) || '-',
      Porteiro: a.porteiroNome,
      Situação: a.situacao === 'funcional' ? 'Funcional' : 'Não Funcional',
      Motivos: a.motivo || '-',
      'Técnico Responsável': a.tecnicoResponsavel,
      Observações: a.observacoes || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(avalRows), 'Avaliação Portaria');

    XLSX.writeFile(wb, `Relatorio_Diario_Unificado_${format(targetDate, 'yyyyMMdd')}.xlsx`);
  };

  const totalRegistros = ocorrenciasDia.length + avaliacoesDia.length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório Diário Unificado</h1>
          </div>
          <p className="text-gray-500 text-sm ml-12">
            Fluxo completo por ocorrência: Monitoramento → Tático → Administrativo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportPDF}>
            PDF
          </Button>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportExcel}>
            Excel
          </Button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <Card padding="sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select
            label="Unidade"
            value={selectedEscola}
            onChange={(e) => setSelectedEscola(e.target.value)}
            options={[
              { value: '', label: 'Todas as unidades' },
              ...escolas.map(e => ({ value: e.id, label: e.nome })),
            ]}
          />
          <div className="flex items-end gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 justify-center">
            <Filter className="w-4 h-4" />
            <span>
              <strong className="text-gray-900">{totalRegistros}</strong> registro(s) ·{' '}
              {format(targetDate, "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalOcorr}</p>
              <p className="text-xs text-blue-700 font-medium">Monitoramento</p>
              <p className="text-xs text-gray-400">ocorrências</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-amber-400">
          <div className="flex items-center gap-3">
            <PhoneCall className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.abertos}</p>
              <p className="text-xs text-amber-700 font-medium">Chamados abertos</p>
              <p className="text-xs text-gray-400">aguardando</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <Crosshair className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalTatico}</p>
              <p className="text-xs text-green-700 font-medium">Tático</p>
              <p className="text-xs text-gray-400">pareceres</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-slate-500">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-slate-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalAdmin}</p>
              <p className="text-xs text-slate-700 font-medium">Administrativo</p>
              <p className="text-xs text-gray-400">encerramentos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Legenda de fluxo ── */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
        <span className="font-medium text-gray-600">Fluxo por ocorrência:</span>
        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded">
          <Monitor className="w-3 h-3" /> 1. Monitoramento
        </span>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
          <Crosshair className="w-3 h-3" /> 2. Tático
        </span>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded">
          <ShieldCheck className="w-3 h-3" /> 3. Administrativo
        </span>
        <span className="ml-auto text-gray-400">Cada bloco aparece apenas quando há dados registrados</span>
      </div>

      {/* ── Conteúdo por escola ── */}
      <div className="space-y-8">
        {escolasComDados.map(({ escola, ocorrs, avals }) => (
          <div key={escola.id}>
            {/* Header da escola */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`bg-gradient-to-r flex items-center gap-3 px-4 py-3 rounded-xl shadow flex-1 ${ocorrs.length + avals.length === 0 ? 'from-slate-300 to-slate-200' : 'from-blue-700 to-blue-600'}`}>
                <Building2 className={`w-5 h-5 ${ocorrs.length + avals.length === 0 ? 'text-slate-400' : 'text-blue-200'}`} />
                <div>
                  <h2 className={`font-bold ${ocorrs.length + avals.length === 0 ? 'text-slate-500' : 'text-white'}`}>{escola.nome}</h2>
                  <p className={`text-xs ${ocorrs.length + avals.length === 0 ? 'text-slate-400' : 'text-blue-200'}`}>
                    {escola.tipo} · {escola.cameras} câmeras ·{' '}
                    {format(targetDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <span className={`ml-auto text-sm font-bold px-3 py-1 rounded-full ${ocorrs.length + avals.length === 0 ? 'bg-slate-300 text-slate-500' : 'bg-white/20 text-white'}`}>
                  {ocorrs.length + avals.length} reg.
                </span>
              </div>
            </div>

            {ocorrs.length + avals.length === 0 ? (
              <div className="pl-4">
                <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center">
                  <ClipboardList className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Nenhum registro para esta unidade nesta data</p>
                </div>
              </div>
            ) : (
              <>
                {/* Casos (ocorrência → chamado → admin) */}
                {ocorrs.length > 0 && (
                  <div className="pl-4 space-y-5">
                    {ocorrs.map((occ, idx) => (
                      <CasoCard
                        key={occ.id}
                        occ={occ}
                        chamado={getChamado(occ.id)}
                        idx={idx + 1}
                      />
                    ))}
                  </div>
                )}

                {/* Avaliações de portaria */}
                {avals.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">
                      Avaliações de Portaria
                    </p>
                    {avals.map(a => <AvaliacaoCard key={a.id} aval={a} />)}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatorioDiarioUnificado;
