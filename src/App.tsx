import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './App.css';

interface Escala {
  tipo: EscalaTipo;
  data: string;
  valor: number;
  funcao?: EscalaFuncao;
  descricao?: string; // Texto da anotação.
}

type EscalaTipo = 'delegada' | 'dejem' | 'dejemSazonal' | 'outros';
type EscalaFuncao = 'motorista' | 'efetivo';

interface ValoresPlantao {
  delegada: number;
  dejem: number;
  dejemSazonal: number;
  outros: number;
}

const TIPOS_ESCALA: EscalaTipo[] = ['delegada', 'dejem', 'dejemSazonal', 'outros'];
const TIPOS_UNICOS_POR_DIA: EscalaTipo[] = ['delegada', 'dejem', 'dejemSazonal'];

const isTipoEscala = (tipo: string): tipo is EscalaTipo => TIPOS_ESCALA.includes(tipo as EscalaTipo);
const isTipoUnicoPorDia = (tipo: EscalaTipo) => TIPOS_UNICOS_POR_DIA.includes(tipo);
const isFuncaoEscala = (funcao: string): funcao is EscalaFuncao => funcao === 'motorista' || funcao === 'efetivo';

const labelTipo = (tipo: EscalaTipo) => {
  const labels: Record<EscalaTipo, string> = {
    delegada: 'Delegada',
    dejem: 'DEJEM',
    dejemSazonal: 'DEJEM Sazonal',
    outros: 'Anotação'
  };

  return labels[tipo];
};

const chipTipo = (tipo: EscalaTipo) => {
  const labels: Record<EscalaTipo, string> = {
    delegada: 'DEL',
    dejem: 'DEJ',
    dejemSazonal: 'SAZ',
    outros: 'ANO'
  };

  return labels[tipo];
};

const labelFuncao = (funcao?: EscalaFuncao) => {
  if (funcao === 'motorista') return 'Motorista';
  if (funcao === 'efetivo') return 'Efetivo';
  return 'Não informado';
};

const formatarDataBR = (data: string) => {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

const App = () => {
  const [registro, setRegistro] = useState({ tipo: '', data: '', funcao: '', descricao: '' });
  const [valoresPlantao, setValoresPlantao] = useState<ValoresPlantao>({ delegada: 0, dejem: 0, dejemSazonal: 0, outros: 0 });
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState<EscalaTipo | ''>('');
  const [activeTab, setActiveTab] = useState<'calendario' | 'financeiro'>('calendario');
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [escalaEditando, setEscalaEditando] = useState<number | null>(null);
  const [mostrarPainel, setMostrarPainel] = useState(true);

  // Carregar dados do localStorage ao montar
  useEffect(() => {
    const valoresSalvos = localStorage.getItem('valoresPlantao');
    const escalasSalvadas = localStorage.getItem('escalas');
    
    if (valoresSalvos) {
      setValoresPlantao(prev => ({ ...prev, ...JSON.parse(valoresSalvos) }));
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
    if (!isTipoEscala(registro.tipo)) return;
    const tipoValido = registro.tipo;
    
    // Para anotação: validar se tem informação registrada.
    if (tipoValido === 'outros' && !registro.descricao?.trim()) {
      alert('Por favor, informe a anotação.');
      return;
    }

    if (isTipoUnicoPorDia(tipoValido) && !isFuncaoEscala(registro.funcao)) {
      alert('Por favor, selecione se a escala é Motorista ou Efetivo.');
      return;
    }
    
    // Para escalas financeiras principais: apenas uma por dia.
    if (isTipoUnicoPorDia(tipoValido)) {
      const jaExisteEscalaPrincipal = escalas.some(e => 
        e.data === registro.data && isTipoUnicoPorDia(e.tipo)
      );
      if (jaExisteEscalaPrincipal) {
        alert('Já existe uma escala (Delegada, DEJEM ou DEJEM Sazonal) neste dia! Apenas uma é permitida por dia.');
        return;
      }
    }
    // Para anotação: não há limite, pode adicionar múltiplas.
    
    const novaEscala: Escala = {
      tipo: tipoValido,
      data: registro.data,
      valor: tipoValido === 'outros' ? 0 : (valoresPlantao[tipoValido] || 0)
    };
    
    if (tipoValido === 'outros') {
      novaEscala.descricao = registro.descricao;
    } else if (isFuncaoEscala(registro.funcao)) {
      novaEscala.funcao = registro.funcao;
    }
    
    setEscalas([...escalas, novaEscala]);
    setRegistro({ tipo: '', data: '', funcao: '', descricao: '' });
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
    setRegistro({ tipo: '', data: dia.toISOString().split('T')[0], funcao: '', descricao: '' });
  };

  const fecharModal = () => {
    setModalAberto(false);
    setDiaSelecionado(null);
    setEscalaEditando(null);
    setRegistro({ tipo: '', data: '', funcao: '', descricao: '' });
  };

  const adicionarEscalaNoDia = () => {
    if (!registro.tipo || !registro.data) return;
    if (!isTipoEscala(registro.tipo)) return;
    const tipoValido = registro.tipo;
    
    // Para anotação: validar se tem informação registrada.
    if (tipoValido === 'outros' && !registro.descricao?.trim()) {
      alert('Por favor, informe a anotação.');
      return;
    }

    if (isTipoUnicoPorDia(tipoValido) && !isFuncaoEscala(registro.funcao)) {
      alert('Por favor, selecione se a escala é Motorista ou Efetivo.');
      return;
    }
    
    // Para escalas financeiras principais: apenas uma por dia.
    if (isTipoUnicoPorDia(tipoValido)) {
      const jaExisteEscalaPrincipal = escalas.some(e => 
        e.data === registro.data && isTipoUnicoPorDia(e.tipo)
      );
      if (jaExisteEscalaPrincipal) {
        alert('Já existe uma escala (Delegada, DEJEM ou DEJEM Sazonal) neste dia! Apenas uma é permitida por dia.');
        return;
      }
    }
    // Para anotação: não há limite, pode adicionar múltiplas.
    
    const novaEscala: Escala = {
      tipo: tipoValido,
      data: registro.data,
      valor: tipoValido === 'outros' ? 0 : (valoresPlantao[tipoValido] || 0)
    };
    
    if (tipoValido === 'outros') {
      novaEscala.descricao = registro.descricao;
    } else if (isFuncaoEscala(registro.funcao)) {
      novaEscala.funcao = registro.funcao;
    }
    
    setEscalas([...escalas, novaEscala]);
    setRegistro({ ...registro, tipo: '', funcao: '', descricao: '' });
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
    setRegistro({ tipo: escala.tipo, data: escala.data, funcao: escala.funcao || '', descricao: escala.descricao || '' });
  };

  const salvarEdicao = () => {
    if (escalaEditando === null || !registro.tipo) return;
    
    if (!isTipoEscala(registro.tipo)) return;
    const tipoValido = registro.tipo;
    
    // Para anotação: validar se tem informação registrada.
    if (tipoValido === 'outros' && !registro.descricao?.trim()) {
      alert('Por favor, informe a anotação.');
      return;
    }

    if (isTipoUnicoPorDia(tipoValido) && !isFuncaoEscala(registro.funcao)) {
      alert('Por favor, selecione se a escala é Motorista ou Efetivo.');
      return;
    }

    if (isTipoUnicoPorDia(tipoValido)) {
      const jaExisteEscalaPrincipal = escalas.some((e, index) => 
        index !== escalaEditando && e.data === registro.data && isTipoUnicoPorDia(e.tipo)
      );
      if (jaExisteEscalaPrincipal) {
        alert('Já existe uma escala (Delegada, DEJEM ou DEJEM Sazonal) neste dia! Apenas uma é permitida por dia.');
        return;
      }
    }
    
    const novasEscalas = [...escalas];
    novasEscalas[escalaEditando] = {
      ...novasEscalas[escalaEditando],
      tipo: tipoValido,
      valor: tipoValido === 'outros' ? 0 : (valoresPlantao[tipoValido] || 0),
      funcao: isTipoUnicoPorDia(tipoValido) && isFuncaoEscala(registro.funcao) ? registro.funcao : undefined,
      descricao: tipoValido === 'outros' ? registro.descricao : undefined
    };
    
    setEscalas(novasEscalas);
    setEscalaEditando(null);
    setRegistro({ tipo: '', data: '', funcao: '', descricao: '' });
  };

  const cancelarEdicao = () => {
    setEscalaEditando(null);
    setRegistro({ tipo: '', data: diaSelecionado?.toISOString().split('T')[0] || '', funcao: '', descricao: '' });
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
        const totalDejemSazonal = escalasMes.filter(e => e.tipo === 'dejemSazonal').reduce((sum, e) => sum + e.valor, 0);
        const totalGeral = totalDelegada + totalDejem + totalDejemSazonal;
        
        return {
          mesAno,
          nome: `${nomesMes} de ${ano}`,
          escalas: escalasMes,
          totalDelegada,
          totalDejem,
          totalDejemSazonal,
          totalGeral,
          qtdDelegada: escalasMes.filter(e => e.tipo === 'delegada').length,
          qtdDejem: escalasMes.filter(e => e.tipo === 'dejem').length,
          qtdDejemSazonal: escalasMes.filter(e => e.tipo === 'dejemSazonal').length
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
        ['DEJEM Sazonal', mes.qtdDejemSazonal.toString(), `R$ ${mes.totalDejemSazonal.toFixed(2)}`],
        ['TOTAL', (mes.qtdDelegada + mes.qtdDejem + mes.qtdDejemSazonal).toString(), `R$ ${mes.totalGeral.toFixed(2)}`]
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
    const totalGeralDejemSazonal = escalas.filter(e => e.tipo === 'dejemSazonal').reduce((sum, e) => sum + e.valor, 0);
    const totalGeralCompleto = totalGeralDelegada + totalGeralDejem + totalGeralDejemSazonal;
    
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
        ['Total DEJEM Sazonal:', `R$ ${totalGeralDejemSazonal.toFixed(2)}`],
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
      'DEJEM Sazonal (Qtd)': mes.qtdDejemSazonal,
      'DEJEM Sazonal (Valor)': mes.totalDejemSazonal,
      'Total Geral': mes.totalGeral
    }));
    
    const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Mensal');
    
    // Planilha com todas as escalas
      const dadosDetalhados = escalas.map(escala => ({
      'Data': formatarDataBR(escala.data),
      'Tipo': labelTipo(escala.tipo),
      'Função': escala.tipo === 'outros' ? '' : labelFuncao(escala.funcao),
      'Anotação': escala.tipo === 'outros' ? (escala.descricao || '') : '',
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
            {/* Botão para ocultar/mostrar o painel superior */}
            <div className="painel-toggle">
              <button className="button" onClick={() => setMostrarPainel(p => !p)}>
                {mostrarPainel ? 'Ocultar Campos' : 'Mostrar Campos'}
              </button>
            </div>
            {mostrarPainel && (
              <>
                <div className="form-grid">
                  <select 
                    value={registro.tipo} 
                    onChange={e => setRegistro({ ...registro, tipo: e.target.value })} 
                    className="input"
                  >
                    <option value="">Selecione o tipo...</option>
                    <option value="delegada">Delegada</option>
                    <option value="dejem">DEJEM</option>
                    <option value="dejemSazonal">DEJEM Sazonal</option>
                    <option value="outros">Anotação</option>
                  </select>
                  <input 
                    type="date" 
                    value={registro.data} 
                    onChange={e => setRegistro({ ...registro, data: e.target.value })}
                    className="input"
                  />
                  {isTipoEscala(registro.tipo) && isTipoUnicoPorDia(registro.tipo) && (
                    <select
                      value={registro.funcao}
                      onChange={e => setRegistro({ ...registro, funcao: e.target.value })}
                      className="input"
                    >
                      <option value="">Motorista ou Efetivo?</option>
                      <option value="motorista">Motorista</option>
                      <option value="efetivo">Efetivo</option>
                    </select>
                  )}
                  {registro.tipo === 'outros' && (
                    <input
                      type="text"
                      value={registro.descricao}
                      onChange={e => setRegistro({ ...registro, descricao: e.target.value })}
                      placeholder="Informação a anotar"
                      className="input"
                    />
                  )}
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
                  <div className="valor-item">
                    <span className="label">DEJEM Sazonal:</span>
                    <input 
                      type="number" 
                      value={valoresPlantao.dejemSazonal || ''} 
                      onChange={e => setValoresPlantao({ ...valoresPlantao, dejemSazonal: e.target.value ? parseFloat(e.target.value) : 0 })} 
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
                    onChange={e => setFiltroTipo(e.target.value as EscalaTipo | '')}
                    className="input"
                  >
                    <option value="">Todos</option>
                    <option value="delegada">Delegada</option>
                    <option value="dejem">DEJEM</option>
                    <option value="dejemSazonal">DEJEM Sazonal</option>
                    <option value="outros">Anotação</option>
                  </select>
                </div>
              </>
            )}
            
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
                              escala.tipo === 'dejemSazonal' ? 'evento-dejem-sazonal' : 
                              'evento-outros'
                            }`}
                          >
                            {chipTipo(escala.tipo)}
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
                    <option value="dejemSazonal">DEJEM Sazonal</option>
                    <option value="outros">Anotação</option>
                  </select>
                  {isTipoEscala(registro.tipo) && isTipoUnicoPorDia(registro.tipo) && (
                    <select
                      value={registro.funcao}
                      onChange={e => setRegistro({ ...registro, funcao: e.target.value })}
                      className="input"
                    >
                      <option value="">Motorista ou Efetivo?</option>
                      <option value="motorista">Motorista</option>
                      <option value="efetivo">Efetivo</option>
                    </select>
                  )}
                  {registro.tipo === 'outros' && (
                    <input
                      type="text"
                      value={registro.descricao}
                      onChange={e => setRegistro({ ...registro, descricao: e.target.value })}
                      placeholder="Informação a anotar"
                      className="input"
                    />
                  )}
                  {escalaEditando !== null ? (
                    <>
                      <button 
                        className="button button-save-modal" 
                        onClick={salvarEdicao}
                        disabled={!registro.tipo || (registro.tipo === 'outros' && !registro.descricao?.trim()) || (isTipoEscala(registro.tipo) && isTipoUnicoPorDia(registro.tipo) && !isFuncaoEscala(registro.funcao))}
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
                      disabled={!registro.tipo || (registro.tipo === 'outros' && !registro.descricao?.trim()) || (isTipoEscala(registro.tipo) && isTipoUnicoPorDia(registro.tipo) && !isFuncaoEscala(registro.funcao))}
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
                                escala.tipo === 'dejemSazonal' ? 'badge-dejem-sazonal' : 
                                'badge-outros'
                              }`}>
                                {labelTipo(escala.tipo).toUpperCase()}
                              </span>
                              {escala.tipo === 'outros' ? (
                                <span className="escala-descricao">{escala.descricao}</span>
                              ) : (
                                <span className="escala-detalhe">
                                  <span className="escala-funcao">{labelFuncao(escala.funcao)}</span>
                                  <span className="escala-valor">R$ {escala.valor.toFixed(2)}</span>
                                </span>
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

              <div className="resumo-item">
                <span className="resumo-label">Total DEJEM Sazonal:</span>
                <span className="resumo-valor">
                  R$ {escalas
                    .filter(e => e.tipo === 'dejemSazonal')
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
                    <div className="detalhe-item">
                      <span>DEJEM Sazonal:</span>
                      <span>{mes.qtdDejemSazonal} escalas - R$ {mes.totalDejemSazonal.toFixed(2)}</span>
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
