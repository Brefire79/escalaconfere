import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './App.css';

interface Escala {
  tipo: 'delegada' | 'dejem' | 'outros';
  data: string;
  valor: number;
  descricao?: string; // Descrição para tipo 'outros'
}

interface ValoresPlantao {
  delegada: number;
  dejem: number;
  outros: number;
}

const App = () => {
  const [registro, setRegistro] = useState({ tipo: '', data: '', descricao: '' });
  const [valoresPlantao, setValoresPlantao] = useState<ValoresPlantao>({ delegada: 0, dejem: 0, outros: 0 });
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState<'delegada' | 'dejem' | 'outros' | ''>('');
  const [activeTab, setActiveTab] = useState<'calendario' | 'financeiro'>('calendario');
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [escalaEditando, setEscalaEditando] = useState<number | null>(null);

  // Carregar dados do localStorage ao montar
  useEffect(() => {
    const valoresSalvos = localStorage.getItem('valoresPlantao');
    const escalasSalvadas = localStorage.getItem('escalas');
    
    if (valoresSalvos) {
      setValoresPlantao(JSON.parse(valoresSalvos));
    }
    if (escalasSalvadas) {
      setEscalas(JSON.parse(escalasSalvadas));
    }
  }, []);

  // Salvar valores no localStorage sempre que mudam
  useEffect(() => {
    localStorage.setItem('valoresPlantao', JSON.stringify(valoresPlantao));
  }, [valoresPlantao]);

  // Salvar escalas no localStorage sempre que mudam
  useEffect(() => {
    localStorage.setItem('escalas', JSON.stringify(escalas));
  }, [escalas]);

  const adicionarEscala = () => {
    if (!registro.tipo || !registro.data) return;
    const tipoValido = registro.tipo as 'delegada' | 'dejem' | 'outros';
    if (tipoValido !== 'delegada' && tipoValido !== 'dejem' && tipoValido !== 'outros') return;
    
    // Para outros: validar se tem descrição
    if (tipoValido === 'outros' && !registro.descricao?.trim()) {
      alert('Por favor, informe a descrição para o tipo "Outros"');
      return;
    }
    
    // Para delegada e dejem: verificar se já existe qualquer uma delas no mesmo dia
    if (tipoValido === 'delegada' || tipoValido === 'dejem') {
      const jaExisteDelegadaOuDejem = escalas.some(e => 
        e.data === registro.data && (e.tipo === 'delegada' || e.tipo === 'dejem')
      );
      if (jaExisteDelegadaOuDejem) {
        alert('Já existe uma escala (Delegada ou DEJEM) neste dia! Apenas uma é permitida por dia.');
        return;
      }
    }
    // Para outros: não há limite, pode adicionar múltiplas
    
    const novaEscala: Escala = {
      tipo: tipoValido,
      data: registro.data,
      valor: tipoValido === 'outros' ? 0 : (valoresPlantao[tipoValido] || 0)
    };
    
    if (tipoValido === 'outros') {
      novaEscala.descricao = registro.descricao;
    }
    
    setEscalas([...escalas, novaEscala]);
    setRegistro({ tipo: '', data: '', descricao: '' });
  };

  const diasDoMes = () => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    
    const primeiroDiaSemana = primeiroDia.getDay();
    
    const dias: Date[] = [];
    
    for (let i = -primeiroDiaSemana; i < 42 - primeiroDiaSemana; i++) {
      const dia = new Date(ano, mes, i + 1);
      dias.push(dia);
    }
    
    return dias;
  };

  const escalasDoDia = (dia: Date) => {
    const diaString = dia.toISOString().split('T')[0];
    return escalas.filter(e => e.data === diaString);
  };

  const corProntidao = (dia: Date) => {
    const inicio = new Date('2026-01-01');
    const diasPassados = Math.floor((dia.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    // Garantir que o módulo funcione corretamente com números negativos (datas passadas)
    const ciclo = ((diasPassados % 3) + 3) % 3;
    return ciclo === 0 ? 'bg-green-400' : ciclo === 1 ? 'bg-yellow-300' : 'bg-blue-400';
  };

  const formatarMes = (data: Date) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[data.getMonth()]} de ${data.getFullYear()}`;
  };

  const mudarMes = (direcao: number) => {
    const novaData = new Date(mesAtual);
    novaData.setMonth(novaData.getMonth() + direcao);
    setMesAtual(novaData);
  };

  const abrirModalDia = (dia: Date) => {
    setDiaSelecionado(dia);
    setModalAberto(true);
    setEscalaEditando(null);
    setRegistro({ tipo: '', data: dia.toISOString().split('T')[0], descricao: '' });
  };

  const fecharModal = () => {
    setModalAberto(false);
    setDiaSelecionado(null);
    setEscalaEditando(null);
    setRegistro({ tipo: '', data: '', descricao: '' });
  };

  const adicionarEscalaNoDia = () => {
    if (!registro.tipo || !registro.data) return;
    const tipoValido = registro.tipo as 'delegada' | 'dejem' | 'outros';
    if (tipoValido !== 'delegada' && tipoValido !== 'dejem' && tipoValido !== 'outros') return;
    
    // Para outros: validar se tem descrição
    if (tipoValido === 'outros' && !registro.descricao?.trim()) {
      alert('Por favor, informe a descrição para o tipo "Outros"');
      return;
    }
    
    // Para delegada e dejem: verificar se já existe qualquer uma delas no mesmo dia
    if (tipoValido === 'delegada' || tipoValido === 'dejem') {
      const jaExisteDelegadaOuDejem = escalas.some(e => 
        e.data === registro.data && (e.tipo === 'delegada' || e.tipo === 'dejem')
      );
      if (jaExisteDelegadaOuDejem) {
        alert('Já existe uma escala (Delegada ou DEJEM) neste dia! Apenas uma é permitida por dia.');
        return;
      }
    }
    // Para outros: não há limite, pode adicionar múltiplas
    
    const novaEscala: Escala = {
      tipo: tipoValido,
      data: registro.data,
      valor: tipoValido === 'outros' ? 0 : (valoresPlantao[tipoValido] || 0)
    };
    
    if (tipoValido === 'outros') {
      novaEscala.descricao = registro.descricao;
    }
    
    setEscalas([...escalas, novaEscala]);
    setRegistro({ ...registro, tipo: '', descricao: '' });
  };

  const removerEscala = (index: number) => {
    if (confirm('Tem certeza que deseja excluir esta escala?')) {
      const novasEscalas = escalas.filter((_, i) => i !== index);
      setEscalas(novasEscalas);
    }
  };

  const editarEscala = (index: number) => {
    const escala = escalas[index];
    setEscalaEditando(index);
    setRegistro({ tipo: escala.tipo, data: escala.data, descricao: escala.descricao || '' });
  };

  const salvarEdicao = () => {
    if (escalaEditando === null || !registro.tipo) return;
    
    const tipoValido = registro.tipo as 'delegada' | 'dejem' | 'outros';
    
    // Para outros: validar se tem descrição
    if (tipoValido === 'outros' && !registro.descricao?.trim()) {
      alert('Por favor, informe a descrição para o tipo "Outros"');
      return;
    }
    
    const novasEscalas = [...escalas];
    novasEscalas[escalaEditando] = {
      ...novasEscalas[escalaEditando],
      tipo: tipoValido,
      valor: tipoValido === 'outros' ? 0 : (valoresPlantao[tipoValido] || 0),
      descricao: tipoValido === 'outros' ? registro.descricao : undefined
    };
    
    setEscalas(novasEscalas);
    setEscalaEditando(null);
    setRegistro({ tipo: '', data: '', descricao: '' });
  };

  const cancelarEdicao = () => {
    setEscalaEditando(null);
    setRegistro({ tipo: '', data: diaSelecionado?.toISOString().split('T')[0] || '', descricao: '' });
  };


  const agruparPorMes = () => {
    const grupos: { [key: string]: Escala[] } = {};
    
    escalas.forEach(escala => {
      const [ano, mes] = escala.data.split('-');
      const mesAno = `${ano}-${mes}`;
      
      if (!grupos[mesAno]) {
        grupos[mesAno] = [];
      }
      grupos[mesAno].push(escala);
    });
    
    return Object.keys(grupos)
      .sort()
      .reverse()
      .map(mesAno => {
        const [ano, mes] = mesAno.split('-');
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const nomesMes = meses[parseInt(mes) - 1];
        
        const escalasMes = grupos[mesAno];
        const totalDelegada = escalasMes.filter(e => e.tipo === 'delegada').reduce((sum, e) => sum + e.valor, 0);
        const totalDejem = escalasMes.filter(e => e.tipo === 'dejem').reduce((sum, e) => sum + e.valor, 0);
        const totalGeral = totalDelegada + totalDejem;
        
        return {
          mesAno,
          nome: `${nomesMes} de ${ano}`,
          escalas: escalasMes,
          totalDelegada,
          totalDejem,
          totalGeral,
          qtdDelegada: escalasMes.filter(e => e.tipo === 'delegada').length,
          qtdDejem: escalasMes.filter(e => e.tipo === 'dejem').length
        };
      });
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    const mesesAgrupados = agruparPorMes();
    
    doc.setFontSize(18);
    doc.text('Relatório de Escalas - Bombeiro', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);
    
    let yPos = 38;
    
    mesesAgrupados.forEach((mes, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 139);
      doc.text(mes.nome, 14, yPos);
      yPos += 8;
      
      const dadosMes = [
        ['Tipo', 'Quantidade', 'Valor Total'],
        ['Delegada', mes.qtdDelegada.toString(), `R$ ${mes.totalDelegada.toFixed(2)}`],
        ['DEJEM', mes.qtdDejem.toString(), `R$ ${mes.totalDejem.toFixed(2)}`],
        ['TOTAL', (mes.qtdDelegada + mes.qtdDejem).toString(), `R$ ${mes.totalGeral.toFixed(2)}`]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [dadosMes[0]],
        body: dadosMes.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 12;
    });
    
    const totalGeralDelegada = escalas.filter(e => e.tipo === 'delegada').reduce((sum, e) => sum + e.valor, 0);
    const totalGeralDejem = escalas.filter(e => e.tipo === 'dejem').reduce((sum, e) => sum + e.valor, 0);
    const totalGeralCompleto = totalGeralDelegada + totalGeralDejem;
    
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMO GERAL', 14, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      body: [
        ['Total Delegada:', `R$ ${totalGeralDelegada.toFixed(2)}`],
        ['Total DEJEM:', `R$ ${totalGeralDejem.toFixed(2)}`],
        ['TOTAL GERAL:', `R$ ${totalGeralCompleto.toFixed(2)}`]
      ],
      theme: 'plain',
      styles: { fontSize: 12, fontStyle: 'bold' },
      margin: { left: 14 }
    });
    
    doc.save(`escalas-bombeiro-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportarExcel = () => {
    const mesesAgrupados = agruparPorMes();
    const wb = XLSX.utils.book_new();
    
    // Planilha com resumo por mês
    const dadosResumo = mesesAgrupados.map(mes => ({
      'Mês': mes.nome,
      'Delegada (Qtd)': mes.qtdDelegada,
      'Delegada (Valor)': mes.totalDelegada,
      'DEJEM (Qtd)': mes.qtdDejem,
      'DEJEM (Valor)': mes.totalDejem,
      'Total Geral': mes.totalGeral
    }));
    
    const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Mensal');
    
    // Planilha com todas as escalas
    const dadosDetalhados = escalas.map(escala => ({
      'Data': new Date(escala.data).toLocaleDateString('pt-BR'),
      'Tipo': escala.tipo.toUpperCase(),
      'Valor': escala.valor
    }));
    
    const wsDetalhado = XLSX.utils.json_to_sheet(dadosDetalhados);
    XLSX.utils.book_append_sheet(wb, wsDetalhado, 'Todas Escalas');
    
    XLSX.writeFile(wb, `escalas-bombeiro-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="app-container">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'calendario' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendario')}
        >
          Calendário
        </button>
        <button 
          className={`tab ${activeTab === 'financeiro' ? 'active' : ''}`}
          onClick={() => setActiveTab('financeiro')}
        >
          Financeiro
        </button>
      </div>

      {activeTab === 'calendario' && (
        <div className="card">
          <div className="card-content">
            <div className="form-grid">
              <select 
                value={registro.tipo} 
                onChange={e => setRegistro({ ...registro, tipo: e.target.value })} 
                className="input"
              >
                <option value="">Selecione o tipo...</option>
                <option value="delegada">Delegada</option>
                <option value="dejem">DEJEM</option>
                <option value="outros">Outros</option>
              </select>
              <input 
                type="date" 
                value={registro.data} 
                onChange={e => setRegistro({ ...registro, data: e.target.value })}
                className="input"
              />
            </div>
            
            <div className="valores-container">
              <div className="valor-item">
                <span className="label">Delegada:</span>
                <input 
                  type="number" 
                  value={valoresPlantao.delegada || ''} 
                  onChange={e => setValoresPlantao({ ...valoresPlantao, delegada: e.target.value ? parseFloat(e.target.value) : 0 })} 
                  placeholder="0"
                  className="input-small"
                />
              </div>
              <div className="valor-item">
                <span className="label">DEJEM:</span>
                <input 
                  type="number" 
                  value={valoresPlantao.dejem || ''} 
                  onChange={e => setValoresPlantao({ ...valoresPlantao, dejem: e.target.value ? parseFloat(e.target.value) : 0 })} 
                  placeholder="0"
                  className="input-small"
                />
              </div>
            </div>
            
            <button className="button button-add" onClick={adicionarEscala}>
              Adicionar Escala
            </button>
            
            <div className="filtro-container">
              <label>Filtrar por tipo:</label>
              <select 
                value={filtroTipo} 
                onChange={e => setFiltroTipo(e.target.value as 'delegada' | 'dejem' | 'outros' | '')}
                className="input"
              >
                <option value="">Todos</option>
                <option value="delegada">Delegada</option>
                <option value="dejem">DEJEM</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            
            <div className="calendario-header">
              <button className="button" onClick={() => mudarMes(-1)}>Anterior</button>
              <span className="mes-titulo">{formatarMes(mesAtual)}</span>
              <button className="button" onClick={() => mudarMes(1)}>Próximo</button>
            </div>
            
            <div className="calendario-grid">
              <div className="dia-semana">Dom</div>
              <div className="dia-semana">Seg</div>
              <div className="dia-semana">Ter</div>
              <div className="dia-semana">Qua</div>
              <div className="dia-semana">Qui</div>
              <div className="dia-semana">Sex</div>
              <div className="dia-semana">Sáb</div>
              
              {diasDoMes().map((dia, i) => {
                const escalasDia = escalasDoDia(dia);
                const corProntidaoFundo = corProntidao(dia);
                const destaqueFiltro = filtroTipo && escalasDia.some(e => e.tipo === filtroTipo) ? 'ring' : '';
                const mesAtivo = dia.getMonth() === mesAtual.getMonth();
                
                return (
                  <div 
                    key={i} 
                    onClick={() => abrirModalDia(dia)}
                    className={`dia ${destaqueFiltro} ${corProntidaoFundo} ${!mesAtivo ? 'outro-mes' : ''}`}
                  >
                    <span className="dia-numero">{dia.getDate()}</span>
                    {escalasDia.length > 0 && (
                      <div className="eventos-dia">
                        {escalasDia.map((escala, idx) => (
                          <div 
                            key={idx}
                            className={`evento-chip ${
                              escala.tipo === 'delegada' ? 'evento-delegada' : 
                              escala.tipo === 'dejem' ? 'evento-dejem' : 
                              'evento-outros'
                            }`}
                          >
                            {escala.tipo === 'delegada' ? 'DEL' : 
                             escala.tipo === 'dejem' ? 'DEJ' : 
                             'OUT'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eventos do Dia */}
      {modalAberto && diaSelecionado && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{diaSelecionado.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</h3>
              <button className="modal-close" onClick={fecharModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              {/* Adicionar nova escala */}
              <div className="adicionar-escala-section">
                <h4>{escalaEditando !== null ? 'Editar Escala' : 'Adicionar Escala'}</h4>
                <div className="form-inline">
                  <select 
                    value={registro.tipo} 
                    onChange={e => setRegistro({ ...registro, tipo: e.target.value })} 
                    className="input"
                  >
                    <option value="">Selecione...</option>
                    <option value="delegada">Delegada</option>
                    <option value="dejem">DEJEM</option>
                    <option value="outros">Outros</option>
                  </select>
                  {registro.tipo === 'outros' && (
                    <input
                      type="text"
                      value={registro.descricao}
                      onChange={e => setRegistro({ ...registro, descricao: e.target.value })}
                      placeholder="Ex: Tipo de rotina"
                      className="input"
                    />
                  )}
                  {escalaEditando !== null ? (
                    <>
                      <button 
                        className="button button-save-modal" 
                        onClick={salvarEdicao}
                        disabled={!registro.tipo || (registro.tipo === 'outros' && !registro.descricao?.trim())}
                      >
                        Salvar
                      </button>
                      <button 
                        className="button button-cancel-modal" 
                        onClick={cancelarEdicao}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button 
                      className="button button-add-modal" 
                      onClick={adicionarEscalaNoDia}
                      disabled={!registro.tipo || (registro.tipo === 'outros' && !registro.descricao?.trim())}
                    >
                      Adicionar
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de escalas existentes */}
              <div className="escalas-lista-section">
                <h4>Escalas do Dia</h4>
                {escalasDoDia(diaSelecionado).length === 0 ? (
                  <p className="sem-escalas">Nenhuma escala neste dia</p>
                ) : (
                  <div className="escalas-lista">
                    {escalas.map((escala, index) => {
                      if (escala.data === diaSelecionado.toISOString().split('T')[0]) {
                        return (
                          <div key={index} className="escala-item">
                            <div className="escala-info">
                              <span className={`escala-badge ${
                                escala.tipo === 'delegada' ? 'badge-delegada' : 
                                escala.tipo === 'dejem' ? 'badge-dejem' : 
                                'badge-outros'
                              }`}>
                                {escala.tipo === 'delegada' ? 'DELEGADA' : 
                                 escala.tipo === 'dejem' ? 'DEJEM' : 
                                 'OUTROS'}
                              </span>
                              {escala.tipo === 'outros' ? (
                                <span className="escala-descricao">{escala.descricao}</span>
                              ) : (
                                <span className="escala-valor">R$ {escala.valor.toFixed(2)}</span>
                              )}
                            </div>
                            <div className="escala-acoes">
                              <button 
                                className="button-editar"
                                onClick={() => editarEscala(index)}
                                title="Editar escala"
                              >
                                ✏️
                              </button>
                              <button 
                                className="button-remover"
                                onClick={() => removerEscala(index)}
                                title="Remover escala"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="card">
          <div className="card-content">
            <h2>Resumo Financeiro</h2>
            
            <div className="resumo-container">
              <div className="resumo-item">
                <span className="resumo-label">Total Delegada:</span>
                <span className="resumo-valor">
                  R$ {escalas
                    .filter(e => e.tipo === 'delegada')
                    .reduce((sum, e) => sum + e.valor, 0)
                    .toFixed(2)}
                </span>
              </div>
              
              <div className="resumo-item">
                <span className="resumo-label">Total DEJEM:</span>
                <span className="resumo-valor">
                  R$ {escalas
                    .filter(e => e.tipo === 'dejem')
                    .reduce((sum, e) => sum + e.valor, 0)
                    .toFixed(2)}
                </span>
              </div>
              
              <div className="resumo-item total">
                <span className="resumo-label">Total Geral:</span>
                <span className="resumo-valor">
                  R$ {escalas
                    .reduce((sum, e) => sum + e.valor, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="lista-escalas">
              <h3>Escalas por Mês</h3>
              {agruparPorMes().map((mes, index) => (
                <div key={index} className="mes-container">
                  <div className="mes-header">
                    <h4>{mes.nome}</h4>
                    <span className="mes-total">R$ {mes.totalGeral.toFixed(2)}</span>
                  </div>
                  <div className="mes-detalhes">
                    <div className="detalhe-item">
                      <span>Delegada:</span>
                      <span>{mes.qtdDelegada} escalas - R$ {mes.totalDelegada.toFixed(2)}</span>
                    </div>
                    <div className="detalhe-item">
                      <span>DEJEM:</span>
                      <span>{mes.qtdDejem} escalas - R$ {mes.totalDejem.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="button-group">
              <button onClick={exportarPDF} className="button button-pdf">
                Salvar em PDF
              </button>
              <button onClick={exportarExcel} className="button button-excel">
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
