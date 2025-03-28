# Bot WhatsApp Barbearia

Este é um bot para WhatsApp desenvolvido para automatizar o atendimento de uma barbearia.

## Funcionalidades

- Responde a saudações automaticamente
- Menu interativo com opções:
  - Agendar horário
  - Ver horários disponíveis
  - Falar com barbeiro
  - Localização da barbearia

## Requisitos

- Node.js instalado
- NPM (Node Package Manager)
- WhatsApp no celular para autenticação

## Instalação

1. Clone este repositório ou baixe os arquivos
2. Instale as dependências:
```bash
npm install
```

## Como usar

1. Execute o bot:
```bash
node index.js
```

2. Um QR Code será exibido no terminal
3. Abra o WhatsApp no seu celular
4. Vá em Configurações > WhatsApp Web/Desktop
5. Escaneie o QR Code
6. O bot estará pronto para uso!

## Como testar

1. Envie uma mensagem de saudação (oi, olá, bom dia, etc.) para o número do WhatsApp onde o bot está rodando
2. O bot responderá com uma saudação e enviará o menu de opções
3. Selecione uma das opções disponíveis para interagir com o bot

## Personalização

Você pode personalizar as mensagens, horários e informações editando o arquivo `index.js`. As principais seções para edição são:

- Array de saudações
- Menu de opções
- Respostas para cada opção do menu
- Horários disponíveis
- Informações de localização #   b o t - a t e n d e n t e - w p p  
 