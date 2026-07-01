import React, { useState, useMemo } from 'react';
import { Phone, MapPin, Clock, CheckCircle, User, Camera, AlertCircle, ShieldCheck, XCircle, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Textarea, Select } from '../components/ui/Input';
import { Chamado, Ocorrencia } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Calls: React.FC = () => {
  const { chamados, ocorrencias, updateChamado, updateOcorrencia, currentUser } = useApp();
  const { showToast } = useToast();

  const isAdmin = currentUser.perfil === 'admin';

  const [selectedCall, setSelectedCall] = useState<Chamado | null>(null);
  const [showAttendModal, setShowAttendModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [finishForm, setFinishForm] = useState({
    parecer: '',
    conclusao: '',
  });

  const [reportForm, setReportForm] = useState({
    parecer: '',
    conclusao: '',
  });

  const [closeForm, setCloseForm] = useState({
    observacoes: '',
    situacaoFechamento: 'resolvido',
  });

  const getSituacaoFechamentoLabel = (situacao?: string) => {
    const labels: Record<string, string> = {
      resolvido: 'Resolvido',
      resolvido_parcial: 'Resolvido Parcialmente',
      improcedente: 'Improcedente / Sem Ação Necessária',
      encaminhado_externo: 'Encaminhado para Órgão Externo / Manutenção',
      outros: 'Outros',
    };
    return labels[situacao || ''] || situacao || 'Não informada';
  };

  const getSituacaoFechamentoColor = (situacao?: string) => {
    const colors: Record<string, string> = {
      resolvido: 'bg-green-50 text-green-700 border border-green-200',
      resolvido_parcial: 'bg-amber-50 text-amber-700 border border-amber-200',
      improcedente: 'bg-gray-100 text-gray-700 border border-gray-200',
      encaminhado_externo: 'bg-blue-50 text-blue-700 border border-blue-200',
      outros: 'bg-slate-50 text-slate-700 border border-slate-200',
    };
    return colors[situacao || ''] || 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  // Merge chamados with ocorrencias
  const callsWithDetails = useMemo(() => {
    return chamados.map(chamado => {
      const ocorrencia = ocorrencias.find(o => o.id === chamado.ocorrenciaId);
      return { chamado, ocorrencia };
    }).filter(item => item.ocorrencia);
  }, [chamados, ocorrencias]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'info' | 'warning' | 'success' | 'secondary'> = {
      aberto: 'info',
      atendido: 'warning',
      aguardando_resposta: 'warning',
      finalizado: 'success',
      encerrado: 'secondary',
    };
    return colors[status] || 'info';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberto: 'Aberto',
      atendido: 'Em Atendimento',
      aguardando_resposta: 'Aguardando Diretor',
      finalizado: 'Finalizado',
      encerrado: 'Encerrado',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, 'success' | 'warning' | 'danger'> = {
      baixa: 'success',
      media: 'warning',
      alta: 'danger',
      critica: 'danger',
    };
    return colors[priority] || 'warning';
  };

  const handleAttend = async () => {
    if (!selectedCall) return;
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateChamado(selectedCall.id, {
        status: 'atendido',
        tecnicoTatico: currentUser.nome,
        dataAtendimento: new Date(),
      });
      
      updateOcorrencia(selectedCall.ocorrenciaId, {
        status: 'em_atendimento',
      });

      showToast('success', 'Chamado atendido com sucesso!');
      setShowAttendModal(false);
      setSelectedCall(null);
    } catch (error) {
      showToast('error', 'Erro ao atender chamado');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!selectedCall || !finishForm.parecer.trim()) return;
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateChamado(selectedCall.id, {
        status: 'finalizado',
        dataFinalizacao: new Date(),
        parecerTecnico: finishForm.parecer,
        conclusaoTecnica: finishForm.conclusao,
      });
      
      updateOcorrencia(selectedCall.ocorrenciaId, {
        status: 'finalizada',
        dataEncerramento: new Date(),
      });

      showToast('success', 'Atendimento finalizado com sucesso!');
      setShowFinishModal(false);
      setSelectedCall(null);
      setFinishForm({ parecer: '', conclusao: '' });
    } catch (error) {
      showToast('error', 'Erro ao finalizar atendimento');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedCall || !reportForm.parecer.trim()) return;
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateChamado(selectedCall.id, {
        parecerTecnico: reportForm.parecer,
        conclusaoTecnica: reportForm.conclusao,
      });

      showToast('success', 'Descrição tática salva com sucesso!');
      setShowReportModal(false);
      setSelectedCall(null);
      setReportForm({ parecer: '', conclusao: '' });
    } catch (error) {
      showToast('error', 'Erro ao salvar descrição tática');
    } finally {
      setLoading(false);
    }
  };

  const handleAguardarResposta = async () => {
    if (!selectedCall) return;
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      updateChamado(selectedCall.id, { 
        status: 'aguardando_resposta',
        parecerTecnico: finishForm.parecer,
        conclusaoTecnica: finishForm.conclusao
      });
      showToast('success', 'Chamado aguardando resposta do diretor');
      setShowFinishModal(false);
      setSelectedCall(null);
      setFinishForm({ parecer: '', conclusao: '' });
    } catch (error) {
      showToast('error', 'Erro ao alterar status');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!selectedCall) return;
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateChamado(selectedCall.id, {
        status: 'encerrado',
        dataEncerramento: new Date(),
        observacoesAdmin: closeForm.observacoes,
        encerradoPor: currentUser.nome,
        situacaoFechamento: closeForm.situacaoFechamento,
      });
      
      updateOcorrencia(selectedCall.ocorrenciaId, {
        status: 'encerrada',
        dataEncerramento: new Date(),
      });

      showToast('success', 'Chamado encerrado com sucesso!');
      setShowCloseModal(false);
      setSelectedCall(null);
      setCloseForm({ observacoes: '', situacaoFechamento: 'resolvido' });
    } catch (error) {
      showToast('error', 'Erro ao encerrar chamado');
    } finally {
      setLoading(false);
    }
  };

  const CallCard: React.FC<{ item: { chamado: Chamado; ocorrencia?: Ocorrencia } }> = ({ item }) => {
    const { chamado, ocorrencia } = item;
    if (!ocorrencia) return null;

    return (
      <Card 
        hover 
        className="cursor-pointer transition-all duration-200 hover:border-blue-200"
        onClick={() => setSelectedCall(item.chamado)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {chamado.id.slice(0, 8)}
              </span>
              <Badge variant={getStatusColor(chamado.status)} size="sm">
                {getStatusLabel(chamado.status)}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900">{ocorrencia.tipo}</h3>
          </div>
          <Badge variant={getPriorityColor(ocorrencia.prioridade)} size="sm">
            {ocorrencia.prioridade}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            {ocorrencia.escolaNome}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            Aberto por: {chamado.tecnicoMonitoramento}
          </div>
          {chamado.tecnicoTatico && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              Atendido por: {chamado.tecnicoTatico}
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4 text-gray-400" />
            {formatDistanceToNow(new Date(chamado.dataAbertura), { addSuffix: true, locale: ptBR })}
          </div>
        </div>

        {/* Technician's Report in Card */}
        {(chamado.status === 'finalizado' || chamado.status === 'encerrado') && chamado.parecerTecnico && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <User className="w-3 h-3" />
              Parecer do Técnico Tático
            </div>
            <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded line-clamp-2">
              {chamado.parecerTecnico}
            </p>
          </div>
        )}

        {/* Admin Close Info */}
        {chamado.status === 'encerrado' && (chamado.observacoesAdmin || chamado.situacaoFechamento) && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Encerrado por: {chamado.encerradoPor}
              </div>
              {chamado.situacaoFechamento && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getSituacaoFechamentoColor(chamado.situacaoFechamento)}`}>
                  {getSituacaoFechamentoLabel(chamado.situacaoFechamento)}
                </span>
              )}
            </div>
            {chamado.observacoesAdmin && (
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {chamado.observacoesAdmin}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {chamado.status === 'aberto' && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCall(chamado);
                setShowAttendModal(true);
              }}
              icon={<Phone className="w-3 h-3" />}
            >
              Atender
            </Button>
          </div>
        )}

        {chamado.status === 'atendido' && isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <Button 
              size="sm" 
              variant="success"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCall(chamado);
                setFinishForm({ 
                  parecer: chamado.parecerTecnico || '', 
                  conclusao: chamado.conclusaoTecnica || '' 
                });
                setShowFinishModal(true);
              }}
              icon={<CheckCircle className="w-3 h-3" />}
            >
              Finalizar Atendimento
            </Button>
          </div>
        )}

        {chamado.status === 'aguardando_resposta' && isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <Button 
              size="sm" 
              variant="success"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCall(chamado);
                setFinishForm({ 
                  parecer: chamado.parecerTecnico || '', 
                  conclusao: chamado.conclusaoTecnica || '' 
                });
                setShowFinishModal(true);
              }}
              icon={<CheckCircle className="w-3 h-3" />}
            >
              Concluir e Finalizar
            </Button>
          </div>
        )}

        {chamado.status === 'atendido' && !isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCall(chamado);
                setReportForm({ 
                  parecer: chamado.parecerTecnico || '', 
                  conclusao: chamado.conclusaoTecnica || '' 
                });
                setShowReportModal(true);
              }}
              icon={<FileText className="w-3 h-3" />}
            >
              {chamado.parecerTecnico ? 'Editar Descrição Tática' : 'Adicionar Descrição Tática'}
            </Button>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded p-2 mt-2">
              <Clock className="w-3 h-3" />
              Em atendimento (Aguardando administrador)
            </div>
          </div>
        )}

        {chamado.status === 'finalizado' && isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <Button 
              size="sm" 
              variant="danger"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCall(chamado);
                setShowCloseModal(true);
              }}
              icon={<ShieldCheck className="w-3 h-3" />}
            >
              Encerrar
            </Button>
          </div>
        )}

        {chamado.status === 'finalizado' && !isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
              <Clock className="w-3 h-3" />
              Aguardando encerramento do administrador
            </div>
          </div>
        )}
      </Card>
    );
  };

  const stats = useMemo(() => {
    return {
      aberto: chamados.filter(c => c.status === 'aberto').length,
      atendido: chamados.filter(c => c.status === 'atendido' || c.status === 'aguardando_resposta').length,
      finalizado: chamados.filter(c => c.status === 'finalizado').length,
      encerrado: chamados.filter(c => c.status === 'encerrado').length,
      total: chamados.length,
    };
  }, [chamados]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Chamados</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerenciamento de atendimentos e encerramentos
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {stats.finalizado} chamado(s) aguardando seu encerramento
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="text-center p-3 md:p-4">
          <p className="text-2xl md:text-3xl font-bold text-blue-600">{stats.aberto}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Abertos</p>
        </Card>
        <Card className="text-center p-3 md:p-4">
          <p className="text-2xl md:text-3xl font-bold text-amber-600">{stats.atendido}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Em Atendimento</p>
        </Card>
        <Card className="text-center p-3 md:p-4">
          <p className="text-2xl md:text-3xl font-bold text-green-600">{stats.finalizado}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Aguardando Encerramento</p>
        </Card>
        <Card className="text-center p-3 md:p-4">
          <p className="text-2xl md:text-3xl font-bold text-slate-600">{stats.encerrado}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Encerrados</p>
        </Card>
        <Card className="text-center p-3 md:p-4 md:col-span-1 col-span-2">
          <p className="text-2xl md:text-3xl font-bold text-gray-600">{stats.total}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Total</p>
        </Card>
      </div>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Abertos */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Abertos ({stats.aberto})</h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            {callsWithDetails
              .filter(item => item.chamado.status === 'aberto')
              .map(item => (
                <CallCard key={item.chamado.id} item={item} />
              ))}
            {stats.aberto === 0 && (
              <div className="text-center py-6 md:py-8 text-gray-400 bg-gray-50 rounded-lg">
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs md:text-sm">Nenhum chamado em aberto</p>
              </div>
            )}
          </div>
        </div>

        {/* Em Atendimento */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Em Atendimento ({stats.atendido})</h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            {callsWithDetails
              .filter(item => item.chamado.status === 'atendido' || item.chamado.status === 'aguardando_resposta')
              .map(item => (
                <CallCard key={item.chamado.id} item={item} />
              ))}
            {stats.atendido === 0 && (
              <div className="text-center py-6 md:py-8 text-gray-400 bg-gray-50 rounded-lg">
                <Clock className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs md:text-sm">Nenhum chamado em atendimento</p>
              </div>
            )}
          </div>
        </div>

        {/* Aguardando Encerramento */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Finalizados ({stats.finalizado})</h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            {callsWithDetails
              .filter(item => item.chamado.status === 'finalizado')
              .map(item => (
                <CallCard key={item.chamado.id} item={item} />
              ))}
            {stats.finalizado === 0 && (
              <div className="text-center py-6 md:py-8 text-gray-400 bg-gray-50 rounded-lg">
                <CheckCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs md:text-sm">Nenhum chamado finalizado</p>
              </div>
            )}
          </div>
        </div>

        {/* Encerrados */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Encerrados ({stats.encerrado})</h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            {callsWithDetails
              .filter(item => item.chamado.status === 'encerrado')
              .map(item => (
                <CallCard key={item.chamado.id} item={item} />
              ))}
            {stats.encerrado === 0 && (
              <div className="text-center py-6 md:py-8 text-gray-400 bg-gray-50 rounded-lg">
                <XCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs md:text-sm">Nenhum chamado encerrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attend Modal */}
      <Modal
        isOpen={showAttendModal}
        onClose={() => { setShowAttendModal(false); setSelectedCall(null); }}
        title="Atender Chamado"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowAttendModal(false); setSelectedCall(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleAttend} loading={loading} icon={<Phone className="w-4 h-4" />}>
              Confirmar Atendimento
            </Button>
          </div>
        }
      >
        {selectedCall && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Ao confirmar, você assume a responsabilidade pelo atendimento deste chamado. 
                Um técnico tático será direcionado à unidade para verificação presencial.
              </p>
            </div>
            
            {(() => {
              const occ = ocorrencias.find(o => o.id === selectedCall.ocorrenciaId);
              return occ ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Ocorrência</p>
                    <p className="font-medium">{occ.tipo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Unidade</p>
                    <p className="font-medium">{occ.escolaNome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Prioridade</p>
                    <Badge variant={getPriorityColor(occ.prioridade)}>{occ.prioridade}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Técnico</p>
                    <p className="font-medium">{currentUser.nome}</p>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </Modal>

      {/* Finish Modal (Technical) */}
      <Modal
        isOpen={showFinishModal}
        onClose={() => { setShowFinishModal(false); setSelectedCall(null); setFinishForm({ parecer: '', conclusao: '' }); }}
        title="Finalizar Atendimento"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowFinishModal(false); setSelectedCall(null); setFinishForm({ parecer: '', conclusao: '' }); }}>
              Cancelar
            </Button>
            {selectedCall?.status !== 'aguardando_resposta' && (
              <Button onClick={handleAguardarResposta} loading={loading} variant="warning" icon={<Clock className="w-4 h-4" />}>
                Aguardar Diretor
              </Button>
            )}
            <Button onClick={handleFinish} loading={loading} variant="success" icon={<CheckCircle className="w-4 h-4" />}>
              Concluir e Finalizar
            </Button>
          </div>
        }
      >
        {selectedCall && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                Preencha a conclusão. Caso precise aguardar informações do diretor, clique em "Aguardar Diretor". Após finalizar, o chamado ficará aguardando o encerramento.
              </p>
            </div>
            <Textarea
              label="Parecer Técnico"
              required
              rows={4}
              value={finishForm.parecer}
              onChange={(e) => setFinishForm(prev => ({ ...prev, parecer: e.target.value }))}
              placeholder="Descreva as ações tomadas, verificações realizadas e situação encontrada..."
            />
            
            <Textarea
              label="Conclusão"
              rows={2}
              value={finishForm.conclusao}
              onChange={(e) => setFinishForm(prev => ({ ...prev, conclusao: e.target.value }))}
              placeholder="Descreva a conclusão do atendimento e recomendações, se houver..."
            />

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-sm text-gray-900 mb-3">Evidências</h4>
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-6 text-gray-400">
                <div className="text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Arraste fotos ou vídeos aqui</p>
                  <p className="text-xs">ou clique para selecionar</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Modal (Technical) */}
      <Modal
        isOpen={showReportModal}
        onClose={() => { setShowReportModal(false); setSelectedCall(null); setReportForm({ parecer: '', conclusao: '' }); }}
        title="Descrição Tática"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowReportModal(false); setSelectedCall(null); setReportForm({ parecer: '', conclusao: '' }); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveReport} loading={loading} variant="primary" icon={<CheckCircle className="w-4 h-4" />}>
              Salvar Descrição
            </Button>
          </div>
        }
      >
        {selectedCall && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Preencha a descrição tática para registrar suas observações sobre a ocorrência.
              </p>
            </div>
            <Textarea
              label="Parecer Técnico"
              required
              rows={4}
              value={reportForm.parecer}
              onChange={(e) => setReportForm(prev => ({ ...prev, parecer: e.target.value }))}
              placeholder="Descreva as ações tomadas, verificações realizadas e situação encontrada..."
            />
            
            <Textarea
              label="Conclusão"
              rows={2}
              value={reportForm.conclusao}
              onChange={(e) => setReportForm(prev => ({ ...prev, conclusao: e.target.value }))}
              placeholder="Descreva a conclusão do atendimento e recomendações, se houver..."
            />

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-sm text-gray-900 mb-3">Evidências</h4>
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-6 text-gray-400">
                <div className="text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Arraste fotos ou vídeos aqui</p>
                  <p className="text-xs">ou clique para selecionar</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Close Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => { setShowCloseModal(false); setSelectedCall(null); setCloseForm({ observacoes: '' }); }}
        title="Encerrar Chamado"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowCloseModal(false); setSelectedCall(null); setCloseForm({ observacoes: '' }); }}>
              Cancelar
            </Button>
            <Button onClick={handleClose} loading={loading} variant="danger" icon={<ShieldCheck className="w-4 h-4" />}>
              Encerrar Chamado
            </Button>
          </div>
        }
      >
        {selectedCall && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> Ao encerrar este chamado, ele será finalizado permanentemente. 
                Esta ação não pode ser desfeita.
              </p>
            </div>

            {/* Summary of the call */}
            {(() => {
              const occ = ocorrencias.find(o => o.id === selectedCall.ocorrenciaId);
              return occ ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Resumo do Chamado</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">ID</p>
                      <p className="font-mono">{selectedCall.id.slice(0, 12)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ocorrência</p>
                      <p className="font-medium">{occ.tipo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Unidade</p>
                      <p>{occ.escolaNome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Prioridade</p>
                      <Badge variant={getPriorityColor(occ.prioridade)} size="sm">{occ.prioridade}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Aberto por</p>
                      <p>{selectedCall.tecnicoMonitoramento}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Atendido por</p>
                      <p>{selectedCall.tecnicoTatico || 'Não atribuído'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Encerrado pelo Administrador</p>
                      <p className="font-medium">{selectedCall.encerradoPor || currentUser.nome}</p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Technician's Report */}
            {(selectedCall.parecerTecnico || selectedCall.conclusaoTecnica) && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Relato do Técnico Tático</h4>
                <div className="space-y-3 text-sm">
                  {selectedCall.parecerTecnico && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Parecer Técnico</p>
                      <p className="text-gray-700 bg-white p-3 rounded border border-blue-100">
                        {selectedCall.parecerTecnico}
                      </p>
                    </div>
                  )}
                  {selectedCall.conclusaoTecnica && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Conclusão</p>
                      <p className="text-gray-700 bg-white p-3 rounded border border-blue-100">
                        {selectedCall.conclusaoTecnica}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Situação do Encerramento */}
            <Select
              label="Situação do Encerramento"
              value={closeForm.situacaoFechamento}
              onChange={(e) => setCloseForm(prev => ({ ...prev, situacaoFechamento: e.target.value }))}
              options={[
                { value: 'resolvido', label: 'Resolvido' },
                { value: 'resolvido_parcial', label: 'Resolvido Parcialmente' },
                { value: 'improcedente', label: 'Improcedente / Sem Ação Necessária' },
                { value: 'encaminhado_externo', label: 'Encaminhado (Outro Órgão / Manutenção)' },
                { value: 'outros', label: 'Outro' },
              ]}
              required
            />

            {/* Admin Observations */}
            <Textarea
              label="Observações do Administrador"
              rows={4}
              value={closeForm.observacoes}
              onChange={(e) => setCloseForm(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Adicione observações sobre o encerramento deste chamado (opcional). Inclua decisões tomadas, encaminhamentos realizados ou pendências..."
              hint="Este campo é opcional, mas recomendado para manter o histórico completo."
            />

          </div>
        )}
      </Modal>
    </div>
  );
};

export default Calls;