const { Client, LocalAuth, Poll } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox']
    }
});

// Gerar QR Code para autenticação
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code gerado! Escaneie-o com seu WhatsApp.');
});

client.on('ready', () => {
    console.log('Cliente WhatsApp está pronto! . . .');
});

// Objeto para armazenar as enquetes enviadas e suas opções
const enquetesEnviadas = {};

// Manipulador de mensagens
client.on('message', async msg => {
    const mensagem = msg.body.toLowerCase();
    
    if (mensagem.match(/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hi|hello)/)) {
        const saudacoes = [
            'Olá! Bem-vindo à nossa barbearia! 👋',
            'Oi! Como posso ajudar você hoje? 💈',
            'Olá! Que bom ter você por aqui! ✂️'
        ];
        
        const saudacaoAleatoria = saudacoes[Math.floor(Math.random() * saudacoes.length)];
        await msg.reply(saudacaoAleatoria);
        
        const opcoes = ['Serviços', 'Horários disponíveis', 'Falar com barbeiro', 'Localização'];
        const poll = new Poll('Como posso ajudar você hoje?', opcoes, {
            allowMultipleAnswers: false
        });

        try {
            const pollMessage = await client.sendMessage(msg.from, poll);
            console.log('Enquete enviada com ID:', pollMessage.id._serialized);
            
            // Armazenar a enquete com suas opções
            enquetesEnviadas[pollMessage.id._serialized] = {
                opcoes: opcoes,
                chat: msg.from,
                message: pollMessage
            };
            
            console.log('Enquete armazenada:', {
                id: pollMessage.id._serialized,
                opcoes: opcoes,
                chat: msg.from
            });
        } catch (error) {
            console.error('Erro ao enviar enquete:', error);
        }
    }
});

client.on('vote_update', async (vote) => {
    console.log('Objeto de voto completo:', vote);
    console.log('Voto recebido:', {
        voter: vote.voter,
        selectedOptions: vote.selectedOptions,
        parentMessageId: vote.parentMessage?.id?._serialized
    });

    try {
        const pollId = vote.parentMessage?.id?._serialized;
        
        if (!pollId) {
            console.log('ID da enquete não encontrado no voto');
            return;
        }

        const enquete = enquetesEnviadas[pollId];
        if (!enquete) {
            console.log('Enquete não encontrada nos registros');
            return;
        }

        if (vote.selectedOptions && vote.selectedOptions.length > 0) {
            const opcaoSelecionada = vote.selectedOptions[0].name;
            console.log('Opção selecionada:', opcaoSelecionada);

            switch (opcaoSelecionada) {
                case 'Serviços':
                    await client.sendMessage(enquete.chat, 'Serviços disponíveis:\n- Corte de cabelo: R$35,00\n- Barba R$20,00\n- Cabelo e barba: R$50,00\n- Pezinho e sobrancelha: R$10,00\n- combo: R$70,00');
                    break;
                case 'Horários disponíveis':
                    await client.sendMessage(enquete.chat, 'Horários disponíveis para hoje:\n09:00\n10:00\n11:00\n14:00\n15:00\n16:00\n\nQual horário você prefere?');
                    break;
                case 'Falar com barbeiro':
                    await client.sendMessage(enquete.chat, 'Você será redirecionado para um de nossos barbeiros em breve. Por favor, aguarde...');
                    break;
                case 'Localização':
                    await client.sendMessage(enquete.chat, 'Nossa barbearia está localizada na Rua Exemplo, 123 - Centro\nCidade - Estado\nCEP: 12345-678\n\nHorário de funcionamento:\nSegunda a Sábado: 09:00 às 19:00');
                    break;
                default:
                    await client.sendMessage(enquete.chat, 'Desculpe, não entendi sua escolha. Por favor, selecione uma das opções disponíveis.');
            }
        } else {
            console.log('Nenhuma opção selecionada no voto');
        }
    } catch (error) {
        console.error('Erro ao processar voto:', error);
    }
});

// Iniciar o cliente
client.initialize();