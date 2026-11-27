/* ==========================================================================
   MotoCare — js/api.js
   Consulta de recalls de segurança na API pública da NHTSA (EUA).
   Documentação oficial: https://www.nhtsa.gov/nhtsa-datasets-and-apis
   Endpoint: GET https://api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=
   Não exige chave de API. Expõe o objeto global `MotoApi`.
   ========================================================================== */
(function (global) {
  'use strict';

  const URL_BASE = 'https://api.nhtsa.gov/recalls/recallsByVehicle';
  const TEMPO_LIMITE_MS = 10000;

  /** Erro com um código para a interface decidir o que mostrar. */
  class ErroConsulta extends Error {
    constructor(codigo, mensagem) {
      super(mensagem);
      this.name = 'ErroConsulta';
      this.codigo = codigo; // 'offline' | 'timeout' | 'rede' | 'http' | 'json' | 'formato'
    }
  }

  function mensagemHttp(status) {
    if (status === 400) return 'A NHTSA recusou os dados informados. Confira marca, modelo e ano.';
    if (status === 404) return 'Serviço de consulta não encontrado (erro 404). Tente novamente mais tarde.';
    if (status === 429) return 'Muitas consultas em pouco tempo. Aguarde um instante e tente de novo.';
    if (status >= 500) return `O serviço da NHTSA está indisponível no momento (erro ${status}). Tente novamente mais tarde.`;
    return `Não foi possível consultar a NHTSA (erro ${status}).`;
  }

  /** Lê um campo aceitando variações de maiúsculas/minúsculas no nome. */
  function campo(obj, ...nomes) {
    for (const nome of nomes) {
      if (obj[nome] !== undefined && obj[nome] !== null) return String(obj[nome]).trim();
    }
    return '';
  }

  /** Valida o formato da resposta e converte para o que a interface precisa. */
  function normalizar(json) {
    if (!json || typeof json !== 'object' || !Array.isArray(json.results)) {
      throw new ErroConsulta('formato', 'A resposta da NHTSA veio em um formato inesperado. Tente novamente mais tarde.');
    }

    const recalls = json.results
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        campanha: campo(r, 'NHTSACampaignNumber', 'nhtsaCampaignNumber'),
        componente: campo(r, 'Component', 'component'),
        resumo: campo(r, 'Summary', 'summary'),
        consequencia: campo(r, 'Consequence', 'consequence'),
        solucao: campo(r, 'Remedy', 'remedy'),
        data: campo(r, 'ReportReceivedDate', 'reportReceivedDate')
      }));

    return { total: recalls.length, recalls };
  }

  /**
   * Busca recalls para um veículo.
   * @param {{marca:string, modelo:string, ano:number}} veiculo
   * @returns {Promise<{total:number, recalls:Array}>}
   * @throws {ErroConsulta}
   */
  async function consultarRecalls(veiculo) {
    if (global.navigator && global.navigator.onLine === false) {
      throw new ErroConsulta('offline', 'Você está offline. Conecte-se à internet para consultar os recalls.');
    }

    const params = new URLSearchParams({
      make: veiculo.marca,
      model: veiculo.modelo,
      modelYear: String(veiculo.ano)
    });

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

    try {
      const resposta = await fetch(`${URL_BASE}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controlador.signal
      });

      if (!resposta.ok) {
        throw new ErroConsulta('http', mensagemHttp(resposta.status));
      }

      let json;
      try {
        json = await resposta.json();
      } catch (e) {
        if (e && e.name === 'AbortError') throw e;
        throw new ErroConsulta('json', 'A NHTSA respondeu com dados ilegíveis. Tente novamente mais tarde.');
      }

      return normalizar(json);
    } catch (erro) {
      if (erro instanceof ErroConsulta) throw erro;
      if (erro && erro.name === 'AbortError') {
        throw new ErroConsulta('timeout', 'A consulta demorou demais e foi cancelada. Verifique sua conexão e tente novamente.');
      }
      // fetch() rejeita com TypeError quando não há rede, DNS falha ou o navegador bloqueia (CORS)
      throw new ErroConsulta('rede', 'Não foi possível conectar ao serviço da NHTSA. Verifique sua conexão e tente novamente.');
    } finally {
      clearTimeout(temporizador);
    }
  }

  global.MotoApi = { consultarRecalls, ErroConsulta };
})(window);
