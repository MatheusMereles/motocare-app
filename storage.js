/* ==========================================================================
   MotoCare — js/storage.js
   Camada de persistência: tudo que lê/grava no localStorage fica aqui.
   Expõe o objeto global `MotoStorage`.
   ========================================================================== */
(function (global) {
  'use strict';

  const CHAVE_REGISTROS = 'motocare:registros:v1';
  const CHAVE_CONSULTA = 'motocare:ultima-consulta-recalls:v1';
  const TIPOS_VALIDOS = ['oleo', 'combustivel', 'manutencao'];
  const LIMITE_OBS = 200;

  // Dados de exemplo gravados apenas na PRIMEIRA abertura (chave ainda inexistente).
  // Reproduzem os números que o painel original exibia: 15.420 km, R$ 150,00 de
  // combustível e R$ 450,00 de manutenção (405 + 45 do card de troca de óleo).
  // Podem ser excluídos normalmente; depois de excluídos não voltam.
  const REGISTROS_EXEMPLO = [
    { id: 'exemplo-1', tipo: 'manutencao', km: 15100, valor: 405, obs: 'Dado de exemplo', data: '2026-11-02T12:00:00.000Z' },
    { id: 'exemplo-2', tipo: 'combustivel', km: 15350, valor: 150, obs: 'Dado de exemplo', data: '2026-11-08T12:00:00.000Z' },
    { id: 'exemplo-3', tipo: 'oleo', km: 15420, valor: 45, obs: 'Dado de exemplo', data: '2026-11-12T12:00:00.000Z' }
  ];

  /** Testa se o localStorage realmente funciona (modo privado/bloqueio podem falhar). */
  function disponivel() {
    try {
      const teste = '__motocare_teste__';
      global.localStorage.setItem(teste, '1');
      global.localStorage.removeItem(teste);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Os dados do localStorage podem ter sido editados à mão: nunca confie neles. */
  function registroValido(r) {
    return (
      r !== null &&
      typeof r === 'object' &&
      typeof r.id === 'string' && r.id.length > 0 &&
      TIPOS_VALIDOS.includes(r.tipo) &&
      Number.isFinite(r.km) && r.km > 0 &&
      Number.isFinite(r.valor) && r.valor > 0 &&
      (r.obs === undefined || typeof r.obs === 'string') &&
      typeof r.data === 'string' && !Number.isNaN(Date.parse(r.data))
    );
  }

  function normalizar(r) {
    return {
      id: r.id,
      tipo: r.tipo,
      km: r.km,
      valor: r.valor,
      obs: (r.obs || '').slice(0, LIMITE_OBS),
      data: r.data
    };
  }

  function gerarId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function salvar(registros) {
    try {
      global.localStorage.setItem(CHAVE_REGISTROS, JSON.stringify(registros));
      return true;
    } catch (e) {
      return false; // cota excedida ou armazenamento bloqueado
    }
  }

  /** Retorna os registros em ordem cronológica (o mais antigo primeiro). */
  function listar() {
    let bruto;
    try {
      bruto = global.localStorage.getItem(CHAVE_REGISTROS);
    } catch (e) {
      return [];
    }

    if (bruto === null) {
      const exemplo = REGISTROS_EXEMPLO.map((r) => Object.assign({}, r));
      salvar(exemplo);
      return exemplo;
    }

    try {
      const dados = JSON.parse(bruto);
      return Array.isArray(dados) ? dados.filter(registroValido).map(normalizar) : [];
    } catch (e) {
      return [];
    }
  }

  /** Cria e grava um registro. Retorna o registro criado ou null se não conseguiu gravar. */
  function adicionar(dados) {
    const registros = listar();
    const novo = {
      id: gerarId(),
      tipo: dados.tipo,
      km: dados.km,
      valor: dados.valor,
      obs: dados.obs || '',
      data: new Date().toISOString()
    };
    registros.push(novo);
    return salvar(registros) ? novo : null;
  }

  /** Exclui por id. Retorna true se excluiu e gravou. */
  function remover(id) {
    const registros = listar();
    const restantes = registros.filter((r) => r.id !== id);
    if (restantes.length === registros.length) return false;
    return salvar(restantes);
  }

  /** Totais derivados dos registros — o painel nunca guarda números próprios. */
  function calcularResumo(registros) {
    const resumo = {
      kmAtual: 0,
      totalCombustivel: 0,
      totalManutencao: 0,
      ultimaTrocaOleoKm: null
    };

    registros.forEach((r) => {
      if (r.km > resumo.kmAtual) resumo.kmAtual = r.km;

      if (r.tipo === 'combustivel') {
        resumo.totalCombustivel += r.valor;
      } else {
        // Troca de óleo e manutenção geral contam como "Manutenções" (regra original)
        resumo.totalManutencao += r.valor;
      }

      if (r.tipo === 'oleo' && (resumo.ultimaTrocaOleoKm === null || r.km > resumo.ultimaTrocaOleoKm)) {
        resumo.ultimaTrocaOleoKm = r.km;
      }
    });

    // Evita resíduos de ponto flutuante (ex.: 0.1 + 0.2)
    resumo.totalCombustivel = Math.round(resumo.totalCombustivel * 100) / 100;
    resumo.totalManutencao = Math.round(resumo.totalManutencao * 100) / 100;
    return resumo;
  }

  /* ---- Última consulta de recalls (usada como apoio quando estiver offline) ---- */

  function salvarUltimaConsulta(consulta) {
    try {
      global.localStorage.setItem(CHAVE_CONSULTA, JSON.stringify(consulta));
      return true;
    } catch (e) {
      return false;
    }
  }

  function lerUltimaConsulta() {
    try {
      const bruto = global.localStorage.getItem(CHAVE_CONSULTA);
      if (bruto === null) return null;
      const dados = JSON.parse(bruto);
      const formatoOk =
        dados && typeof dados === 'object' &&
        dados.veiculo && typeof dados.veiculo === 'object' &&
        Array.isArray(dados.recalls) &&
        typeof dados.consultadoEm === 'string';
      return formatoOk ? dados : null;
    } catch (e) {
      return null;
    }
  }

  global.MotoStorage = {
    TIPOS_VALIDOS,
    LIMITE_OBS,
    disponivel,
    listar,
    adicionar,
    remover,
    calcularResumo,
    salvarUltimaConsulta,
    lerUltimaConsulta
  };
})(window);
