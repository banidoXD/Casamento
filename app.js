const API_URL = "https://script.google.com/macros/s/AKfycbywqBxZtYs16ZsomBUCjwRCToHufEXeYokizzPSVJ6WczFD67FTDy0x7kOegfRjqTxFTw/exec"; // <-- NÃO ESQUEÇA DE COLAR A URL DE NOVO
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

// === RENDERIZAÇÃO COMPRAS (AGORA COM ORDENAÇÃO) ===
function renderizarItens() {
    const grid = document.getElementById('items-grid');
    const busca = document.getElementById('search-bar').value.toLowerCase().trim();
    const sortOrder = document.getElementById('sort-order').value; // Pega a ordem escolhida
    grid.innerHTML = '';

    let filtrados = estadoCompras.filter(item => {
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

    // LÓGICA DE ORDENAÇÃO ALFABÉTICA E PRIORIDADE
    filtrados.sort((a, b) => {
        if (sortOrder === 'az') return a.Item.localeCompare(b.Item);
        if (sortOrder === 'za') return b.Item.localeCompare(a.Item);
        if (sortOrder === 'prioridade') return a.Prioridade.localeCompare(b.Prioridade);
        return 0; // 'padrao' mantém a ordem do Sheets (mais antigos primeiro)
    });

    if (filtrados.length === 0) return grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">Nenhum item.</div>`;

    filtrados.forEach(item => {
        const pagas = parseInt(item.ParcelasPagas) || 0;
        const total = parseInt(item.QtdParcelas) || 1;
        const perc = (pagas / total) * 100;
        
        // NOVO PLACEHOLDER (Cor Rosa do Tema)
        const imagem = item.ImagemURL || 'https://placehold.co/400x300/D1A3B4/FFFFFF?text=Nossa + Casa';
        
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

// === RENDERIZAÇÃO CHECKLIST (ORDENADO E COM EDIÇÃO) ===
let editandoChecklistId = null;

function renderizarChecklist() {
    const grid = document.getElementById('checklist-grid');
    const busca = document.getElementById('search-check').value.toLowerCase().trim();
    const sortOrder = document.getElementById('sort-check').value;
    const filtroCat = document.getElementById('filter-cat-check').value;
    
    grid.innerHTML = '';
    
    // 1. Aplica a Busca e o Filtro de Categoria
    let filtrados = estadoChecklist.filter(item => {
        const matchBusca = (item.Item || '').toLowerCase().includes(busca);
        const matchCategoria = filtroCat === 'Todas' || item.Categoria === filtroCat;
        return matchBusca && matchCategoria;
    });

    // 2. Aplica a Ordenação Alfabética
    filtrados.sort((a, b) => {
        if (sortOrder === 'az') return a.Item.localeCompare(b.Item);
        if (sortOrder === 'za') return b.Item.localeCompare(a.Item);
        return 0; // 'padrao' não muda a ordem original do banco
    });

    // 3. Separa os itens em dois grupos (Ativos vs Já Decididos)
    const pendentes = filtrados.filter(i => i.StatusDaIdeia === 'Aguardando');
    const concluidos = filtrados.filter(i => i.StatusDaIdeia !== 'Aguardando');

    // Função interna para desenhar o card
    const gerarCard = (item) => {
        const isInList = item.StatusDaIdeia === 'Na Lista de Compras';
        const isDiscarded = item.StatusDaIdeia === 'Descartado';
        let opacidade = isInList || isDiscarded ? 'opacity-50 grayscale' : '';
        
        let badge = isInList ? `<span class="text-[9px] font-bold bg-green-100 text-green-600 px-2 py-1 rounded uppercase tracking-wider"><i class="fas fa-check mr-1"></i>Na Lista</span>` 
                  : isDiscarded ? `<span class="text-[9px] font-bold bg-gray-200 text-gray-500 px-2 py-1 rounded uppercase tracking-wider"><i class="fas fa-ban mr-1"></i>Descartado</span>` : '';

        const acoes = (!isInList && !isDiscarded) ? `
            <div class="flex gap-2">
                <button onclick="mudarStatusChecklist(${item.ID}, 'Descartado')" class="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 text-xs font-bold transition-colors shadow-sm"><i class="fas fa-times"></i></button>
                <button onclick="iniciarTransferencia(${item.ID})" class="flex-1 py-1.5 rounded-lg bg-casanova-primary text-white text-xs font-bold shadow-sm hover:bg-pink-400 transition-colors tracking-wide">ENVIAR PARA COMPRAS</button>
            </div>
        ` : `
            <div class="flex justify-center">
                <button onclick="mudarStatusChecklist(${item.ID}, 'Aguardando')" class="text-[10px] font-bold text-gray-400 hover:text-casanova-primary underline"><i class="fas fa-undo mr-1"></i>Desfazer</button>
            </div>
        `;

        const btnEditar = (!isInList && !isDiscarded) ? `<button onclick="editarChecklist(${item.ID})" class="text-gray-300 hover:text-casanova-primary transition-colors absolute top-4 right-4"><i class="fas fa-pen text-sm"></i></button>` : '';

        return `
            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[120px] relative transition-all ${opacidade}">
                ${btnEditar}
                <div class="pr-8">
                    <h3 class="font-bold text-gray-800 text-sm leading-tight mb-1">${item.Item}</h3>
                    <div class="flex items-center gap-2 mt-2">
                        <p class="text-[9px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-400 uppercase font-bold tracking-widest">${item.Categoria}</p>
                        ${badge}
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-gray-50">${acoes}</div>
            </div>`;
    };

    if (filtrados.length === 0) {
        return grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">Nenhum item encontrado no Checklist.</div>`;
    }

    // Renderiza os pendentes primeiro
    pendentes.forEach(item => grid.insertAdjacentHTML('beforeend', gerarCard(item)));

    // Se houver finalizados, insere a quebra de linha estilizada
    if (pendentes.length > 0 && concluidos.length > 0) {
        grid.insertAdjacentHTML('beforeend', `
            <div class="col-span-full border-t-2 border-dashed border-gray-300 my-6 relative">
                <span class="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-casanova-bg px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decididos & Descartados</span>
            </div>
        `);
    }

    // Renderiza os concluídos no final
    concluidos.forEach(item => grid.insertAdjacentHTML('beforeend', gerarCard(item)));
}

// === LÓGICA DE TRANSFERÊNCIA E EDIÇÃO CHECKLIST ===
window.editarChecklist = function(id) {
    const item = estadoChecklist.find(i => i.ID == id);
    document.getElementById('novo-item-check-nome').value = item.Item;
    document.getElementById('novo-item-check-cat').value = item.Categoria;
    editandoChecklistId = id;
    
    // Altera o visual do botão de cima
    const btn = document.getElementById('btn-add-checklist');
    btn.innerHTML = '<i class="fas fa-save mr-2"></i>SALVAR';
    btn.classList.remove('bg-gray-800', 'hover:bg-gray-900');
    btn.classList.add('bg-casanova-primary', 'hover:bg-pink-400');
    
    // Rola a tela para o input suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.adicionarAoChecklist = async function() {
    const nome = document.getElementById('novo-item-check-nome').value.trim();
    const cat = document.getElementById('novo-item-check-cat').value;
    if(!nome) return;
    
    const btn = document.getElementById('btn-add-checklist');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        if (editandoChecklistId) {
            // Editando
            const item = estadoChecklist.find(i => i.ID == editandoChecklistId);
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'edit', sheetName: 'ChecklistBase', ID: item.ID, Item: nome, Categoria: cat, StatusDaIdeia: item.StatusDaIdeia }) });
            
            // Restaura o botão original
            editandoChecklistId = null;
            btn.innerText = 'ADICIONAR';
            btn.classList.add('bg-gray-800', 'hover:bg-gray-900');
            btn.classList.remove('bg-casanova-primary', 'hover:bg-pink-400');
        } else {
            // Criando novo
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'add', sheetName: 'ChecklistBase', ID: Date.now(), Item: nome, Categoria: cat, StatusDaIdeia: 'Aguardando' }) });
        }
        
        document.getElementById('novo-item-check-nome').value = '';
        carregarItens();
    } catch (e) {
        alert("Erro ao salvar no checklist.");
    } finally {
        btn.disabled = false;
        if (!editandoChecklistId) btn.innerText = 'ADICIONAR';
    }
}

window.mudarStatusChecklist = async function(id, novoStatus) {
    const item = estadoChecklist.find(i => i.ID == id);
    item.StatusDaIdeia = novoStatus;
    renderizarChecklist(); // Renderização Otimista (move pra baixo na hora, sem esperar o servidor)
    
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'edit', sheetName: 'ChecklistBase', ID: item.ID, Item: item.Item, Categoria: item.Categoria, StatusDaIdeia: novoStatus }) });
    carregarItens();
}

window.iniciarTransferencia = function(id) {
    const item = estadoChecklist.find(i => i.ID == id);
    document.getElementById('btn-open-modal').click(); 
    document.getElementById('input-nome').value = item.Item;
    document.getElementById('input-categoria').value = item.Categoria;
    document.getElementById('checklist-origin-id').value = item.ID; 
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

// === UPLOAD DE IMAGEM PARA O GOOGLE DRIVE ===
window.fazerUploadFoto = async function(input) {
    const file = input.files[0];
    if (!file) return;
    alert("Iniciando upload do arquivo: " + file.name)
    const lbl = document.getElementById('btn-upload-lbl');
    const status = document.getElementById('upload-status');
    const urlInput = document.getElementById('input-imagem');
    
    // Trava o botão e avisa que tá carregando
    lbl.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    status.classList.remove('hidden');

    // Lê a foto do celular
    const reader = new FileReader();
    reader.onloadend = async function() {
        const base64data = reader.result;
        
        try {
            // Envia para o nosso script do Google
            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'upload_image',
                    base64: base64data,
                    mimeType: file.type,
                    filename: "foto_" + Date.now() + "_" + file.name
                })
            });
            
            const json = await res.json();
            if (json.status === 'success') {
                // Sucesso! Preenche o input invisivelmente com o link do Drive
                urlInput.value = json.url; 
                status.innerHTML = '<i class="fas fa-check text-green-500 mr-1"></i>Foto enviada e vinculada!';
                setTimeout(() => status.classList.add('hidden'), 4000);
            } else {
                alert("Erro no servidor: " + json.message);
                status.classList.add('hidden');
            }
        } catch(e) {
            alert("Erro de conexão ao enviar a foto.");
            status.classList.add('hidden');
        } finally {
            // Destrava o botão
            lbl.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            input.value = ''; // Reseta o campo para poder enviar outra se quiser
            setTimeout(() => status.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Enviando para o Google Drive...', 4500);
        }
    };
    reader.readAsDataURL(file);
}


        
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
    
    // Novo evento de Ordenação
    document.getElementById('sort-order').onchange = renderizarItens;
    
    document.getElementById('btn-open-modal').onclick = () => { const btnSalvar = document.querySelector('#item-form button[type="submit"]'); btnSalvar.innerHTML = 'SALVAR ITEM'; btnSalvar.disabled = false; document.getElementById('item-form').reset(); document.getElementById('input-id').value = ''; document.getElementById('checklist-origin-id').value = ''; document.getElementById('links-container').innerHTML = ''; uiCriarLinhaLink('', ''); document.getElementById('btn-delete-trigger').classList.add('hidden'); uiToggleCampos(); document.getElementById('modal-title').innerText = "Adicionar Novo Item"; document.getElementById('item-modal').classList.remove('hidden'); };

    // (Novo) Controle de Filtros e Busca do Checklist
    document.getElementById('search-check').oninput = renderizarChecklist;
    document.getElementById('sort-check').onchange = renderizarChecklist;
    document.getElementById('filter-cat-check').onchange = renderizarChecklist;
    
    // Filtro de Categoria (CORRIGIDO textContent)
    document.getElementById('category-filters').onclick = (e) => { 
        if(e.target.tagName === 'BUTTON') { 
            document.querySelectorAll('.cat-btn').forEach(b => b.className = "cat-btn px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-gray-100 text-gray-500"); 
            e.target.className = "cat-btn active px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-casanova-primary text-white"; 
            filtroCategoria = e.target.textContent.trim(); 
            renderizarItens(); 
        } 
    };
    
    // Filtro de Status (CORRIGIDO textContent)
    document.getElementById('status-filters').onclick = (e) => { 
        if(e.target.tagName === 'BUTTON') { 
            document.querySelectorAll('.status-btn').forEach(b => b.className = "status-btn px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-gray-100 text-gray-500"); 
            e.target.className = "status-btn active px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-gray-800 text-white"; 
            filtroStatus = e.target.textContent.trim(); 
            renderizarItens(); 
        } 
    };
}

function fecharModal() { document.getElementById('item-modal').classList.add('hidden'); }
function fecharConfirm() { document.getElementById('confirm-modal').classList.add('hidden'); }
