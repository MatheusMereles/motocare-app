// Evita execução duplicada caso o HTML tente importar de dois caminhos
if (!window.motoCareCarregado) {
  window.motoCareCarregado = true;

  // CORREÇÃO PRINCIPAL: 'document' com letra "d" minúscula
  document.addEventListener('DOMContentLoaded', () => {
    const botoes = document.querySelectorAll('.nav-item');
    const telas = document.querySelectorAll('.tela');

    // 1. NAVEGAÇÃO ENTRE TELAS
    botoes.forEach((botao) => {
      botao.addEventListener('click', () => {
        const destino = botao.dataset.alvo;

        console.log('Botão clicado:', destino);

        telas.forEach((tela) => {
          tela.classList.toggle('ativa', tela.id === destino);
        });

        botoes.forEach((item) => {
          item.classList.toggle('ativo', item === botao);
        });
      });
    });

    // 2. STATUS DE CONEXÃO (ONLINE / OFFLINE)
    const badgeConexao = document.getElementById('status-conexao');
    function atualizarStatusConexao() {
      if (!badgeConexao) return;
      if (navigator.onLine) {
        badgeConexao.textContent = 'Online';
        badgeConexao.className = 'badge online';
      } else {
        badgeConexao.textContent = 'Offline';
        badgeConexao.className = 'badge offline';
      }
    }
    window.addEventListener('online', atualizarStatusConexao);
    window.addEventListener('offline', atualizarStatusConexao);
    atualizarStatusConexao();

    // 3. RECURSOS DO DISPOSITIVO (FOTO E LOCALIZAÇÃO)
    const inputFoto = document.getElementById('foto-hodometro');
    const btnLocalizacao = document.getElementById('btn-localizacao');
    const infoRecurso = document.getElementById('info-recurso');

    if (inputFoto && infoRecurso) {
      inputFoto.addEventListener('change', () => {
        if (inputFoto.files && inputFoto.files[0]) {
          infoRecurso.textContent = `📷 Foto anexada: ${inputFoto.files[0].name}`;
        }
      });
    }

    if (btnLocalizacao && infoRecurso) {
      btnLocalizacao.addEventListener('click', () => {
        if (!navigator.geolocation) {
          infoRecurso.textContent = '⚠️ Geolocalização não suportada neste navegador.';
          return;
        }
        infoRecurso.textContent = '⏳ Obtendo localização...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude.toFixed(4);
            const lng = pos.coords.longitude.toFixed(4);
            infoRecurso.textContent = `📍 Localização capturada: ${lat}, ${lng}`;
          },
          () => {
            infoRecurso.textContent = '⚠️ Não foi possível obter a localização (verifique as permissões).';
          }
        );
      });
    }

    // 4. FORMULÁRIO DE NOVO REGISTRO E ATUALIZAÇÃO DO PAINEL
    const formRegistro = document.getElementById('form-registro');
    const feedback = document.getElementById('mensagem-feedback');
    const listaRegistros = document.getElementById('lista-registros');
    const kmAtualEl = document.getElementById('km-atual');
    const gastoCombustivelEl = document.getElementById('gasto-combustivel');
    const gastoManutencaoEl = document.getElementById('gasto-manutencao');

    let kmAtual = 15420;
    let totalCombustivel = 150.0;
    let totalManutencao = 450.0;

    const titulosCategoria = {
      oleo: '🔧 Troca de Óleo',
      combustivel: '⛽ Abastecimento',
      manutencao: '🛠️ Manutenção Geral'
    };

    if (formRegistro) {
      formRegistro.addEventListener('submit', (e) => {
        e.preventDefault();

        const tipo = document.getElementById('tipo').value;
        const km = Number(document.getElementById('quilometragem').value);
        const valor = Number(document.getElementById('valor').value);
        const obs = document.getElementById('observacoes').value.trim();

        if (!tipo || !km || km <= 0 || !valor || valor <= 0) {
          feedback.textContent = '⚠️ Preencha todos os campos obrigatórios corretamente.';
          feedback.className = 'feedback erro';
          return;
        }

        // Atualiza quilometragem e somatórios
        if (km > kmAtual) {
          kmAtual = km;
          kmAtualEl.textContent = `${kmAtual.toLocaleString('pt-BR')} km`;
        }

        if (tipo === 'combustivel') {
          totalCombustivel += valor;
          gastoCombustivelEl.textContent = totalCombustivel.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          });
        } else {
          totalManutencao += valor;
          gastoManutencaoEl.textContent = totalManutencao.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          });
        }

        // Cria card no histórico
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const valorFormatado = valor.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        });

        const novoCard = document.createElement('article');
        novoCard.className = 'card item-historico';
        novoCard.dataset.categoria = tipo;
        novoCard.innerHTML = `
          <div>
            <h3>${titulosCategoria[tipo] || 'Registro'}</h3>
            <p>${dataHoje} • ${km.toLocaleString('pt-BR')} km • <strong>${valorFormatado}</strong></p>
            ${obs ? `<p class="texto-apoio">${obs}</p>` : ''}
          </div>
        `;

        listaRegistros.prepend(novoCard);

        feedback.textContent = '✅ Registro salvo com sucesso!';
        feedback.className = 'feedback sucesso';
        formRegistro.reset();
        if (infoRecurso) infoRecurso.textContent = '';
      });
    }

    // 5. FILTROS DO HISTÓRICO
    const chipsFiltro = document.querySelectorAll('.chip');
    chipsFiltro.forEach((chip) => {
      chip.addEventListener('click', () => {
        const filtro = chip.dataset.filtro;

        chipsFiltro.forEach((c) => c.classList.toggle('ativo', c === chip));

        const itens = document.querySelectorAll('.item-historico');
        itens.forEach((item) => {
          const categoria = item.dataset.categoria;
          const mostrar = filtro === 'todos' || categoria === filtro;
          item.style.display = mostrar ? 'block' : 'none';
        });
      });
    });
  });
}
