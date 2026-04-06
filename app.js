const API_URL = "https://script.google.com/macros/s/AKfycbzfhsiTHUDWLyC2p-1UaxPWqjKvwtDwG2vWbYDSuB-2frZ7gQManei6ENER1pUT1n6bYA/exec"; // <-- NÃO ESQUEÇA DE COLAR SUA URL NOVA
let estadoItens = [];
let filtroAtivo = 'Todos';

document.addEventListener('DOMContentLoaded', () => {
    configurarEventosUI();
    carregarItens();
});

async function carregarItens() {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400"><i class="fas fa-circle-notch fa-spin text-3xl mb-4"></i><p class="font-bold tracking-widest uppercase text-xs">Sincronizando com a planilha...</p></div>`;

    try {
        const response = await fetch(API_URL);
        estadoItens = await response.json();
        renderizarItens();
        atualizarDashboard();
    } catch (e) {
        grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-10 font-bold">Erro de conexão. Verifique o link da API.</div>`;
    }
}

// === LÓGICA DE FILTROS E RENDERIZAÇÃO ===
function renderizarItens() {
    const grid = document.getElementById('items-grid');
    const busca = document.getElementById('search-bar').value.toLowerCase();
    grid.innerHTML = '';

    const filtrados = estadoItens.filter(item => {
        const matchBusca = (item.Item || '').toLowerCase().includes(busca) || (item.Tags || '').toLowerCase().includes(busca);
        
        // Lógica de Estados Calculados
        const isConcluido = item.Status === 'Ganhamos' || (item.Status === 'Comprado' && parseInt(item.ParcelasPagas) >= parseInt(item.QtdParcelas));
        const isPagando = item.Status === 'Comprado' && parseInt(item.ParcelasPagas) < parseInt(item.QtdParcelas);
        
        let matchFiltro = true;
        if (filtroAtivo === 'Pendentes') matchFiltro = item.Status === 'Pendente';
        if (filtroAtivo === 'Pagando') matchFiltro = isPagando;
        if (filtroAtivo === 'Concluídos') matchFiltro = isConcluido;

        return matchBusca && matchFiltro;
    });

    filtrados.forEach(item => {
        const pagas = parseInt(item.ParcelasPagas) || 0;
        const total = parseInt(item.QtdParcelas) || 1;
        const perc = (pagas / total) * 100;
        const imagem = item.ImagemURL || 'https://via.placeholder.com/400x300?text=Casa+Nova';
        
        // Badge e Cor de Status
        let statusTag = `<span class="bg-yellow-100 text-yellow-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pendente</span>`;
        if (item.Status === 'Ganhamos') statusTag = `<span class="bg-purple-100 text-purple-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Presente</span>`;
        else if (item.Status === 'Comprado') {
            statusTag = pagas >= total 
                ? `<span class="bg-green-100 text-green-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pago</span>`
                : `<span class="bg-blue-100 text-blue-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pagando</span>`;
        }

        const card = `
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 group">
                <div class="h-44 relative overflow-hidden">
                    <img src="${imagem}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                    <div class="absolute top-3 left-3">${statusTag}</div>
                    <button onclick="abrirEdicao(${item.ID})" class="absolute top-3 right-3 w-8 h-8 bg-white bg-opacity-90 rounded-full text-gray-400 hover:text-casanova-primary shadow-sm flex items-center justify-center transition-all"><i class="fas fa-pen text-xs"></i></button>
                </div>
                <div class="p-5 flex-1 flex flex-col">
                    <h3 class="font-bold text-gray-800 mb-1 leading-tight">${item.Item}</h3>
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">${item.Categoria} • PRIORIDADE ${item.Prioridade.charAt(0)}</p>
                    
                    ${item.Status === 'Comprado' && pagas < total ? `
                        <div class="mt-auto">
                            <div class="flex justify-between items-end mb-1">
                                <span class="text-[10px] font-bold text-gray-400 italic">Parcela ${pagas}/${total}</span>
                                <button onclick="pagarParcelaRapido(${item.ID})" class="text-xs font-bold text-blue-500 hover:scale-110 transition-transform">+ PAGAR 1</button>
                            </div>
                            <div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div class="bg-blue-400 h-full transition-all duration-500" style="width: ${perc}%"></div></div>
                        </div>
                    ` : ''}

                    <details class="mt-4 pt-3 border-t border-gray-50 group/det">
                        <summary class="list-none text-[10px] font-bold text-casanova-secondary cursor-pointer uppercase tracking-widest flex items-center justify-between">
                            Detalhes <i class="fas fa-chevron-down text-[8px] group-open/det:rotate-180 transition-transform"></i>
                        </summary>
                        <div class="pt-3 text-xs text-gray-500 space-y-2">
                            <p>${item.Observacoes || 'Sem notas.'}</p>
                            <div id="links-${item.ID}" class="flex flex-wrap gap-1"></div>
                        </div>
                    </details>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
        renderizarLinksNoCard(item);
    });
}

function renderizarLinksNoCard(item) {
    const container = document.getElementById(`links-${item.ID}`);
    try {
        const links = JSON.parse(item.Links || '[]');
        links.forEach(l => {
            container.insertAdjacentHTML('beforeend', `<a href="${l.url}" target="_blank" class="bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-casanova-secondary hover:text-white transition-colors uppercase"><i class="fas fa-shopping-cart mr-1"></i>${l.loja}</a>`);
        });
    } catch(e) {}
}

// === AÇÕES DE API ===
async function pagarParcelaRapido(id) {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'increment_installment', ID: id }) });
    const json = await res.json();
    if(json.status === 'success') carregarItens();
}

async function salvarItem(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-sync fa-spin"></i>';
    
    const links = [];
    document.querySelectorAll('.link-row').forEach(row => {
        const l = row.querySelector('.link-loja').value;
        const u = row.querySelector('.link-url').value;
        if(l && u) links.push({ loja: l, url: u });
    });

    const payload = {
        action: document.getElementById('input-id').value ? 'edit' : 'add',
        ID: document.getElementById('input-id').value || Date.now(),
        Item: document.getElementById('input-nome').value,
        Categoria: document.getElementById('input-categoria').value,
        Status: document.getElementById('input-status').value,
        Prioridade: document.getElementById('input-prioridade').value,
        ValorEstimado: document.getElementById('input-valor-estimado').value,
        ValorFinal: document.getElementById('input-valor-final').value,
        FormaPagamento: document.getElementById('input-forma-pag').value,
        QtdParcelas: document.getElementById('input-qtd-parcelas').value,
        ParcelasPagas: document.getElementById('input-parcelas-pagas').value,
        DiaVencimento: document.getElementById('input-vencimento').value,
        QuemDeu: document.getElementById('input-quem-deu').value,
        ImagemURL: document.getElementById('input-imagem').value,
        Tags: document.getElementById('input-tags').value,
        Observacoes: document.getElementById('input-obs').value,
        Links: links
    };

    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    if((await res.json()).status === 'success') { fecharModal(); carregarItens(); }
}

// === UI E DASHBOARD ===
function atualizarDashboard() {
    let est = 0, pago = 0, div = 0, prox = 0, concl = 0;
    estadoItens.forEach(i => {
        const vEst = parseFloat(i.ValorEstimado) || 0;
        const vFin = parseFloat(i.ValorFinal) || 0;
        const qPar = parseInt(i.QtdParcelas) || 1;
        const pPag = parseInt(i.ParcelasPagas) || 0;
        const vPar = vFin / qPar;

        if (i.Status === 'Pendente') est += vEst;
        if (i.Status === 'Ganhamos') concl++;
        if (i.Status === 'Comprado') {
            pago += (vPar * pPag);
            div += (vPar * (qPar - pPag));
            if (pPag < qPar) {
                prox += vPar;
            } else {
                concl++;
            }
        }
    });

    const pGeral = estadoItens.length ? Math.round((concl / estadoItens.length) * 100) : 0;
    document.getElementById('total-estimado').innerText = `R$ ${est.toFixed(2)}`;
    document.getElementById('total-pago').innerText = `R$ ${pago.toFixed(2)}`;
    document.getElementById('total-divida').innerText = `R$ ${div.toFixed(2)}`;
    document.getElementById('total-proximo-mes').innerText = `R$ ${prox.toFixed(2)}`;
    document.getElementById('progress-text').innerText = `${pGeral}% CONCLUÍDO`;
    document.getElementById('progress-bar-geral').style.width = `${pGeral}%`;
}

function uiToggleCampos() {
    const s = document.getElementById('input-status').value;
    const f = document.getElementById('input-forma-pag').value;
    document.getElementById('finance-section').classList.toggle('hidden', s !== 'Comprado');
    document.getElementById('parcelas-row').classList.toggle('hidden', f !== 'Parcelado');
    document.getElementById('gift-section').classList.toggle('hidden', s !== 'Ganhamos');
}

function abrirEdicao(id) {
    const item = estadoItens.find(i => i.ID == id);
    if(!item) return;
    document.getElementById('item-form').reset();
    document.getElementById('input-id').value = item.ID;
    document.getElementById('input-nome').value = item.Item;
    document.getElementById('input-categoria').value = item.Categoria;
    document.getElementById('input-status').value = item.Status;
    document.getElementById('input-prioridade').value = item.Prioridade;
    document.getElementById('input-valor-estimado').value = item.ValorEstimado;
    document.getElementById('input-valor-final').value = item.ValorFinal;
    document.getElementById('input-forma-pag').value = item.FormaPagamento || 'À vista';
    document.getElementById('input-qtd-parcelas').value = item.QtdParcelas;
    document.getElementById('input-parcelas-pagas').value = item.ParcelasPagas;
    document.getElementById('input-vencimento').value = item.DiaVencimento;
    document.getElementById('input-quem-deu').value = item.QuemDeu;
    document.getElementById('input-imagem').value = item.ImagemURL;
    document.getElementById('input-tags').value = item.Tags;
    document.getElementById('input-obs').value = item.Observacoes;
    
    document.getElementById('links-container').innerHTML = '';
    try { JSON.parse(item.Links).forEach(l => uiCriarLinhaLink(l.loja, l.url)); } catch(e){ uiCriarLinhaLink('',''); }

    document.getElementById('btn-delete-trigger').classList.remove('hidden');
    document.getElementById('btn-delete-trigger').onclick = () => {
        document.getElementById('confirm-modal').classList.remove('hidden');
        document.getElementById('btn-confirm-delete').onclick = async () => {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', ID: item.ID }) });
            if((await res.json()).status === 'success') { fecharConfirm(); fecharModal(); carregarItens(); }
        };
    };

    document.getElementById('modal-title').innerText = "Editar Item";
    uiToggleCampos();
    document.getElementById('item-modal').classList.remove('hidden');
}

function uiCriarLinhaLink(l, u) {
    const html = `<div class="flex gap-2 link-row"><input type="text" value="${l}" placeholder="Loja" class="w-1/3 p-2 bg-gray-50 rounded-lg outline-none text-xs"><input type="url" value="${u}" placeholder="URL" class="w-2/3 p-2 bg-gray-50 rounded-lg outline-none text-xs"><button type="button" onclick="this.parentElement.remove()" class="text-red-300 px-1"><i class="fas fa-times"></i></button></div>`;
    document.getElementById('links-container').insertAdjacentHTML('beforeend', html);
}

function configurarEventosUI() {
    document.getElementById('item-form').onsubmit = salvarItem;
    document.getElementById('search-bar').oninput = renderizarItens;
    document.getElementById('btn-open-modal').onclick = () => {
        document.getElementById('item-form').reset();
        document.getElementById('input-id').value = '';
        document.getElementById('links-container').innerHTML = '';
        uiCriarLinhaLink('', '');
        document.getElementById('btn-delete-trigger').classList.add('hidden');
        uiToggleCampos();
        document.getElementById('item-modal').classList.remove('hidden');
    };
    document.getElementById('status-filters').onclick = (e) => {
        if(e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.filter-btn').forEach(b => b.className = "filter-btn px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-gray-100 text-gray-500");
            e.target.className = "filter-btn active px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-casanova-primary text-white";
            filtroAtivo = e.target.innerText;
            renderizarItens();
        }
    };
}

function fecharModal() { document.getElementById('item-modal').classList.add('hidden'); }
function fecharConfirm() { document.getElementById('confirm-modal').classList.add('hidden'); }
