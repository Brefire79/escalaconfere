import { useState, useEffect } from 'react';
import './App.css';

interface Escala {
  tipo: 'delegada' | 'dejem';
  data: string;
  valor: number;
}

interface ValoresPlantao {
  delegada: number;
  dejem: number;
}

const App = () => {
  const [registro, setRegistro] = useState({ tipo: '', data: '' });
  const [valoresPlantao, setValoresPlantao] = useState<ValoresPlantao>({ delegada: 0, dejem: 0 });
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState<'delegada' | 'dejem' | ''>('');
  const [activeTab, setActiveTab] = useState<'calendario' | 'financeiro'>('calendario');

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
    const tipoValido = registro.tipo as 'delegada' | 'dejem';
    if (tipoValido !== 'delegada' && tipoValido !== 'dejem') return;
    
    setEscalas([...escalas, { 
      tipo: tipoValido, 
      data: registro.data, 
      valor: valoresPlantao[tipoValido] || 0 
    }]);
    setRegistro({ tipo: '', data: '' });
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
    const ciclo = diasPassados % 3;
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

  const exportarPDF = () => {
    alert('Funcionalidade de exportação PDF será implementada em breve!');
  };

  const exportarExcel = () => {
    alert('Funcionalidade de exportação Excel será implementada em breve!');
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
                onChange={e => setFiltroTipo(e.target.value as 'delegada' | 'dejem' | '')}
                className="input"
              >
                <option value="">Todos</option>
                <option value="delegada">Delegada</option>
                <option value="dejem">DEJEM</option>
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
                const corEscala = escalasDia.length > 0 
                  ? (escalasDia[0].tipo === 'delegada' ? 'bg-violet-600' : 'bg-red-300') 
                  : '';
                const corProntidaoFundo = corProntidao(dia);
                const destaqueFiltro = filtroTipo && escalasDia.some(e => e.tipo === filtroTipo) ? 'ring' : '';
                const tooltip = escalasDia.length > 0 
                  ? escalasDia.map(e => `${e.tipo.toUpperCase()} - R$ ${(valoresPlantao[e.tipo] || 0).toFixed(2)}`).join('\n') 
                  : '';
                const mesAtivo = dia.getMonth() === mesAtual.getMonth();
                
                return (
                  <div 
                    key={i} 
                    title={tooltip} 
                    className={`dia ${destaqueFiltro} ${corProntidaoFundo} ${!mesAtivo ? 'outro-mes' : ''}`}
                  >
                    {escalasDia.length > 0 && (
                      <div className={`escala-indicador ${corEscala}`}>
                        <span className="escala-tipo-label">
                          {escalasDia[0].tipo === 'delegada' ? 'DEL' : 'DEJ'} - R$ {escalasDia[0].valor.toFixed(0)}
                        </span>
                      </div>
                    )}
                    <span className="dia-numero">{dia.getDate()}</span>
                  </div>
                );
              })}
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
              <h3>Lista de Escalas Cumpridas</h3>
              <div className="escala-item">
                <span className="escala-tipo">DELEGADA</span>
                <span className="escala-valor">{escalas.filter(e => e.tipo === 'delegada').length} escalas</span>
              </div>
              <div className="escala-item">
                <span className="escala-tipo">DEJEM</span>
                <span className="escala-valor">{escalas.filter(e => e.tipo === 'dejem').length} escalas</span>
              </div>
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
