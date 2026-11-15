# motocare-app

## Sobre o Projeto
Esse projeto foi desenvolvido com o objetivo de acompanhar o histórico de revisões mecânicas, controle de troca de óleo, registro de hodômetro e gestão de despesas com combustível para motocicletas.

## Tecnologias Utilizadas

PWA (Progressive Web App)
HTML
CSS
Java Script

## Funcionalidades

Painel de Controle (Dashboard)
Cadastro validado de registros (ação principal)
Histórico: listagem, consulta, filtro, edição e exclusão
Manual de Bordo via fetch
Funcionamento offline e indicador de rede
Recursos do dispositivo
Tela “Sobre o Projeto”

## Como Executar

Opção 1: Abrir direto no navegador:
Baixe ou clone o repositório.
Dê dois cliques no index.html.

Opção 2: Servidor local (recomendado)
Com VS Code:
Instale a extensão Live Server.
Clique com o botão direito no index.html e escolha Open with Live Server.

Testar no celular
Mesma rede Wi-Fi: acesse http://IP-DO-SEU-PC:8000 no celular. Câmera e geolocalização podem exigir HTTPS fora do localhost.
Publicar no GitHub Pages: o repositório público pode ser publicado em Settings → Pages, que já fornece HTTPS. É o jeito mais simples de testar câmera, GPS e instalação como PWA.

Testar o modo offline
Abra o app com o servidor local e deixe carregar uma vez.
No Chrome, aperte F12 → aba Application → Service Workers.
Marque Offline e recarregue a página.
