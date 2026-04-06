const API_URL = "https://script.google.com/macros/s/AKfycbzfD2CDuyviBdRHZNwkkX1kq8NTvIHbf7g-TqpQzqNevGb_e4XJALC1G1WTjm6UWnD4Kw/exec"; // <-- NÃO ESQUEÇA DE COLAR A URL DE NOVO
let estadoCompras = [];
let estadoChecklist = [];
let filtroCategoria = 'Todas';
let filtroStatus = 'Todos';

document.addEventListener('DOMContentLoaded', () => {
    configurarEventosUI();
    carregarItens();
});

// NAVEGAÇÃO DE ABAS SPA
window.mudarAba = function(aba) {
    const vCompras = document.getElementById('view-compras');
    const vCheck = document.getElementById('view-checklist');
    const hCompras = document.getElementById('header-compras');
    const bCompras = document.getElementById('aba-compras');
    const bCheck = document.getElementById('aba-checklist');

    if (aba === 'compras') {
        vCompras.classList.remove('hidden'); hCompras.classList.remove('hidden');
        vCheck.classList.add('hidden');
        bCompras.className = "flex-1 md:w-64 py-3 rounded-xl font-bold text-sm transition-all bg-casanova-primary text-white shadow-md";
        bCheck.className = "flex-1 md:w-64 py-3 rounded-xl font-bold text-sm transition-all text-gray-500 hover:bg-gray-50";
    } else {
        vCompras.classList.add('hidden'); hCompras.classList.add('hidden');
        vCheck.classList.remove('hidden');
        bCheck.className = "flex-1 md:w-64 py-3 rounded-xl font-bold text-sm transition-all bg-gray-800 text-white shadow-md";
        bCompras.className = "flex-1 md:w-64 py-3 rounded-xl font-bold text-sm transition-all text-gray-500 hover:bg-gray-50";
    }
}

async function carregarItens() {
    const gridC = document.getElementById('items-grid');
    gridC.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400"><i class="fas fa-circle-notch fa-spin text-3xl mb-4"></i></div>`;
    try {
        const urlComCacheBuster = API_URL + (API_URL.includes('?') ? '&' : '?') + 't=' + Date.now();
        const response = await fetch(urlComCacheBuster, { method: 'GET', mode: 'cors', redirect: 'follow' });
        const dados = await response.json();
        
        estadoCompras = dados.compras || [];
        estadoChecklist = dados.checklist || [];
        
        renderizarItens();
        atualizarDashboard();
        renderizarChecklist();
    } catch (e) {
        gridC.innerHTML = `<div class="col-span-full text-center text-red-400 py-10 font-bold">Erro de conexão.</div>`;
    }
}

// === RENDERIZAÇÃO COMPRAS (Idêntico ao que funcionava) ===
function renderizarItens() {
    const grid = document.getElementById('items-grid');
    const busca = document.getElementById('search-bar').value.toLowerCase().trim();
    grid.innerHTML = '';

    const filtrados = estadoCompras.filter(item => {
        const matchBusca = (item.Item || '').toLowerCase().includes(busca) || (item.Tags || '').toLowerCase().includes(busca);
        const matchCategoria = filtroCategoria === 'Todas' || item.Categoria === filtroCategoria;
        
        const pagas = parseInt(item.ParcelasPagas) || 0;
        const total = parseInt(item.QtdParcelas) || 1;
        const isConcluido = item.Status === 'Ganhamos' || (item.Status === 'Comprado' && item.FormaPagamento === 'À vista') || (item.Status === 'Comprado' && item.FormaPagamento === 'Parcelado' && pagas >= total);
        const isPagando = item.Status === 'Comprado' && item.FormaPagamento === 'Parcelado' && pagas < total;
        
        let matchStatus = true;
        if (filtroStatus === 'Pendentes') matchStatus = item.Status === 'Pendente';
        if (filtroStatus === 'Pagando') matchStatus = isPagando;
        if (filtroStatus === 'Concluídos') matchStatus = isConcluido;

        return matchBusca && matchCategoria && matchStatus;
    });

    if (filtrados.length === 0) return grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">Nenhum item.</div>`;

    filtrados.forEach(item => {
        const pagas = parseInt(item.ParcelasPagas) || 0;
        const total = parseInt(item.QtdParcelas) || 1;
        const perc = (pagas / total) * 100;
        const imagem = item.ImagemURL || 'https://via.placeholder.com/400x300?text=Casa+Nova';
        
        let tagsHtml = item.Tags ? `<div class="flex flex-wrap gap-1 mt-3 pt-2 border-t border-gray-100">` + item.Tags.split(',').map(t => `<span onclick="filtrarPorTag('${t.trim()}')" class="cursor-pointer bg-gray-100 hover:bg-casanova-primary hover:text-white text-gray-500 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase transition-colors">#${t.trim()}</span>`).join('') + `</div>` : '';

        let statusTag = `<span class="bg-yellow-100 text-yellow-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pendente</span>`;
        if (item.Status === 'Ganhamos') statusTag = `<span class="bg-purple-100 text-purple-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Presente</span>`;
        else if (item.Status === 'Comprado') statusTag = (item.FormaPagamento === 'À vista' || pagas >= total) ? `<span class="bg-green-100 text-green-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pago</span>` : `<span class="bg-blue-100 text-blue-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pagando</span>`;

        const card = `
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col hover:shadow-xl transition-all group">
                <div class="h-44 relative overflow-hidden rounded-t-3xl"><img src="${imagem}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"><div class="absolute top-3 left-3">${statusTag}</div><button onclick="abrirEdicao(${item.ID})" class="absolute top-3 right-3 w-8 h-8 bg-white bg-opacity-90 rounded-full text-gray-400 hover:text-casanova-primary flex items-center justify-center"><i class="fas fa-pen text-xs"></i></button></div>
                <div class="p-5 flex-1 flex flex-col">
                    <h3 class="font-bold text-gray-800 mb-1 leading-tight">${item.Item}</h3><p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">${item.Categoria} • ${item.Prioridade.charAt(0)}</p>
                    ${item.Status === 'Comprado' && item.FormaPagamento === 'Parcelado' && pagas < total ? `<div class="mt-auto"><div class="flex justify-between items-end mb-1"><span class="text-[10px] font-bold text-gray-400">Parcela ${pagas}/${total}</span><button onclick="pagarParcelaRapido(${item.ID}, this)" class="text-xs font-bold text-blue-500 px-2 py-1 bg-blue-50 rounded-lg">+ PAGAR 1</button></div><div class="w-full bg-gray-100 h-1.5 rounded-full"><div class="bg-blue-400 h-full transition-all" style="width: ${perc}%"></div></div></div>` : ''}
                    <details class="mt-4 pt-3 border-t border-gray-50 group/det"><summary class="list-none text-[10px] font-bold text-casanova-secondary cursor-pointer uppercase flex items-center justify-between">Detalhes <i class="fas fa-chevron-down text-[8px] group-open/det:rotate-180"></i></summary><div class="pt-3 text-xs text-gray-500"><p class="mb-3">${item.Observacoes || '-'}</p><div id="links-${item.ID}" class="flex flex-wrap gap-1"></div>${tagsHtml}</div></details>
                </div>
            </div>`;
        grid.insertAdjacentHTML('beforeend', card);
        renderizarLinksNoCard(item);
    });
}

function renderizarLinksNoCard(item) {
    const container = document.getElementById(`links-${item.ID}`);
    try { JSON.parse(item.Links || '[]').forEach(l => container.insertAdjacentHTML('beforeend', `<a href="${l.url}" target="_blank" class="bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-casanova-secondary hover:text-white uppercase"><i class="fas fa-shopping-cart mr-1"></i>${l.loja}</a>`)); } catch(e) {}
}

window.filtrarPorTag = function(tag) { document.getElementById('search-bar').value = tag; renderizarItens(); }

// === RENDERIZAÇÃO CHECKLIST (NOVO) ===
function renderizarChecklist() {
    const grid = document.getElementById('checklist-grid');
    grid.innerHTML = '';
    
    estadoChecklist.forEach(item => {
        const isInList = item.StatusDaIdeia === 'Na Lista de Compras';
        const isDiscarded = item.StatusDaIdeia === 'Descartado';
        let opacidade = isInList || isDiscarded ? 'opacity-50 grayscale' : '';
        let badge = isInList ? `<span class="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-1 rounded"><i class="fas fa-check mr-1"></i>Enviado</span>` 
                  : isDiscarded ? `<span class="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-1 rounded"><i class="fas fa-ban mr-1"></i>Descartado</span>` : '';

        const acoes = (!isInList && !isDiscarded) ? `
            <div class="flex gap-2">
                <button onclick="mudarStatusChecklist(${item.ID}, 'Descartado')" class="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 text-xs font-bold transition-colors"><i class="fas fa-times"></i></button>
                <button onclick="iniciarTransferencia(${item.ID})" class="flex-1 py-1.5 rounded-lg bg-casanova-primary text-white text-xs font-bold shadow-sm hover:bg-pink-400 transition-colors">PESQUISAR COM PRÉ-LISTA</button>
            </div>
        ` : '';

        const card = `
            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 ${opacidade}">
                <div><div class="flex justify-between items-start"><h3 class="font-bold text-gray-800 text-sm">${item.Item}</h3>${badge}</div><p class="text-[10px] text-gray-400 uppercase font-bold mt-1">${item.Categoria}</p></div>
                <div class="mt-auto pt-3 border-t border-gray-50">${acoes}</div>
            </div>`;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

// === LÓGICA DE TRANSFERÊNCIA E CHECKLIST ===
window.adicionarAoChecklist = async function() {
    const nome = document.getElementById('novo-item-check-nome').value;
    const cat = document.getElementById('novo-item-check-cat').value;
    if(!nome) return;
    document.getElementById('novo-item-check-nome').value = '';
    
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'add', sheetName: 'ChecklistBase', ID: Date.now(), Item: nome, Categoria: cat, StatusDaIdeia: 'Aguardando' }) });
    carregarItens();
}

window.mudarStatusChecklist = async function(id, novoStatus) {
    const item = estadoChecklist.find(i => i.ID == id);
    item.StatusDaIdeia = novoStatus;
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'edit', sheetName: 'ChecklistBase', ID: item.ID, Item: item.Item, Categoria: item.Categoria, StatusDaIdeia: novoStatus }) });
    carregarItens();
}

window.iniciarTransferencia = function(id) {
    const item = estadoChecklist.find(i => i.ID == id);
    document.getElementById('btn-open-modal').click(); // Limpa e abre o modal
    document.getElementById('input-nome').value = item.Item;
    document.getElementById('input-categoria').value = item.Categoria;
    document.getElementById('checklist-origin-id').value = item.ID; // Grava a origem para mudar o status depois
}

// === AÇÕES COMPRAS API ===
async function pagarParcelaRapido(id, btn) {
    const txtO = btn.innerHTML; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>'; btn.disabled = true;
    try { if((await (await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'increment_installment', sheetName: 'Página1', ID: id }) })).json()).status === 'success') carregarItens(); } 
    catch(e) { btn.innerHTML = txtO; btn.disabled = false; }
}

async function salvarItem(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> SALVANDO...'; btn.disabled = true;
    
    const links = [];
    document.querySelectorAll('.link-row').forEach(row => { const l = row.querySelector('.link-loja').value; const u = row.querySelector('.link-url').value; if(l && u) links.push({ loja: l, url: u }); });

    const payload = {
        action: document.getElementById('input-id').value ? 'edit' : 'add',
        sheetName: 'Página1',
        ID: document.getElementById('input-id').value || Date.now(),
        Item: document.getElementById('input-nome').value, Categoria: document.getElementById('input-categoria').value, Status: document.getElementById('input-status').value, Prioridade: document.getElementById('input-prioridade').value, ValorEstimado: document.getElementById('input-valor-estimado').value, ValorFinal: document.getElementById('input-valor-final').value, FormaPagamento: document.getElementById('input-forma-pag').value, QtdParcelas: document.getElementById('input-qtd-parcelas').value, ParcelasPagas: document.getElementById('input-parcelas-pagas').value, DiaVencimento: document.getElementById('input-vencimento').value, QuemDeu: document.getElementById('input-quem-deu').value, ImagemURL: document.getElementById('input-imagem').value, Tags: document.getElementById('input-tags').value, Observacoes: document.getElementById('input-obs').value, Links: links
    };

    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        // Se esse item veio do Checklist, avisa lá que já foi comprado/enviado
        const idOrigem = document.getElementById('checklist-origin-id').value;
        if (idOrigem) await mudarStatusChecklist(idOrigem, 'Na Lista de Compras');
        
        fecharModal(); carregarItens();
    } catch(e) { alert("Erro de conexão ao salvar."); } 
    finally { btn.innerHTML = 'SALVAR ITEM'; btn.disabled = false; }
}

function atualizarDashboard() {
    let est = 0, pago = 0, div = 0, prox = 0, concl = 0;
    estadoCompras.forEach(i => {
        const vEst = parseFloat(i.ValorEstimado) || 0; const vFin = parseFloat(i.ValorFinal) || 0; const qPar = parseInt(i.QtdParcelas) || 1; const pPag = parseInt(i.ParcelasPagas) || 0; const vPar = vFin / qPar;
        if (i.Status === 'Pendente') est += vEst;
        if (i.Status === 'Ganhamos') concl++;
        if (i.Status === 'Comprado') {
            if (i.FormaPagamento === 'À vista') { pago += vFin; concl++; } 
            else { pago += (vPar * pPag); div += (vPar * (qPar - pPag)); if (pPag < qPar) prox += vPar; else concl++; }
        }
    });
    const pGeral = estadoCompras.length ? Math.round((concl / estadoCompras.length) * 100) : 0;
    document.getElementById('total-estimado').innerText = `R$ ${est.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`; document.getElementById('total-pago').innerText = `R$ ${pago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`; document.getElementById('total-divida').innerText = `R$ ${div.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`; document.getElementById('total-proximo-mes').innerText = `R$ ${prox.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`; document.getElementById('progress-text').innerText = `${pGeral}% CONCLUÍDO`; document.getElementById('progress-bar-geral').style.width = `${pGeral}%`;
}

function uiToggleCampos() { const s = document.getElementById('input-status').value; const f = document.getElementById('input-forma-pag').value; document.getElementById('finance-section').classList.toggle('hidden', s !== 'Comprado'); document.getElementById('parcelas-row').classList.toggle('hidden', f !== 'Parcelado'); document.getElementById('gift-section').classList.toggle('hidden', s !== 'Ganhamos'); }

window.abrirEdicao = function(id) {
    const item = estadoCompras.find(i => i.ID == id); if(!item) return;
    const btnSalvar = document.querySelector('#item-form button[type="submit"]'); btnSalvar.innerHTML = 'SALVAR ITEM'; btnSalvar.disabled = false;
    document.getElementById('item-form').reset();
    document.getElementById('input-id').value = item.ID; document.getElementById('checklist-origin-id').value = ''; document.getElementById('input-nome').value = item.Item; document.getElementById('input-categoria').value = item.Categoria; document.getElementById('input-status').value = item.Status; document.getElementById('input-prioridade').value = item.Prioridade; document.getElementById('input-valor-estimado').value = item.ValorEstimado; document.getElementById('input-valor-final').value = item.ValorFinal; document.getElementById('input-forma-pag').value = item.FormaPagamento || 'À vista'; document.getElementById('input-qtd-parcelas').value = item.QtdParcelas; document.getElementById('input-parcelas-pagas').value = item.ParcelasPagas; document.getElementById('input-vencimento').value = item.DiaVencimento; document.getElementById('input-quem-deu').value = item.QuemDeu; document.getElementById('input-imagem').value = item.ImagemURL; document.getElementById('input-tags').value = item.Tags; document.getElementById('input-obs').value = item.Observacoes;
    document.getElementById('links-container').innerHTML = ''; try { JSON.parse(item.Links).forEach(l => uiCriarLinhaLink(l.loja, l.url)); } catch(e){ uiCriarLinhaLink('',''); }
    document.getElementById('btn-delete-trigger').classList.remove('hidden');
    document.getElementById('btn-delete-trigger').onclick = () => { document.getElementById('confirm-modal').classList.remove('hidden'); document.getElementById('btn-confirm-delete').onclick = async () => { const btnConfirm = document.getElementById('btn-confirm-delete'); btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', sheetName: 'Página1', ID: item.ID }) }); btnConfirm.innerHTML = 'SIM, EXCLUIR'; fecharConfirm(); fecharModal(); carregarItens(); }; };
    document.getElementById('modal-title').innerText = "Editar Item"; uiToggleCampos(); document.getElementById('item-modal').classList.remove('hidden');
}

function uiCriarLinhaLink(l, u) { document.getElementById('links-container').insertAdjacentHTML('beforeend', `<div class="flex gap-2 link-row"><input type="text" value="${l}" placeholder="Loja" class="w-1/3 p-2 bg-gray-50 rounded-lg outline-none text-xs link-loja"><input type="url" value="${u}" placeholder="URL" class="w-2/3 p-2 bg-gray-50 rounded-lg outline-none text-xs link-url"><button type="button" onclick="this.parentElement.remove()" class="text-red-300 px-1"><i class="fas fa-times"></i></button></div>`); }

function configurarEventosUI() {
    document.getElementById('item-form').onsubmit = salvarItem;
    document.getElementById('search-bar').oninput = renderizarItens;
    document.getElementById('btn-open-modal').onclick = () => { const btnSalvar = document.querySelector('#item-form button[type="submit"]'); btnSalvar.innerHTML = 'SALVAR ITEM'; btnSalvar.disabled = false; document.getElementById('item-form').reset(); document.getElementById('input-id').value = ''; document.getElementById('checklist-origin-id').value = ''; document.getElementById('links-container').innerHTML = ''; uiCriarLinhaLink('', ''); document.getElementById('btn-delete-trigger').classList.add('hidden'); uiToggleCampos(); document.getElementById('modal-title').innerText = "Adicionar Novo Item"; document.getElementById('item-modal').classList.remove('hidden'); };
    document.getElementById('category-filters').onclick = (e) => { if(e.target.tagName === 'BUTTON') { document.querySelectorAll('.cat-btn').forEach(b => b.className = "cat-btn px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-gray-100 text-gray-500"); e.target.className = "cat-btn active px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-casanova-primary text-white"; filtroCategoria = e.target.innerText.trim(); renderizarItens(); } };
    document.getElementById('status-filters').onclick = (e) => { if(e.target.tagName === 'BUTTON') { document.querySelectorAll('.status-btn').forEach(b => b.className = "status-btn px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-gray-100 text-gray-500"); e.target.className = "status-btn active px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-gray-800 text-white"; filtroStatus = e.target.innerText.trim(); renderizarItens(); } };
}

function fecharModal() { document.getElementById('item-modal').classList.add('hidden'); }
function fecharConfirm() { document.getElementById('confirm-modal').classList.add('hidden'); }
