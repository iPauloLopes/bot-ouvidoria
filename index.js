const { Client, LocalAuth} = require('whatsapp-web.js');
const fs = require('fs'); //usando file system porquê um banco de dados é inviável no contexto do projeto
const { error } = require('console');

let chat = {};
const delay = 60000;

try {
    const chatState = fs.readFileSync('chatState.json', 'utf8');
    chat = JSON.parse(chatState);
} catch (error) {
    console.error('Falha na leitura do chatState.json =>', error.message);
    chat = {}; //cria chat vazio se falhar na leitura do arquivo
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false, //inicia o bot em uma janela e não em um processo em background
        args: [ //otimizações sugeridas pela comunidade para reduzir o uso de recursos da maquina
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
        ] 
    }
});

client.on('ready', () => {
    console.log('Whatsapp conectado com sucesso!');
});

let sending = false;

async function safeSend(to, message) { //função implementada para solucionar crashes com atendimentos simultâneos
    while (sending) {
        await new Promise(r => setTimeout(r, 100));
    }
    sending = true;
    try {
        if (client.info) {
            await client.sendMessage(to, message);
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem =>', error.message);
    }
    sending = false;
}

/* ===========================
FLUXO PRINCIPAL DE ATENDIMENTO
=========================== */
client.on('message', async msg => {
    try {
        if (!client.info) return;

        if (msg.type === 'chat' || msg.type === 'image' || msg.type === 'document') {
            const chatId = msg.from;

            if (!chat[chatId]) {
                chat[chatId] = { step: 1, type: 0 };
            }

            if (chat[chatId].step === 1) {
                await safeSend(msg.from, '🙋‍♀️ Olá! Eu sou a *Previ*, assistente virtual da Ouvidoria-Geral do Ministério da Previdência Social e estou aqui para ajudá-lo(a). \n\n Lembrando que este canal de atendimento é utilizado *somente para auxiliar no registro de manifestações* do sistema Fala.BR. Em caso de eventuais dúvidas, sugiro que verifique as "Orientações ao Cidadão", encontradas no link: \n https://www.gov.br/previdencia/pt-br/canais_atendimento/ouvidoria-geral/orientacoes-ao-cidadao');

                await safeSend(msg.from, 'Antes de continuar, preciso que você tenha conhecimento do tratamento de dados pessoais sob a legislação brasileira e esteja ciente dos termos de serviço e política de privacidade deste aplicativo, encontrados nos links abaixo: \n https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm \n https://www.whatsapp.com/legal/terms-of-service \n https://www.whatsapp.com/legal/privacy-policy_ \n\n *1* - *Li e estou ciente* da Legislação, Termos de Serviço e Política de Privacidade do WhatsApp. \n *2* - *Não estou ciente* da Legislação, Termos de Serviço e Política de Privacidade do WhatsApp.');

                chat[chatId].step = 2;
            }

            else if (chat[chatId].step === 2 && msg.body === '2') {
                await safeSend(msg.from, '❎ Atendimento finalizado!\n\n Infelizmente não posso continuar com seu atendimento sem que esteja ciente da Legislação, Termos de Serviço e Política de Privacidade do WhatsApp. Peço que acesse os links acima e retorne posteriormente para que possamos recomeçar seu atendimento.');
                delete chat[chatId];
            }

            else if (chat[chatId].step === 2 && msg.body !== '1' && msg.body !== '2') {
                await msg.reply('Por gentileza, escolha uma das opções válidas acima.');
            }

            else if (chat[chatId].step === 2 && msg.body === '1') {
                await safeSend(msg.from, 'Ótimo! Agora já podemos começar, primeiro escolha do tipo de manifestação que mais se adequa à sua necessidade: \n\n *1* - *Elogio* - _Expresse se você está satisfeito com um atendimento público._ \n *2* - *Reclamação* - _Manifeste sua insatisfação com um serviço público._ \n *3* - *Simplifique* - _Sugira alguma ideia para desburocratizar o serviço público._ \n *4* - *Solicitação* - _Peça um atendimento ou uma prestação de serviço._ \n *5* - *Sugestão* - _Envie uma ideia ou proposta de melhoria dos serviços públicos._');

                await safeSend(msg.from, 'Devido aos procedimentos e prazos especiais de tratamento, *não é possível registrar denúncias ou pedidos de acesso à informação* (LAI) por meio deste canal. Caso queira registrar um desses tipos de manifestação, você pode faze-lo diretamente no sistema Fala.BR.');

                chat[chatId].step = 3;
            }

            else if (chat[chatId].step === 3) {
                await safeSend(msg.from, 'Entendi. Agora preciso que você me informe alguns de seus dados. \n\n Comece informando seu *NOME COMPLETO*:');
                chat[chatId].type = msg.body;
                chat[chatId].step = 4;
            }

            else if (chat[chatId].step === 4) {
                await safeSend(msg.from, 'Obrigada! \n\n Agora, por gentileza, informe o seu *CPF* (somente com números):');
                chat[chatId].name = msg.body;
                chat[chatId].step = 5;
            }

            else if (chat[chatId].step === 5) {
                await safeSend(msg.from, 'Obrigada! \n\n Agora, informe o *E-MAIL* em que deseja receber atualizações sobre sua manifestação:');
                chat[chatId].cpf = msg.body;
                chat[chatId].step = 6;
            }

            else if (chat[chatId].step === 6) {
                await safeSend(msg.from, 'Obrigada! \n\n Por fim, informe o seu *ESTADO e MUNICÍPIO*:');
                chat[chatId].email = msg.body;
                chat[chatId].step = 7;
            }

            else if (chat[chatId].step === 7) {
                chat[chatId].address = msg.body;

                await safeSend(msg.from, `Para garantir que não haverá erros no seu registro, pode confirmar se seus dados estão corretos? \n\n Nome: ${chat[chatId].name} \n CPF: ${chat[chatId].cpf} \n E-mail: ${chat[chatId].email} \n Estado/Município: ${chat[chatId].address} \n\n *1* - Sim. \n *2* - Não.`);

                chat[chatId].step = 8;
            }

            else if (chat[chatId].step === 8 && msg.body === '2') {
                await safeSend(msg.from, 'Sinto muito. \n\n Vamos tentar de novo? Por favor me informe seu *NOME COMPLETO*');
                chat[chatId].step = 4;
            }

            else if (chat[chatId].step === 8 && msg.body === '1') {
                await safeSend(msg.from, 'Entendi. Por gentileza, relate agora sua manifestação. Lembre-se que você pode também enviar fotos, vídeos ou documentos para que sejam anexados a sua manifestação:');
                chat[chatId].step = 9;
            }

            else if (chat[chatId].step === 9) {
                chat[chatId].step = 9.1;

                setTimeout(async () => {
                    try {
                        if (!chat[chatId] || chat[chatId].step !== 9.1) return;
                        if (!client.info) return;

                        await safeSend(msg.from, 'Isto é tudo? Talvez você precise de mais tempo para escrever sua manifestação ou enviar documentos relevantes... \n\n *1* - Já terminei. \n *2* - Preciso de mais tempo.');

                        chat[chatId].step = 10;

                    } catch (error) {
                        console.error('Erro durante a escrita da manifestação =>:', error.message);
                    }
                }, delay * 4);
            }

            else if (chat[chatId].step === 10 && msg.body === '2') {
                await safeSend(msg.from, 'Tudo bem! Sinta-se a vontade para continuar escrevendo sua manifestação e/ou enviando documentos relevantes.');
                chat[chatId].step = 9;
            }

            else if (chat[chatId].step === 10 && msg.body === '1') {
                await safeSend(msg.from, '✅ Pronto!\n\n Sua manifestação será registrada pela equipe técnica da Ouvidoria-Geral do Ministério da Previdência Social dentro do prazo de até *2 (dois) dias úteis*.\n\n A Ouvidoria do Ministério da Previdência Social agradece seu contato. Estamos sempre à disposição!');
                chat[chatId].step = 0;
            }

            fs.writeFileSync('chatState.json', JSON.stringify(chat));
        }

    } catch (error) {
        console.error('Erro no atendimento =>', error.message);
    }
});

async function resetChat(chatId) { //reinicia o atendimento após o comando !restart
    if (chat[chatId]) {
        delete chat[chatId];
    }

    fs.writeFileSync('chatState.json', JSON.stringify(chat));

    await safeSend(chatId, '⚠️ Olá. Tivemos um problema técnico durante seu atendimento, quando quiser, você pode enviar qualquer mensagem que a gente recomeça. Pedimos desculpas pelo inconveniente.');

    chat[chatId] = {
        step: 1,
        type: 0
    };
}

client.on('message_create', async msg => { //cria o comando !restart para reiniciar o atendimento e checa se o comando foi enviado por mim

    try {
        if (!msg.fromMe) return;

        if (message.body === '!restart') {

            const chatId = msg.to;

            await resetChat(chatId);
        }

    } catch (error) {
        console.error('Falha ao reiniciar o atendimento =>', error.message);
    }

});

client.on('message', async msg => {
    if (msg.type === 'ptt') { //ptt se refere a mensagens de tipo áudio (?)
        await safeSend(msg.from, 'Desculpe, não realizamos atendimentos por áudio. Por favor, utilize mensagens de texto.');
    }
});

client.initialize();