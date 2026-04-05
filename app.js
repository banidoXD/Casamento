// ==========================================
// CONFIGURAÇÕES
// ==========================================
// Cole aqui a URL gerada no "Implantar > Nova Implantação" do Google Apps Script
const API_URL = "SUA_URL_DO_WEB_APP_AQUI";

// Estado global para guardar os itens e não precisar fazer requisição toda hora
let estadoItens = [];

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    configurarEventosUI();
    carregarItens();
});

// ==========================================
// COMUNICAÇÃO COM A API (SHEETS)
// ==========================================
async function carregarItens() {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-spinner fa-spin mr-2 text-2xl"></i> Carregando seu enxoval...</div>`;

    try {
        const response = await fetch(API_URL);
        const dados = await response.json();
        
        estadoItens = dados;
        atualizarDashboard();
        renderizarItens('Todas'); // Renderiza tudo por padrão
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">Erro ao carregar os itens. Verifique a URL do Web App.</div>`;
    }
}

async function salvarItem(evento) {
    evento.preventDefault(); // Evita recarregar a página
    
    const botaoSalvar = evento.target.querySelector('button[type="submit"]');
    const textoOriginalBotao = botaoSalvar.innerHTML;
    botaoSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    botaoSalvar.disabled = true;

    // 1. Capturar os links dinâmicos
    const linksArray = [];
    document.querySelectorAll('.link-row').forEach(row => {
        const loja = row.querySelector('.link-loja').value.trim();
        const url = row.querySelector('.link-url').value.trim();
        if (loja && url) {
            linksArray.push({ loja, url });
        }
    });

    // 2. Montar o Objeto (As chaves precisam bater com as colunas do seu Sheets)
    const novoItem = {
        ID: Date.now(), // ID único simples
        Item: document.getElementById('input-nome').value.trim(),
        Categoria: document.getElementById('input-categoria').value,
        Prioridade: document.getElementById('input-prioridade').value,
        Status: document.getElementById('input-status').value,
        ValorEstimado: document.getElementById('input-valor-estimado').value || 0,
        ValorPago: document.getElementById('input-valor-pago').value || 0,
        Tags: document.getElementById('input-tags').value.trim(),
        ImagemURL: document.getElementById('input-imagem').value.trim(),
        Links: linksArray, // O array de objetos que estruturamos
        Observacoes: document.getElementById('input-obs').value.trim()
    };

    // 3. Enviar para o Google Sheets (POST)
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" }, // 'text/plain' evita erro de preflight CORS no Apps Script
            body: JSON.stringify(novoItem)
        });

        const resultado = await response.json();
        
        if (resultado.status === "success") {
            fecharModal();
            document.getElementById('item-form').reset();
            resetarLinks(); // Limpa as linhas extras de link criadas
            carregarItens(); // Recarrega a lista atualizada
        } else {
            alert("Erro ao salvar: " + resultado.message);
        }
    } catch (error) {
        console.error("Erro no POST:", error);
        alert("Erro na comunicação com o servidor.");
    } finally {
        botaoSalvar.innerHTML = textoOriginalBotao;
        botaoSalvar.disabled = false;
    }
}

// ==========================================
// RENDERIZAÇÃO E UI
// ==========================================
function renderizarItens(categoriaFiltro) {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = '';

    const itensFiltrados = categoriaFiltro === 'Todas' 
        ? estadoItens 
        : estadoItens.filter(item => item.Categoria === categoriaFiltro);

    if (itensFiltrados.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-8">Nenhum item encontrado nesta categoria.</div>`;
        return;
    }

    itensFiltrados.forEach(item => {
        // Parse seguro dos Links (pois vêm como string JSON do Sheets)
        let linksHtml = '';
        try {
            const links = item.Links ? JSON.parse(item.Links) : [];
            links.forEach(l => {
                linksHtml += `<a href="${l.url}" target="_blank" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border inline-block mb-1 mr-1"><i class="fas fa-external-link-alt mr-1"></i>${l.loja}</a>`;
            });
        } catch (e) {
            linksHtml = `<span class="text-xs text-red-400">Erro ao ler links</span>`;
        }

        // Definindo cor do badge de Status
        let statusColor = 'bg-gray-100 text-gray-600';
        if (item.Status === 'Comprado') statusColor = 'bg-green-100 text-green-700';
        if (item.Status === 'Ganhamos') statusColor = 'bg-purple-100 text-purple-700';
        if (item.Status === 'Pendente') statusColor = 'bg-yellow-100 text-yellow-700';

        const imagemPadrao = 'https://via.placeholder.com/400x300?text=Sem+Imagem';

        const card = `
            <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 flex flex-col">
                <div class="h-48 overflow-hidden bg-gray-50 flex items-center justify-center relative">
                    <img src="${item.ImagemURL || imagemPadrao}" alt="${item.Item}" class="w-full h-full object-cover">
                    <span class="absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded shadow-sm ${statusColor}">${item.Status}</span>
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-gray-800 text-lg leading-tight">${item.Item}</h3>
                    </div>
                    <div class="text-xs text-gray-500 mb-3 space-x-1">
                        <span class="bg-casanova-primary bg-opacity-20 text-casanova-primary px-2 py-1 rounded">${item.Categoria}</span>
                        <span class="bg-gray-100 px-2 py-1 rounded">${item.Prioridade.split('-')[1] || item.Prioridade}</span>
                    </div>
                    <div class="mb-3 text-sm">
                        <p class="text-gray-500">Estimado: <span class="line-through">R$ ${parseFloat(item.ValorEstimado || 0).toFixed(2)}</span></p>
                        <p class="font-bold text-gray-800">Pago: R$ ${parseFloat(item.ValorPago || 0).toFixed(2)}</p>
                    </div>
                    <div class="mt-auto">
                        <p class="text-xs text-gray-400 mb-1 font-semibold">Links:</p>
                        <div class="flex flex-wrap">${linksHtml || '<span class="text-xs text-gray-300">Sem links salvos</span>'}</div>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

function atualizarDashboard() {
    let estimado = 0;
    let pago = 0;
    let itensCompradosOuGanhos = 0;

    estadoItens.forEach(item => {
        estimado += parseFloat(item.ValorEstimado) || 0;
        pago += parseFloat(item.ValorPago) || 0;
        if (item.Status === 'Comprado' || item.Status === 'Ganhamos') {
            itensCompradosOuGanhos++;
        }
    });

    document.getElementById('total-estimado').innerText = `R$ ${estimado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total-gasto').innerText = `R$ ${pago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total-itens').innerText = `${itensCompradosOuGanhos} / ${estadoItens.length}`;
}

// ==========================================
// CONTROLE DO MODAL E EVENTOS
// ==========================================
function configurarEventosUI() {
    // Abrir/Fechar Modal
    document.getElementById('btn-open-modal').addEventListener('click', () => {
        document.getElementById('item-modal').classList.remove('hidden');
    });
    
    document.getElementById('btn-close-modal').addEventListener('click', fecharModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', fecharModal);

    // Fechar modal clicando fora dele
    document.getElementById('item-modal').addEventListener('click', (e) => {
        if (e.target.id === 'item-modal') fecharModal();
    });

    // Adicionar novo campo de link dinamicamente
    document.getElementById('btn-add-link-field').addEventListener('click', () => {
        const container = document.getElementById('links-container');
        const htmlLinha = `
            <div class="flex gap-2 link-row mt-2">
                <input type="text" placeholder="Loja" class="w-1/3 p-2 border border-gray-300 rounded text-sm outline-none link-loja">
                <input type="url" placeholder="URL do produto" class="w-2/3 p-2 border border-gray-300 rounded text-sm outline-none link-url">
                <button type="button" class="text-red-500 hover:text-red-700 px-2 btn-remove-link"><i class="fas fa-trash"></i></button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', htmlLinha);
        
        // Adiciona evento de deletar na linha recém-criada
        const btnRemover = container.lastElementChild.querySelector('.btn-remove-link');
        btnRemover.addEventListener('click', (e) => e.target.closest('.link-row').remove());
    });

    // Submit do Form
    document.getElementById('item-form').addEventListener('submit', salvarItem);

    // Filtros de Categoria
    const containerFiltros = document.getElementById('category-filters');
    containerFiltros.addEventListener('click', (e) => {
        if(e.target.tagName === 'BUTTON') {
            // Atualiza visual dos botões de filtro
            containerFiltros.querySelectorAll('button').forEach(btn => {
                btn.className = "px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-semibold whitespace-nowrap text-gray-700";
            });
            e.target.className = "px-4 py-2 bg-casanova-primary text-white rounded-full text-sm font-semibold whitespace-nowrap";
            
            // Renderiza categoria clicada
            renderizarItens(e.target.innerText);
        }
    });
}

function fecharModal() {
    document.getElementById('item-modal').classList.add('hidden');
}

function resetarLinks() {
    const container = document.getElementById('links-container');
    // Mantém só a primeira linha limpa, apaga as extras
    const htmlPadrao = `
        <div class="flex gap-2 link-row">
            <input type="text" placeholder="Loja (Ex: Amazon)" class="w-1/3 p-2 border border-gray-300 rounded text-sm outline-none link-loja">
            <input type="url" placeholder="URL do produto" class="w-2/3 p-2 border border-gray-300 rounded text-sm outline-none link-url">
        </div>
    `;
    container.innerHTML = htmlPadrao;
}
