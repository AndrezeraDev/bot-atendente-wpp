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

// Objeto para armazenar enquetes enviadas
const enquetesEnviadas = {};

// Objeto para armazenar temporariamente as escolhas dos usuários
const usuarios = {};

// Função para validar a data
function validarData(dataStr) {
    const [dia, mes, ano] = dataStr.split('/').map(Number);
    const dataSelecionada = new Date(ano, mes - 1, dia); // Mês em JS começa em 0
    const dataAtual = new Date('2025-03-13'); // Data fixa conforme contexto
    const umMesDepois = new Date(dataAtual);
    umMesDepois.setMonth(dataAtual.getMonth() + 1);

    if (isNaN(dataSelecionada.getTime())) {
        return { valido: false, mensagem: '❌Data inválida. Por favor, digite no formato "dd/mm/aaaa".' };
    }
    if (dataSelecionada < dataAtual) {
        return { valido: false, mensagem: '❌Essa data já passou! Por favor, escolha uma data a partir de hoje (13/03/2025).' };
    }
    if (dataSelecionada > umMesDepois) {
        return { valido: false, mensagem: '❌Infelizmente não temos agenda disponível para essa data. Escolha uma data até 13/04/2025.' };
    }
    return { valido: true };
}

// Função para enviar uma enquete
async function enviarEnquete(chatId, titulo, opcoes) {
    const poll = new Poll(titulo, opcoes, { allowMultipleAnswers: false });

    try {
        const pollMessage = await client.sendMessage(chatId, poll);
        enquetesEnviadas[pollMessage.id._serialized] = {
            opcoes: opcoes,
            chat: chatId,
            message: pollMessage
        };
        console.log(`Enquete enviada: ${titulo}`);
    } catch (error) {
        console.error('❌Erro ao enviar enquete:', error);
    }
}

// Responder com a primeira enquete ao receber uma saudação
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
        
        enviarEnquete(msg.from, 'Como posso ajudar você hoje?', [
            'Escolher serviços',
            'Escolher horário',
            'Falar com barbeiro',
            'Localização'
        ]);
    } 
    
    // Voltar ao menu inicial ao digitar "#"
    if (mensagem === '#') {
        enviarEnquete(msg.from, '💈Como posso ajudar você hoje?', [
            'Escolher serviços 📌',
            'Escolher horário🕒',
            'Falar com barbeiro💈',
            'Localização📍'
        ]);
    }

    // Verifica se o usuário digitou uma data específica
    if (mensagem.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const userId = msg.from;
        if (!usuarios[userId]) usuarios[userId] = {};

        const validacao = validarData(mensagem);
        if (validacao.valido) {
            usuarios[userId].data = mensagem;
            await msg.reply(`Data selecionada: ${mensagem}. 🕰 Agora escolha um horário:`);
            enviarEnquete(msg.from, `Escolha um horário para ${mensagem}:`, [
                '09:00',
                '10:00',
                '11:00',
                '14:00',
                '15:00',
                '16:00',
                '# Voltar'
            ]);
        } else {
            await msg.reply(`${validacao.mensagem}\n 🕰 Por favor, escolha outra data ou um dia da semana.`);
            enviarEnquete(msg.from, 'Escolha um dia da semana:', [
                'Segunda-feira',
                'Terça-feira',
                'Quarta-feira',
                'Quinta-feira',
                'Sexta-feira',
                'Sábado',
                'Escolher outro dia',
                '# Voltar'
            ]);
        }
    }
});

// Manipulação das respostas das enquetes
client.on('vote_update', async (vote) => {
    console.log('✅Voto recebido:', {
        voter: vote.voter,
        selectedOptions: vote.selectedOptions,
        parentMessageId: vote.parentMessage?.id?._serialized
    });

    try {
        const pollId = vote.parentMessage?.id?._serialized;
        if (!pollId) return;

        const enquete = enquetesEnviadas[pollId];
        if (!enquete) return;

        const userId = vote.voter;

        if (vote.selectedOptions && vote.selectedOptions.length > 0) {
            const opcaoSelecionada = vote.selectedOptions[0].name;
            console.log('Opção selecionada:', opcaoSelecionada);

            if (!usuarios[userId]) {
                usuarios[userId] = { servico: null, horario: null, data: null };
            }

            // Verifica se é escolha de serviço
            if (opcaoSelecionada.includes('R$')) {
                usuarios[userId].servico = opcaoSelecionada;

                if (usuarios[userId].horario && usuarios[userId].data) {
                    await client.sendMessage(enquete.chat, `✅ Agendamento confirmado!\n\n📅 Data: ${usuarios[userId].data}\n🕒 Horário: ${usuarios[userId].horario}\n💈 Serviço: ${usuarios[userId].servico}\n\nObrigado por escolher nossa barbearia!`);
                    delete usuarios[userId];
                } else {
                    enviarEnquete(enquete.chat, 'Escolha um dia da semana:', [
                        'Segunda-feira',
                        'Terça-feira',
                        'Quarta-feira',
                        'Quinta-feira',
                        'Sexta-feira',
                        'Sábado',
                        'Escolher outro dia',
                        '# Voltar'
                    ]);
                }
            } 
            // Verifica se é escolha de horário
            else if (['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].includes(opcaoSelecionada)) {
                usuarios[userId].horario = opcaoSelecionada;

                if (usuarios[userId].servico && usuarios[userId].data) {
                    await client.sendMessage(enquete.chat, `✅ Agendamento confirmado!\n\n📅 Data: ${usuarios[userId].data}\n🕒 Horário: ${usuarios[userId].horario}\n💈 Serviço: ${usuarios[userId].servico}\n\nObrigado por escolher nossa barbearia!`);
                    delete usuarios[userId];
                } else if (!usuarios[userId].servico) {
                    enviarEnquete(enquete.chat, 'Escolha um serviço:', [
                        'Corte de cabelo - R$35,00',
                        'Barba - R$20,00',
                        'Cabelo e barba - R$50,00',
                        'Pezinho e sobrancelha - R$10,00',
                        'Combo - R$70,00',
                        '# Voltar'
                    ]);
                }
            } 
            // Verifica se é escolha de dia da semana
            else if (['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].includes(opcaoSelecionada)) {
                usuarios[userId].data = opcaoSelecionada;
                enviarEnquete(enquete.chat, `Escolha um horário para ${opcaoSelecionada}:`, [
                    '09:00',
                    '10:00',
                    '11:00',
                    '14:00',
                    '15:00',
                    '16:00',
                    '# Voltar'
                ]);
            } 
            // Outras opções
            else {
                switch (opcaoSelecionada) {
                    case 'Escolher serviços':
                        enviarEnquete(enquete.chat, 'Escolha um serviço:', [
                            'Corte de cabelo - R$35,00',
                            'Barba - R$20,00',
                            'Cabelo e barba - R$50,00',
                            'Pezinho e sobrancelha - R$10,00',
                            'Combo - R$70,00',
                            '# Voltar'
                        ]);
                        break;
                    case 'Escolher horário':
                        enviarEnquete(enquete.chat, 'Escolha um dia da semana:', [
                            'Segunda-feira',
                            'Terça-feira',
                            'Quarta-feira',
                            'Quinta-feira',
                            'Sexta-feira',
                            'Sábado',
                            'Escolher outro dia',
                            '# Voltar'
                        ]);
                        break;
                    case 'Escolher outro dia':
                        await client.sendMessage(enquete.chat, 'Precisa de um dia específico? Digite a data assim: "10/10/2025"');
                        break;
                    case 'Falar com barbeiro':
                        await client.sendMessage(enquete.chat, '✅Você será redirecionado para um de nossos barbeiros em breve. Por favor, aguarde...');
                        break;
                    case 'Localização':
                        await client.sendMessage(enquete.chat, 'Nossa barbearia está localizada na Rua Exemplo, 123 - Centro\nCidade - Estado\nCEP: 12345-678\n\nHorário de funcionamento:\nSegunda a Sábado: 09:00 às 19:00');
                        break;
                    case '# Voltar':
                        enviarEnquete(enquete.chat, 'Como posso ajudar você hoje?', [
                            'Escolher serviços',
                            'Escolher horário',
                            'Falar com barbeiro',
                            'Localização'
                        ]);
                        break;
                    default:
                        await client.sendMessage(enquete.chat, '❌Opção inválida. Por favor, selecione uma das opções disponíveis.');
                }
            }
        }
    } catch (error) {
        console.error('Erro ao processar voto:', error);
    }
});

// Iniciar o cliente
client.initialize();