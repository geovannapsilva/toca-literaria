// URLs das planilhas
const PLANILHA_ESTABELECIMENTO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPE_sxJFbhd25YRLSLz5cvRkU27t13VR5-VUTcFQsKfJsKoQohvcKFJm2p-jc61waoe960Gslf1Tik/pub?gid=1810386802&single=true&output=csv';
const PLANILHA_CATEGORIAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPE_sxJFbhd25YRLSLz5cvRkU27t13VR5-VUTcFQsKfJsKoQohvcKFJm2p-jc61waoe960Gslf1Tik/pub?gid=0&single=true&output=csv';
const PLANILHA_ITENS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPE_sxJFbhd25YRLSLz5cvRkU27t13VR5-VUTcFQsKfJsKoQohvcKFJm2p-jc61waoe960Gslf1Tik/pub?gid=943297977&single=true&output=csv';

// Estados dos dados
let estabelecimento = {
    nome: "Carregando...",
    descricao: "",
    telefone: "",
    endereco: "",
    horario: "",
    horario_abertura: "",
    horario_fechamento: "",
    dias_funcionamento: "",
    logo_url: ""
};
let categorias = [];
let itens = [];
let categoriasComItens = [];
let categoriaAtiva = 1;
let carregando = true;

// ✨ VARIAVEIS DE ESTADO DO CARRINHO (SACOLA)
let sacola = [];
let numeroMesa = null;
let tipoPedidoAtual = 'entrega';
let formaPagamentoAtual = 'dinheiro'; // Definir um padrão
// FIM - VARIAVEIS DE ESTADO

// 🚨 AVISO: Códigos de imagem não funcionam em hospedagem externa
// Para usar imagens, você deve:
// 1. Fazer upload das imagens para Google Drive, Dropbox ou outro serviço
// 2. Colocar as URLs públicas na planilha
// 3. Deixar este objeto vazio para hospedagem externa
const imagensProjeto = {
    // Removido para compatibilidade com hospedagem externa
    // Use URLs do Google Drive ou outros serviços na planilha
};

// ✨ FUNÇÕES DO CARRINHO (SACOLA)

// Utility para buscar item pelo ID
function buscarItemCardapio(itemId) {
    // Garantir que o ID seja string para comparação (mantendo o que vem do HTML)
    return itens.find(item => String(item.id) === String(itemId));
}

// 1. Adicionar item à sacola
function adicionarItem(itemId) {
    const itemCardapio = buscarItemCardapio(itemId);
    if (!itemCardapio) {
        mostrarFeedback('Item não encontrado!', 'error');
        return;
    }
    
    // Verificar disponibilidade (já feita em renderizarItens, mas garante)
    const itemDisponivel = itemCardapio.disponivel === 'TRUE' || itemCardapio.disponivel === true || itemCardapio.disponivel === 'true';
    if (!itemDisponivel) {
        mostrarFeedback(`${itemCardapio.nome} está indisponível no momento!`, 'error');
        return;
    }
    
    // Clonar o preço, pois a sacola manipula a quantidade
    let preco = 0;
    if (typeof itemCardapio.preco === 'number') {
        preco = itemCardapio.preco;
    } else if (typeof itemCardapio.preco === 'string') {
        preco = parseFloat(itemCardapio.preco.replace(',', '.')) || 0;
    }
    
    // Verificar se o item já existe na sacola
    const itemExistente = sacola.find(item => String(item.id) === String(itemId));

    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        sacola.push({
            id: String(itemId),
            nome: itemCardapio.nome,
            preco: preco,
            quantidade: 1,
            imagem_url: itemCardapio.imagem_url 
        });
    }

    // Adiciona a animação de "adicionado" ao botão
    const btn = document.getElementById(`btn-${itemId}`);
    if (btn) {
        btn.classList.add('item-adicionado');
        setTimeout(() => {
            btn.classList.remove('item-adicionado');
        }, 600);
    }

    atualizarSacola();
    mostrarFeedback(`${itemCardapio.nome} adicionado!`, 'success');
}
window.adicionarItem = adicionarItem; 

// 2. Ações de quantidade na sacola (usadas no modal)
function aumentarQuantidade(itemId) {
    const item = sacola.find(i => String(i.id) === String(itemId));
    if (item) {
        item.quantidade++;
        atualizarSacola();
    }
}
window.aumentarQuantidade = aumentarQuantidade; 

function diminuirQuantidade(itemId) {
    const itemIndex = sacola.findIndex(i => String(i.id) === String(itemId));
    if (itemIndex > -1) {
        if (sacola[itemIndex].quantidade > 1) {
            sacola[itemIndex].quantidade--;
        } else {
            // Se a quantidade for 1, remove o item
            sacola.splice(itemIndex, 1);
            mostrarFeedback('Item removido da sacola', 'error');
        }
        atualizarSacola();
    }
}
window.diminuirQuantidade = diminuirQuantidade; 

// 3. Limpar a sacola
function limparSacola() {
    sacola = [];
    atualizarSacola();
    fecharModalSacola();
    mostrarFeedback('Sacola esvaziada!', 'error');
}
window.limparSacola = limparSacola; 

// 4. Funções do Modal (abrir/fechar)
const modalCarrinho = document.getElementById('modalCarrinho'); 

function abrirModalCarrinho() { 
    const statusFuncionamento = verificarHorarioFuncionamento();
    if (!statusFuncionamento.aberto && sacola.length === 0) {
        // Se a loja está fechada e o carrinho vazio, não faz sentido abrir o modal
        mostrarFeedback('Não é possível realizar pedidos pois o estabelecimento está fechado.', 'error');
        return;
    }
    
    modalCarrinho.classList.remove('hidden');
    atualizarSacola(); 
}
window.abrirModalCarrinho = abrirModalCarrinho; 

function fecharModalSacola() { 
    modalCarrinho.classList.add('hidden');
}
window.fecharModalSacola = fecharModalSacola; 


// 5. Função de atualização e renderização do Carrinho/Sacola
function atualizarSacola() {
    const carrinhoFlutuante = document.getElementById('carrinhoFlutuante');
    const badgeQuantidade = document.getElementById('badgeQuantidade');
    const badgeTotal = document.getElementById('badgeTotal');
    const itensSacolaModal = document.getElementById('itensSacolaModal'); 
    const totalSacolaModal = document.getElementById('totalSacolaModal'); 
    const quantidadeItensModal = document.getElementById('quantidadeItensModal');
    const SacolaVazio = document.getElementById('SacolaVazio'); 
    const footerModal = document.getElementById('footerModal');
    const totalFinalModal = document.getElementById('totalFinalModal'); // Total do modal de checkout
    
    // 1. Calcular totais
    let totalItens = 0;
    let totalPreco = 0;
    sacola.forEach(item => {
        totalItens += item.quantidade;
        totalPreco += item.preco * item.quantidade;
    });

    // 2. Lógica de estado vazio
    if (sacola.length === 0) {
        if(carrinhoFlutuante) carrinhoFlutuante.classList.add('hidden');
        if(SacolaVazio) SacolaVazio.classList.remove('hidden');
        if(itensSacolaModal) itensSacolaModal.innerHTML = ''; 
        if(footerModal) footerModal.classList.add('hidden');
        if(badgeQuantidade) badgeQuantidade.textContent = 0;
        if(badgeTotal) badgeTotal.textContent = formatarPreco(0);
        if(quantidadeItensModal) quantidadeItensModal.textContent = '0 itens';
        if(totalSacolaModal) totalSacolaModal.textContent = formatarPreco(0);
        if(totalFinalModal) totalFinalModal.textContent = formatarPreco(0);
        return;
    }

    // 3. Atualizar UI (mostrando o carrinho)
    if(carrinhoFlutuante) carrinhoFlutuante.classList.remove('hidden');
    if(SacolaVazio) SacolaVazio.classList.add('hidden');
    if(footerModal) footerModal.classList.remove('hidden');

    if(badgeQuantidade) badgeQuantidade.textContent = totalItens;
    if(badgeTotal) badgeTotal.textContent = formatarPreco(totalPreco);
    if(totalSacolaModal) totalSacolaModal.textContent = formatarPreco(totalPreco);
    if(quantidadeItensModal) quantidadeItensModal.textContent = `${totalItens} item${totalItens !== 1 ? 's' : ''}`;
    if(totalFinalModal) totalFinalModal.textContent = formatarPreco(totalPreco); // Atualiza também o total do modal de checkout

    // 4. Renderizar itens no modal
    if(itensSacolaModal) {
        itensSacolaModal.innerHTML = '';
        sacola.forEach(item => {
            const subtotal = item.preco * item.quantidade;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm';
            
            // Gerar HTML do item no modal
            itemDiv.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-800">${item.nome}</h4>
                        <p class="text-sm text-pink-600 font-bold mt-1">${formatarPreco(item.preco)}/un</p>
                    </div>
                    
                    <div class="text-right ml-4 flex-shrink-0">
                        <span class="text-lg font-bold text-green-600">${formatarPreco(subtotal)}</span>
                        
                        <div class="flex items-center justify-end mt-2">
                            <button 
                                onclick="diminuirQuantidade('${item.id}')" 
                                class="w-8 h-8 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors flex items-center justify-center text-xl pb-0.5"
                                ${item.quantidade === 1 ? 'title="Remover Item"' : 'title="Diminuir Quantidade"'}
                            >
                                -
                            </button>
                            <span class="mx-3 font-bold text-gray-800">${item.quantidade}</span>
                            <button 
                                onclick="aumentarQuantidade('${item.id}')" 
                                class="w-8 h-8 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors flex items-center justify-center text-xl pb-0.5"
                                title="Aumentar Quantidade"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            `;
            itensSacolaModal.appendChild(itemDiv);
        });
    }

    // 5. Atualizar botões de finalização se estiver fechado
    const statusFuncionamento = verificarHorarioFuncionamento();
    const btnFinalizar = document.getElementById('btn-finalizar');
    
    if (btnFinalizar) {
        if (!statusFuncionamento.aberto) {
            btnFinalizar.disabled = true;
            btnFinalizar.classList.add('opacity-50', 'cursor-not-allowed');
            btnFinalizar.classList.remove('hover:from-green-600', 'hover:to-green-700');
            btnFinalizar.textContent = '🔴 Estabelecimento Fechado';
        } else {
            btnFinalizar.disabled = false;
            btnFinalizar.classList.remove('opacity-50', 'cursor-not-allowed');
            btnFinalizar.classList.add('hover:from-green-600', 'hover:to-green-700');
            btnFinalizar.textContent = '📱 Finalizar Pedido 💕';
        }
    }
}
window.atualizarSacola = atualizarSacola; 

// FIM - FUNÇÕES DO CARRINHO (SACOLA)

// ✨ FUNÇÃO: Converter URLs do Google Drive
function converterUrlParaImagemDireta(url) {
    if (!url || url.trim() === '') return null;

    // GOOGLE DRIVE - Múltiplos formatos para tentativa automática
    if (url.includes('drive.google.com')) {
        let fileId = null;

        // Formato 1: /file/d/ID/view
        let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            fileId = match[1];
        }

        // Formato 2: id=ID (parâmetros)
        if (!fileId) {
            match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) {
                fileId = match[1];
            }
        }

        if (fileId) {
            return {
                tipo: 'google-drive',
                formatos: [
                    `https://lh3.googleusercontent.com/d/${fileId}=w600-h400-k-rw`,
                    `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
                    `https://drive.google.com/uc?export=view&id=${fileId}`,
                    `https://docs.google.com/uc?export=view&id=${fileId}`,
                    `https://lh3.googleusercontent.com/d/${fileId}=w400`
                ]
            };
        }
    }

    // URL EXTERNA NORMAL
    else if (url.startsWith('http')) {
        return { tipo: 'url-simples', url: url };
    }

    return null;
}



// Função para converter CSV em array de objetos (melhorada)
function csvParaObjetos(csvText) {
    console.log('CSV recebido:', csvText);

    if (!csvText || csvText.trim() === '') {
        console.error('CSV vazio');
        return [];
    }

    const linhas = csvText.trim().split('\n');

    if (linhas.length < 2) {
        console.error('CSV deve ter pelo menos cabeçalho e uma linha de dados');
        return [];
    }

    // Processar cabeçalho
    const cabecalho = linhas[0].split(',').map(col => col.trim().replace(/"/g, ''));
    console.log('Cabeçalho:', cabecalho);

    // Processar linhas de dados
    const dados = [];
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        // Melhor parsing de CSV considerando vírgulas dentro de aspas
        const valores = parseCSVLine(linha);
        const objeto = {};

        cabecalho.forEach((col, index) => {
            let valor = valores[index] || '';

            // Converter valores numéricos
            if (col === 'preco' && valor) {
                valor = parseFloat(valor.replace(',', '.')) || 0;
            }

            // Limpar aspas
            if (typeof valor === 'string') {
                valor = valor.replace(/^"|"$/g, '');
            }

            objeto[col] = valor;
        });

        dados.push(objeto);
    }

    console.log('Dados processados:', dados);
    return dados;
}

// Função para fazer parsing correto de linha CSV
function parseCSVLine(linha) {
    const resultado = [];
    let valorAtual = '';
    let dentroDeAspas = false;

    for (let i = 0; i < linha.length; i++) {
        const char = linha[i];

        if (char === '"') {
            dentroDeAspas = !dentroDeAspas;
        } else if (char === ',' && !dentroDeAspas) {
            resultado.push(valorAtual.trim());
            valorAtual = '';
        } else {
            valorAtual += char;
        }
    }

    resultado.push(valorAtual.trim());
    return resultado;
}

// Função para carregar dados das planilhas
async function carregarDados() {
    try {
        // Mostrar loading
        mostrarLoading();

        console.log('Iniciando carregamento das planilhas...');

        // Carregar estabelecimento
        console.log('Carregando estabelecimento...');
        const respEstabelecimento = await fetch(PLANILHA_ESTABELECIMENTO);
        if (!respEstabelecimento.ok) throw new Error('Erro ao carregar planilha Estabelecimento');

        const csvEstabelecimento = await respEstabelecimento.text();
        const dadosEstabelecimento = csvParaObjetos(csvEstabelecimento);

        if (dadosEstabelecimento.length > 0) {
            estabelecimento = dadosEstabelecimento[0];
            console.log('Estabelecimento carregado:', estabelecimento);
        } else {
            console.warn('Nenhum dado de estabelecimento encontrado');
        }

        // Carregar categorias
        console.log('Carregando categorias...');
        const respCategorias = await fetch(PLANILHA_CATEGORIAS);
        if (!respCategorias.ok) throw new Error('Erro ao carregar planilha Categorias');

        const csvCategorias = await respCategorias.text();
        categorias = csvParaObjetos(csvCategorias);
        console.log('Categorias carregadas:', categorias);

        // Carregar itens
        console.log('Carregando itens...');
        const respItens = await fetch(PLANILHA_ITENS);
        if (!respItens.ok) throw new Error('Erro ao carregar planilha Itens');

        const csvItens = await respItens.text();
        itens = csvParaObjetos(csvItens);
        console.log('Itens carregados:', itens);

        // Combinar categorias com itens
        categoriasComItens = categorias.map(categoria => ({
            ...categoria,
            itens: itens.filter(item => item.categoria_id == categoria.id)
        }));

        console.log('Categorias com itens:', categoriasComItens);

        // Se houver categorias, definir a primeira como ativa
        if (categorias.length > 0) {
            categoriaAtiva = parseInt(categorias[0].id);
        }

        carregando = false;
        ocultarLoading();
        carregarEstabelecimento();
        renderizarCategorias();
        renderizarItens();

        console.log('Carregamento concluído com sucesso!');

    } catch (error) {
        console.error('Erro detalhado ao carregar dados:', error);
        carregando = false;
        ocultarLoading();
        mostrarErroDetalhado(error.message);
    }
}

// Função para mostrar loading
function mostrarLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('cardapio').classList.add('hidden');
}

// Função para ocultar loading
function ocultarLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('cardapio').classList.remove('hidden');
}

// Função para mostrar erro detalhado
function mostrarErroDetalhado(mensagem) {
    document.body.innerHTML = `
                <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div class="text-center max-w-md">
                        <div class="text-6xl mb-4">❌</div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Erro ao carregar dados</h2>
                        <p class="text-gray-600 mb-4">${mensagem}</p>
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                            <h3 class="font-bold text-yellow-800 mb-2">🔍 Verifique:</h3>
                            <ul class="text-sm text-yellow-700 space-y-1">
                                <li>• As planilhas estão preenchidas com dados</li>
                                <li>• As planilhas estão publicadas na web</li>
                                <li>• Os cabeçalhos estão corretos</li>
                                <li>• Abra o console do navegador (F12) para mais detalhes</li>
                            </ul>
                        </div>
                        <button onclick="location.reload()" class="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600">
                            Tentar novamente
                        </button>
                    </div>
                </div>
            `;
}

// Função para verificar se o estabelecimento está aberto
function verificarHorarioFuncionamento() {
    const agora = new Date();
    const diaAtual = agora.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const tempoAtual = horaAtual * 60 + minutoAtual; // Converter para minutos

    // Se não tiver horários específicos configurados, considerar sempre aberto
    if (!estabelecimento.horario_abertura || !estabelecimento.horario_fechamento) {
        return { aberto: true, motivo: '' };
    }

    // Verificar dias de funcionamento (se especificado)
    if (estabelecimento.dias_funcionamento && estabelecimento.dias_funcionamento.trim() !== '') {
        const diasPermitidos = estabelecimento.dias_funcionamento.toLowerCase().split(',').map(d => d.trim());
        const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        const diaHoje = diasSemana[diaAtual];

        if (!diasPermitidos.includes(diaHoje) && !diasPermitidos.includes('todos')) {
            return {
                aberto: false,
                motivo: `Funcionamos apenas: ${estabelecimento.dias_funcionamento}`
            };
        }
    }

    // Converter horários de abertura e fechamento para minutos
    const [horaAbertura, minutoAbertura] = estabelecimento.horario_abertura.split(':').map(Number);
    const [horaFechamento, minutoFechamento] = estabelecimento.horario_fechamento.split(':').map(Number);

    const tempoAbertura = horaAbertura * 60 + minutoAbertura;
    const tempoFechamento = horaFechamento * 60 + minutoFechamento;

    // Verificar se está dentro do horário
    let estaAberto = false;

    if (tempoFechamento > tempoAbertura) {
        // Horário normal (ex: 09:00 às 18:00)
        estaAberto = tempoAtual >= tempoAbertura && tempoAtual <= tempoFechamento;
    } else {
        // Horário que cruza meia-noite (ex: 18:00 às 02:00)
        estaAberto = tempoAtual >= tempoAbertura || tempoAtual <= tempoFechamento;
    }

    if (!estaAberto) {
        return {
            aberto: false,
            motivo: `Horário de funcionamento: ${estabelecimento.horario_abertura} às ${estabelecimento.horario_fechamento}`
        };
    }

    return { aberto: true, motivo: '' };
}

// Função para carregar dados do estabelecimento na interface
function carregarEstabelecimento() {
    const nomeEstab = estabelecimento.nome || 'Nome não informado';

    // Header principal
    document.getElementById('nomeEstabelecimento').textContent = nomeEstab;
    document.getElementById('descricaoEstabelecimento').textContent = estabelecimento.descricao || '';
    document.getElementById('telefoneEstabelecimento').textContent = estabelecimento.telefone || '';
    document.getElementById('enderecoEstabelecimento').textContent = estabelecimento.endereco || '';

    // Header compacto
    document.getElementById('nomeCompacto').textContent = nomeEstab;

    // Mostrar status de funcionamento
    const statusFuncionamento = verificarHorarioFuncionamento();
    const horarioTexto = estabelecimento.horario || '';
    const statusTexto = statusFuncionamento.aberto ? '🟢 Aberto' : '🔴 Fechado';
    const statusTextoCompacto = statusFuncionamento.aberto ? '🟢 Aberto' : '🔴 Fechado';

    document.getElementById('horarioEstabelecimento').innerHTML = `${horarioTexto} ${statusTexto}`;
    document.getElementById('statusCompacto').textContent = statusTextoCompacto;

    // Atualizar carrinho e botões se estiver fechado
    if (!statusFuncionamento.aberto) {
        mostrarAvisoFechado(statusFuncionamento.motivo);
    }

    // Carregar logo se disponível
    if (estabelecimento.logo_url && estabelecimento.logo_url.trim() !== '') {
        const logoImg = document.getElementById('logoEstabelecimento');
        const logoCompacto = document.getElementById('logoCompacto');
        const logoConfig = converterUrlParaImagemDireta(estabelecimento.logo_url.trim());

        if (logoConfig) {
            if (logoConfig.tipo === 'google-drive') {
                // Logo principal
                logoImg.src = logoConfig.formatos[0];
                logoImg.onerror = function () {
                    let formatoAtual = logoConfig.formatos.findIndex(url => url === this.src);
                    if (formatoAtual < logoConfig.formatos.length - 1) {
                        this.src = logoConfig.formatos[formatoAtual + 1];
                    } else {
                        this.style.display = 'none';
                        document.getElementById('logoPlaceholder').style.display = 'flex';
                    }
                };

                // Logo compacto
                logoCompacto.src = logoConfig.formatos[0];
                logoCompacto.onload = function () {
                    document.getElementById('logoCompactoPlaceholder').style.display = 'none';
                    this.classList.remove('hidden');
                };
                logoCompacto.onerror = function () {
                    let formatoAtual = logoConfig.formatos.findIndex(url => url === this.src);
                    if (formatoAtual < logoConfig.formatos.length - 1) {
                        this.src = logoConfig.formatos[formatoAtual + 1];
                    } else {
                        this.style.display = 'none';
                        document.getElementById('logoCompactoPlaceholder').style.display = 'flex';
                    }
                };
            } else {
                logoImg.src = logoConfig.url;
                logoCompacto.src = logoConfig.url;
                logoCompacto.onload = function () {
                    document.getElementById('logoCompactoPlaceholder').style.display = 'none';
                    this.classList.remove('hidden');
                };
            }
        }
    }
}

// Função para formatar preço
function formatarPreco(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Função para renderizar categorias
function renderizarCategorias() {
    const categoriasNav = document.getElementById('categoriasNav');
    if (!categoriasNav) return;

    categoriasNav.innerHTML = '';

    categorias.forEach(categoria => {
        const botao = document.createElement('button');
        botao.className = `categoria-btn px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${categoria.id == categoriaAtiva
                ? 'ativa'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`;
        botao.textContent = `${categoria.icone} ${categoria.nome}`;
        botao.onclick = () => {
            categoriaAtiva = parseInt(categoria.id);
            renderizarCategorias();
            renderizarItens();
        };
        categoriasNav.appendChild(botao);
    });
}

// Função para renderizar itens
function renderizarItens() {
    const categoriaAtual = categoriasComItens.find(cat => cat.id == categoriaAtiva);
    const tituloCategoria = document.getElementById('tituloCategoria');
    const listaItens = document.getElementById('listaItens');

    if (!categoriaAtual || !tituloCategoria || !listaItens) return;

    tituloCategoria.innerHTML = `${categoriaAtual.icone} ${categoriaAtual.nome}`;
    listaItens.innerHTML = '';

    if (!categoriaAtual.itens || categoriaAtual.itens.length === 0) {
        listaItens.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">🍽️</div>
                        <p>Nenhum item disponível nesta categoria</p>
                    </div>
                `;
        return;
    }

    categoriaAtual.itens.forEach(item => {
        // Verificar disponibilidade de forma mais robusta
        const itemDisponivel = item.disponivel === 'TRUE' || item.disponivel === true || item.disponivel === 'true';

        // Garantir que o preço seja um número
        let preco = 0;
        if (typeof item.preco === 'number') {
            preco = item.preco;
        } else if (typeof item.preco === 'string') {
            preco = parseFloat(item.preco.replace(',', '.')) || 0;
        }

        const precoFormatado = formatarPreco(preco);

        // ✨ PROCESSAR URL DA IMAGEM - COM SISTEMA DE FALLBACK
        let imagemConfig = null;
        if (item.imagem_url && item.imagem_url.trim() !== '') {
            const urlLimpa = item.imagem_url.trim();

            // PROCESSAR URL COM FUNÇÃO MELHORADA
            imagemConfig = converterUrlParaImagemDireta(urlLimpa);


        }

        const itemDiv = document.createElement('div');
        itemDiv.className = `item-card bg-white rounded-lg shadow-md overflow-hidden ${!itemDisponivel ? 'opacity-60' : ''}`;

        // 🔧 GERAR HTML DA IMAGEM COM SISTEMA DE FALLBACK
        let htmlImagem = '';
        if (imagemConfig) {
            if (imagemConfig.tipo === 'google-drive') {
                // Sistema de múltiplas tentativas para Google Drive
                const fallbackUrls = imagemConfig.formatos.map((url, index) =>
                    `this.src='${url}'; this.onerror=${index === imagemConfig.formatos.length - 1 ? 'mostrarErroImagem(this)' : `this.src='${imagemConfig.formatos[index + 1]}';`}`
                ).join('');

                htmlImagem = `
                        <div class="md:w-1/3">
                            <img
                                src="${imagemConfig.formatos[0]}"
                                alt="${item.nome}"
                                class="w-full h-48 md:h-48 object-contain bg-gray-50 rounded-lg"
                                onload=""
                                onerror="${fallbackUrls} mostrarErroImagem(this);"
                                loading="lazy"
                            />
                        </div>`;
            } else {
                // URL simples (Dropbox, URLs externas)
                htmlImagem = `
                        <div class="md:w-1/3">
                            <img
                                src="${imagemConfig.url}"
                                alt="${item.nome}"
                                class="w-full h-48 md:h-48 object-contain bg-gray-50"
                                onload=""
                                onerror="mostrarErroImagem(this);"
                                loading="lazy"
                            />
                        </div>`;
            }
        } else {
            htmlImagem = `
                    <div class="md:w-1/3 bg-gray-100 flex items-center justify-center rounded-lg">
                        <div class="text-center p-4">
                            <div class="text-4xl mb-2">🍽️</div>
                            <p class="text-gray-500 text-sm">Sem imagem</p>
                        </div>
                    </div>`;
        }

        itemDiv.innerHTML = `
                    <div class="flex flex-col md:flex-row">
                        ${htmlImagem}
                        <div class="${imagemConfig ? 'flex-1' : 'w-full'} p-4">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="text-lg font-semibold text-gray-800">${item.nome}</h3>
                                ${!itemDisponivel ? `
                                    <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                        Indisponível
                                    </span>
                                ` : ''}
                            </div>
                            <p class="text-gray-600 text-sm mb-3">${item.descricao}</p>
                            
                            <div class="flex justify-between items-center">
                                <span class="text-2xl font-bold text-pink-600">
                                    ${precoFormatado}
                                </span>
                                
                                ${itemDisponivel ? `
                                    <button
                                        id="btn-${item.id}"
                                        onclick="adicionarItem('${item.id}')"
                                        class="btn-pedido bg-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-pink-600 transition-colors"
                                    >
                                        Adicionar
                                    </button>
                                ` : `
                                    <span class="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg font-medium cursor-not-allowed">
                                        Indisponível
                                    </span>
                                `}
                                </div>
                        </div>
                    </div>
                `;
        listaItens.appendChild(itemDiv);
    });

    // Garante que o estado inicial do carrinho seja verificado
    // Chame atualizarSacola() ao renderizar itens para sincronizar
    atualizarSacola();
}


// Função para mostrar erro de imagem (pode ser ajustada)
function mostrarErroImagem(imgElement) {
    imgElement.onerror = null; // Previne loop infinito
    imgElement.style.display = 'none';
    const container = imgElement.closest('.md\\:w-1\\/3');
    if (container) {
        container.innerHTML = `
            <div class="bg-gray-100 flex items-center justify-center rounded-lg h-full">
                <div class="text-center p-4">
                    <div class="text-4xl mb-2">🖼️</div>
                    <p class="text-gray-500 text-sm">Erro ao carregar imagem</p>
                </div>
            </div>
        `;
    }
}

// Funções de Desabilitar/Habilitar botões
function mostrarAvisoFechado(motivo) {
    // Verificar se o aviso já existe para não duplicar
    if (document.getElementById('avisoFechado')) return;

    // Criar novo aviso
    const aviso = document.createElement('div');
    aviso.id = 'avisoFechado';
    aviso.className = 'bg-red-50 border border-red-200 rounded-lg p-4 mb-6';
    aviso.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="text-2xl">🔴</div>
                    <div>
                        <h3 class="font-bold text-red-800 mb-1">Estabelecimento Fechado</h3>
                        <p class="text-red-700 text-sm">${motivo}</p>
                        <p class="text-red-600 text-xs mt-1">Não é possível fazer pedidos no momento</p>
                    </div>
                </div>
            `;

    // Inserir após o header
    const main = document.querySelector('main .max-w-4xl');
    main.insertBefore(aviso, main.firstChild);

    // Desabilitar todos os botões de adicionar
    desabilitarBotoesAdicionar();
}

// Função para desabilitar botões de adicionar ao carrinho
function desabilitarBotoesAdicionar() {
    const botoes = document.querySelectorAll('.btn-pedido:not([disabled])');
    botoes.forEach(botao => {
        if (!botao.disabled) {
            botao.disabled = true;
            botao.classList.remove('bg-pink-500', 'hover:bg-pink-600');
            botao.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            botao.textContent = '🔴 Fechado';
        }
    });
}

// Função para habilitar botões de adicionar ao carrinho
function habilitarBotoesAdicionar() {
    const botoes = document.querySelectorAll('.btn-pedido[disabled]');
    botoes.forEach(botao => {
        // ...
        // Esta função não está sendo usada atualmente, mas seria o inverso de desabilitar
    });
}

// Funções do Modal de Entrega/Checkout
const modalEntrega = document.getElementById('modalEntrega');
function abrirModalEntrega() {
    if (sacola.length === 0) {
        mostrarFeedback('Sua sacola está vazia!', 'error');
        return;
    }
    
    // Atualiza o total final no modal de checkout
    atualizarSacola();

    fecharModalSacola(); // Fecha o modal do carrinho
    modalEntrega.classList.remove('hidden');
    selecionarTipoPedido(tipoPedidoAtual); // Garante que o estado inicial (entrega) esteja ativo
    selecionarPagamento(formaPagamentoAtual); // Garante que o estado inicial (dinheiro) esteja ativo
}
window.abrirModalEntrega = abrirModalEntrega;

function fecharModalEntrega() {
    modalEntrega.classList.add('hidden');
}
window.fecharModalEntrega = fecharModalEntrega;

function selecionarTipoPedido(tipo) {
    tipoPedidoAtual = tipo;
    const btnEntrega = document.getElementById('btn-entrega');
    const btnRetirada = document.getElementById('btn-retirada');
    const enderecoSection = document.getElementById('enderecoSection');

    // Resetar classes
    btnEntrega.className = 'w-1/2 bg-gray-100 border-2 border-transparent p-3 rounded-lg text-center transition hover:bg-gray-200';
    btnRetirada.className = 'w-1/2 bg-gray-100 border-2 border-transparent p-3 rounded-lg text-center transition hover:bg-gray-200';

    if (tipo === 'entrega') {
        btnEntrega.className = 'w-1/2 bg-blue-50 border-2 border-blue-300 p-3 rounded-lg text-center transition';
        enderecoSection.classList.remove('hidden');
    } else {
        btnRetirada.className = 'w-1/2 bg-blue-50 border-2 border-blue-300 p-3 rounded-lg text-center transition';
        enderecoSection.classList.add('hidden');
    }
}
window.selecionarTipoPedido = selecionarTipoPedido;

function selecionarPagamento(forma) {
    formaPagamentoAtual = forma;
    // Atualizar botões
    document.querySelectorAll('.pagamento-btn').forEach(btn => {
        btn.className = 'pagamento-btn w-[calc(50%-8px)] bg-gray-100 border-2 border-transparent p-3 rounded-lg text-center transition hover:bg-gray-50';
    });

    // Destacar botão selecionado
    const cores = {
        'dinheiro': 'bg-green-50 border-green-300',
        'cartao': 'bg-blue-50 border-blue-300',
        'pix': 'bg-purple-50 border-purple-300'
    };
    event.target.closest('.pagamento-btn').className = `pagamento-btn w-[calc(50%-8px)] ${cores[forma]} border-2 p-3 rounded-lg text-center transition`;

    // Mostrar/esconder campo de troco
    const dinheiroTroco = document.getElementById('dinheiroTroco');
    if (forma === 'dinheiro') {
        dinheiroTroco.classList.remove('hidden');
    } else {
        dinheiroTroco.classList.add('hidden');
    }
}
window.selecionarPagamento = selecionarPagamento;

function formatarCEP(campo) {
    let valor = campo.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (valor.length > 5) {
        valor = valor.substring(0, 5) + '-' + valor.substring(5, 8);
    }
    campo.value = valor;
}
window.formatarCEP = formatarCEP;

async function buscarCEP() {
    const cep = document.getElementById('cepCliente').value.replace(/\D/g, '');
    if (cep.length !== 8) {
        mostrarFeedback('CEP deve ter 8 dígitos!', 'error');
        return;
    }
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) {
            mostrarFeedback('CEP não encontrado!', 'error');
            return;
        }
        // Preencher campos
        document.getElementById('ruaCliente').value = data.logradouro || '';
        document.getElementById('bairroCliente').value = data.bairro || '';
        document.getElementById('cidadeCliente').value = `${data.localidade} - ${data.uf}` || '';
        // Focar no número
        document.getElementById('numeroCliente').focus();
        mostrarFeedback('Endereço preenchido!', 'success');
    } catch (error) {
        mostrarFeedback('Erro ao buscar CEP. Preencha manualmente.', 'error');
        console.error('Erro ao buscar CEP:', error);
    }
}
window.buscarCEP = buscarCEP;

function enviarPedidoEntrega() {
    // Validação básica
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim().replace(/\D/g, '');

    if (!nome || telefone.length < 10) {
        mostrarFeedback('Preencha seu nome e telefone corretamente!', 'error');
        return;
    }

    if (tipoPedidoAtual === 'entrega') {
        const rua = document.getElementById('ruaCliente').value.trim();
        const numero = document.getElementById('numeroCliente').value.trim();
        if (!rua || !numero) {
            mostrarFeedback('Preencha o endereço de entrega completo!', 'error');
            return;
        }
    }

    if (!formaPagamentoAtual) {
        mostrarFeedback('Selecione uma forma de pagamento!', 'error');
        return;
    }

    // Dados do pedido
    const observacoes = document.getElementById('observacoesCliente').value.trim();

    // Dados de endereço (se entrega)
    let enderecoCompleto = '';
    if (tipoPedidoAtual === 'entrega') {
        const rua = document.getElementById('ruaCliente').value.trim();
        const numero = document.getElementById('numeroCliente').value.trim();
        const bairro = document.getElementById('bairroCliente').value.trim();
        const cidade = document.getElementById('cidadeCliente').value.trim();
        const complemento = document.getElementById('complementoCliente').value.trim();
        const referencia = document.getElementById('referenciaCliente').value.trim();

        enderecoCompleto = `📍 *Endereço:*\n${rua}, ${numero}${complemento ? ` - ${complemento}` : ''}\n${bairro} - ${cidade}`;
        if (referencia) {
            enderecoCompleto += `\nReferência: ${referencia}`;
        }
    }

    // Dados de pagamento
    let pagamentoTexto = '';
    const formasPagamento = {
        'dinheiro': '💵 Dinheiro',
        'cartao': '💳 Cartão',
        'pix': '📱 PIX'
    };
    pagamentoTexto = formasPagamento[formaPagamentoAtual];
    if (formaPagamentoAtual === 'dinheiro') {
        const troco = document.getElementById('trocoCliente').value.trim();
        if (troco) {
            pagamentoTexto += ` - Troco para ${troco}`;
        }
    }

    // Calcular total
    let total = sacola.reduce((sum, item) => sum + item.preco * item.quantidade, 0);

    // Montar mensagem do WhatsApp
    const telefoneEstab = estabelecimento.telefone.replace(/\D/g, '');
    let mensagem = '';

    // Cabeçalho
    if (tipoPedidoAtual === 'entrega') {
        mensagem = `🚚 *PEDIDO PARA ENTREGA*\n\n`;
        if (numeroMesa) {
            mensagem += `🪑 *Mesa:* ${numeroMesa}\n`;
        }
        mensagem += `${enderecoCompleto}\n\n`;
    } else {
        mensagem = `🚶‍♂️ *PEDIDO PARA RETIRADA NO LOCAL*\n\n`;
        if (numeroMesa) {
            mensagem += `🪑 *Mesa:* ${numeroMesa}\n\n`;
        }
    }

    // Itens
    mensagem += `👤 *Cliente:* ${nome}\n`;
    mensagem += `📱 *Telefone:* (${telefone.substring(0, 2)}) ${telefone.substring(2, 7)}-${telefone.substring(7)}\n\n`;
    mensagem += `--- *ITENS DO PEDIDO* ---\n`;
    sacola.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        mensagem += `• ${item.nome} x ${item.quantidade} - ${formatarPreco(subtotal)}\n`;
    });
    mensagem += `--------------------------\n`;
    mensagem += `💰 *TOTAL:* ${formatarPreco(total)}\n\n`;

    // Rodapé
    mensagem += `💳 *Pagamento:* ${pagamentoTexto}\n\n`;
    if (observacoes) {
        mensagem += `📝 *Obs.:* ${observacoes}\n\n`;
    }

    mensagem += `Obrigado!`;

    // Enviar para WhatsApp
    const url = `https://wa.me/55${telefoneEstab}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');

    // Fechar modal e limpar carrinho após enviar
    fecharModalEntrega();
    limparSacola();
    mostrarFeedback('Pedido enviado com sucesso!', 'success');
}
window.enviarPedidoEntrega = enviarPedidoEntrega;

function enviarPedidoSimples() {
    // Função de fallback para pedidos de mesa, não usada diretamente na versão final do checkout acima.
    enviarPedidoEntrega();
}
window.enviarPedidoSimples = enviarPedidoSimples;

function mostrarFeedback(mensagem, tipo = 'success') {
    // Criar elemento de feedback
    const feedback = document.createElement('div');
    const corFundo = tipo === 'success' ? 'bg-green-500' : tipo === 'error' ? 'bg-red-500' : 'bg-blue-500';
    feedback.className = `fixed top-4 right-4 ${corFundo} text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform`;
    feedback.textContent = mensagem;

    // Verificar se já existe e remover
    const existente = document.querySelector('.fixed.top-4.right-4.z-50');
    if (existente) existente.remove();

    document.body.appendChild(feedback);

    // Animar entrada
    setTimeout(() => {
        feedback.classList.remove('translate-x-full');
    }, 100);

    // Remover após 4 segundos (mais tempo para mensagens de erro)
    const duracao = tipo === 'error' ? 4000 : 3000;
    setTimeout(() => {
        feedback.classList.add('translate-x-full');
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 300);
    }, duracao);
}

// Funções de Mesa (URL Parameter)
function obterNumeroMesa() {
    const urlParams = new URLSearchParams(window.location.search);
    const mesa = urlParams.get('mesa');
    if (mesa) {
        numeroMesa = mesa;
        tipoPedidoAtual = 'retirada'; // Define o padrão como retirada se for pedido de mesa
    }
}
window.obterNumeroMesa = obterNumeroMesa;

// Função para mostrar informação da mesa no header
function mostrarInfoMesa() {
    if (!numeroMesa) return;

    // Criar elemento de informação da mesa
    const infoMesa = document.createElement('div');
    infoMesa.className = 'bg-blue-500 text-white text-center py-2 px-4';
    infoMesa.innerHTML = `
                <div class="flex items-center justify-center gap-2">
                    <span class="text-lg">🪑</span>
                    <span class="font-bold">Mesa ${numeroMesa}</span>
                </div>
            `;

    // Inserir após o header principal
    const headerPrincipal = document.getElementById('headerPrincipal');
    headerPrincipal.parentNode.insertBefore(infoMesa, headerPrincipal.nextSibling);

    // Adicionar também no header compacto
    const headerCompacto = document.getElementById('headerCompacto');
    const divInfoCompacta = headerCompacto.querySelector('.flex.items-center.justify-between');

    // Remove o status original
    const statusCompacto = document.getElementById('statusCompacto');
    if(statusCompacto) statusCompacto.remove();

    // Adiciona a info da mesa no lugar do status
    const infoMesaCompacta = document.createElement('div');
    infoMesaCompacta.className = 'text-xs font-medium bg-blue-500 text-white px-2 py-1 rounded-full';
    infoMesaCompacta.innerHTML = `🪑 Mesa ${numeroMesa}`;
    
    // Adiciona o status de aberto/fechado ao lado
    const statusFuncionamento = verificarHorarioFuncionamento();
    const statusTextoCompacto = statusFuncionamento.aberto ? '🟢 Aberto' : '🔴 Fechado';
    const statusAbertoFechado = document.createElement('div');
    statusAbertoFechado.id = 'statusCompacto';
    statusAbertoFechado.className = 'text-xs font-medium bg-white bg-opacity-20 px-2 py-1 rounded-full ml-2';
    statusAbertoFechado.textContent = statusTextoCompacto;

    if (divInfoCompacta) {
        divInfoCompacta.appendChild(infoMesaCompacta);
        divInfoCompacta.appendChild(statusAbertoFechado);
    }
}

// Função para controlar header compacto no mobile
function iniciarControleMobileHeader() {
    let ultimaPosicao = 0;
    let headerCompactoVisivel = false;
    const headerPrincipal = document.getElementById('headerPrincipal');
    const headerCompacto = document.getElementById('headerCompacto');
    const categoriasNavContainer = document.getElementById('categoriasNavContainer');

    function atualizarHeaderMobile() {
        const posicaoAtual = window.pageYOffset || document.documentElement.scrollTop;
        const alturaHeader = headerPrincipal.offsetHeight;

        // Verificar se é mobile (largura menor que 768px)
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            // Mostrar header compacto quando rolar para baixo e passar a altura do header principal
            if (posicaoAtual > alturaHeader && posicaoAtual > ultimaPosicao && !headerCompactoVisivel) {
                headerCompacto.classList.add('visivel');
                if (categoriasNavContainer) {
                    categoriasNavContainer.style.top = `${headerCompacto.offsetHeight}px`;
                }
                headerCompactoVisivel = true;
            } else if (posicaoAtual < ultimaPosicao && headerCompactoVisivel) {
                // Esconder ao rolar para cima
                headerCompacto.classList.remove('visivel');
                if (categoriasNavContainer) {
                    categoriasNavContainer.style.top = `0px`;
                }
                headerCompactoVisivel = false;
            }
        } else {
            // Esconder no desktop
            headerCompacto.classList.remove('visivel');
            if (categoriasNavContainer) {
                categoriasNavContainer.style.top = `0px`;
            }
            headerCompactoVisivel = false;
        }

        ultimaPosicao = posicaoAtual;
    }

    window.addEventListener('scroll', atualizarHeaderMobile);
    window.addEventListener('resize', atualizarHeaderMobile);

    // Ajustar a posição inicial ao carregar (para evitar bugs de layout)
    setTimeout(atualizarHeaderMobile, 1000);
}
window.iniciarControleMobileHeader = iniciarControleMobileHeader;


// Inicializar aplicação
obterNumeroMesa();
carregarDados();

// Mostrar info da mesa após carregar
setTimeout(() => {
    mostrarInfoMesa();
}, 500);

// Iniciar verificação de rolagem (mobile header)
iniciarControleMobileHeader();
