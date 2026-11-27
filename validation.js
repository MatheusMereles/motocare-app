/* ==========================================================================
   MotoCare — js/validation.js
   Regras de validação (funções puras: recebem dados, devolvem o resultado).
   Não mexe no DOM nem no localStorage. Expõe o objeto global `MotoValidation`.
   ========================================================================== */
(function (global) {
  'use strict';

  const KM_MAX = 999999;
  const VALOR_MAX = 100000;
  const SALTO_MAX_KM = 10000; // diferença máxima aceita em relação ao último registro
  const ANO_MIN = 1950;

  const fmtKm = (n) => `${n.toLocaleString('pt-BR')} km`;

  // Remove caracteres de controle (mantém quebra de linha e tab) e espaços nas pontas.
  function limparTexto(texto) {
    return String(texto == null ? '' : texto)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
  }

  /**
   * Valida o formulário "Novo Registro".
   * @param {{tipo:string, km:string, valor:string, obs:string}} entrada  valores brutos dos campos
   * @param {Array} registros  registros já salvos (para checar coerência da quilometragem)
   * @returns {{valido:boolean, erros:Array<{campo:string, mensagem:string}>, dados:object|null}}
   */
  function validarRegistro(entrada, registros) {
    const erros = [];
    const adicionarErro = (campo, mensagem) => erros.push({ campo, mensagem });

    // --- tipo ---
    const tipo = limparTexto(entrada.tipo);
    if (!global.MotoStorage.TIPOS_VALIDOS.includes(tipo)) {
      adicionarErro('tipo', 'Selecione o tipo de registro.');
    }

    // --- quilometragem ---
    const kmBruto = limparTexto(entrada.km);
    let km = null;
    if (kmBruto === '') {
      adicionarErro('km', 'Informe a quilometragem atual.');
    } else if (!/^\d+$/.test(kmBruto)) {
      adicionarErro('km', 'A quilometragem deve ser um número inteiro positivo, sem sinal, vírgula ou ponto.');
    } else {
      km = Number(kmBruto);
      if (km <= 0) {
        adicionarErro('km', 'A quilometragem deve ser maior que zero.');
      } else if (km > KM_MAX) {
        adicionarErro('km', `A quilometragem máxima aceita é ${fmtKm(KM_MAX)}.`);
      } else if (registros.length > 0) {
        const ultimoKm = registros.reduce((maior, r) => Math.max(maior, r.km), 0);
        if (km < ultimoKm) {
          adicionarErro('km', `A quilometragem (${fmtKm(km)}) não pode ser menor que a do último registro (${fmtKm(ultimoKm)}).`);
        } else if (km - ultimoKm > SALTO_MAX_KM) {
          adicionarErro('km', `A diferença de ${fmtKm(km - ultimoKm)} em relação ao último registro (${fmtKm(ultimoKm)}) parece um erro de digitação. Confira o valor.`);
        }
      }
    }

    // --- valor ---
    const valorBruto = limparTexto(entrada.valor);
    let valor = null;
    if (valorBruto === '') {
      adicionarErro('valor', 'Informe o valor gasto.');
    } else if (!/^\d+(\.\d{1,2})?$/.test(valorBruto)) {
      adicionarErro('valor', 'O valor deve ser positivo, com no máximo 2 casas decimais (ex.: 45.90).');
    } else {
      valor = Number(valorBruto);
      if (valor <= 0) {
        adicionarErro('valor', 'O valor gasto deve ser maior que zero.');
      } else if (valor > VALOR_MAX) {
        adicionarErro('valor', 'O valor informado é alto demais. Confira se digitou corretamente.');
      }
    }

    // --- observações (opcional) ---
    const obs = limparTexto(entrada.obs);
    if (obs.length > global.MotoStorage.LIMITE_OBS) {
      adicionarErro('obs', `As observações podem ter no máximo ${global.MotoStorage.LIMITE_OBS} caracteres.`);
    }

    if (erros.length > 0) {
      return { valido: false, erros, dados: null };
    }

    return {
      valido: true,
      erros: [],
      dados: { tipo, km, valor: Math.round(valor * 100) / 100, obs }
    };
  }

  /**
   * Valida os campos da consulta de recalls antes de chamar a API.
   * @param {{marca:string, modelo:string, ano:string}} entrada
   */
  function validarConsulta(entrada) {
    const erros = [];
    const marca = limparTexto(entrada.marca);
    const modelo = limparTexto(entrada.modelo);
    const anoBruto = limparTexto(entrada.ano);
    const padraoTexto = /^[\p{L}\p{N}][\p{L}\p{N} .\-/]{0,39}$/u;
    const anoMax = new Date().getFullYear() + 1;

    if (!marca) erros.push({ campo: 'marca', mensagem: 'Informe a marca da moto.' });
    else if (!padraoTexto.test(marca)) erros.push({ campo: 'marca', mensagem: 'A marca contém caracteres inválidos (use letras, números, espaço, ponto ou hífen).' });

    if (!modelo) erros.push({ campo: 'modelo', mensagem: 'Informe o modelo da moto.' });
    else if (!padraoTexto.test(modelo)) erros.push({ campo: 'modelo', mensagem: 'O modelo contém caracteres inválidos (use letras, números, espaço, ponto ou hífen).' });

    let ano = null;
    if (!anoBruto) {
      erros.push({ campo: 'ano', mensagem: 'Informe o ano do modelo.' });
    } else if (!/^\d{4}$/.test(anoBruto) || Number(anoBruto) < ANO_MIN || Number(anoBruto) > anoMax) {
      erros.push({ campo: 'ano', mensagem: `Informe um ano válido entre ${ANO_MIN} e ${anoMax}.` });
    } else {
      ano = Number(anoBruto);
    }

    if (erros.length > 0) return { valido: false, erros, dados: null };
    return { valido: true, erros: [], dados: { marca, modelo, ano } };
  }

  global.MotoValidation = { validarRegistro, validarConsulta, SALTO_MAX_KM };
})(window);
