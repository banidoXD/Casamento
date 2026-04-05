const API_URL = "https://script.google.com/macros/s/AKfycbwtO0nqPVsxFJaGpIcsUYk7egfXvYtq_kjO7BSXJxzvfxnvkQu2Ancz74SWt6osLEW0sg/exec"; // <-- NÃO ESQUEÇA DE COLAR SUA URL NOVA
let estadoItens = [];
let filtroAtivo = 'Todas';

document.addEventListener('DOMContentLoaded', () => {
    configurarEventosUI();
    carregarItens();
});

async function carregarItens() {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-spinner fa-spin mr-2 text-2xl"></i> Carregando seu enxoval...</div>`;

    try {
        const response = await fetch(API_URL);
        const dados = await response.json();
        estadoItens = dados;
        atualizarDashboard();
        renderizarItens(); 
    } catch (error) {
        grid.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">Erro ao carregar os itens.</div>`;
    }
}

// === LÓGICA DE SALVAR E EXCLUIR ===
async function salvarItem(evento) {
    evento.preventDefault();
    const btn = evento.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

    const linksArray = [];
    document.querySelectorAll('.link-row').forEach(row => {
        const loja = row.querySelector('.link-loja').value.trim();
        const url = row.querySelector('.link-url').value.trim();
        if (loja && url) linksArray.push({ loja, url });
    });

    const idAtual = document.getElementById('input-id').value;
    const novoItem = {
        action: idAtual ? "edit" : "add",
        ID: idAtual ? idAtual : Date.now(),
        Item: document.getElementById('input-nome').value.trim(),
        Categoria: document.getElementById('input-categoria').value,
        Prioridade: document.getElementById('input-prioridade').value,
        Status: document.getElementById('input-status').value,
        ValorEstimado: document.getElementById('input-valor-estimado').value || 0,
        ValorFinal: document.getElementById('input-valor-final').value || 0,
        Tags: document.getElementById('input-tags').value.trim(),
        ImagemURL: document.getElementById('input-imagem').value.trim(),
        Links: linksArray,
        Observacoes: document.getElementById('input-obs').value.trim(),
        FormaPagamento: document.getElementById('input-forma-pag').value,
        QtdParcelas: document.getElementById('input-qtd-parcelas').value || 1,
        ParcelasPagas: document.getElementById('input-parcelas-pagas').value || 0,
        QuemDeu: document.getElementById('input-quem-deu').value.trim()
    };

    enviarParaAPI(novoItem, btn, "Salvar");
}

async function excluirItem(id) {
    if(!confirm("Tem certeza que deseja excluir este item para sempre?")) return;
    const btn = document.getElementById('btn-delete-item');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    const payload = { action: "delete", ID: id };
    enviarParaAPI(payload, btn, "Excluir", true);
}

async function enviarParaAPI(payload, btn, txtOriginal, fechandoModal = false) {
    try {
        const response = await fetch(API_URL, {
            method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (res.status === "success") {
            fecharModal();
            carregarItens();
        } else alert("Erro: " + res.message);
    } catch (e) {
        alert("Erro de conexão.");
    } finally {
        if(btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
    }
}

// === RENDERIZAÇÃO ===
function renderizarItens() {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = '';

    const termoBusca = document.getElementById('search-bar').value.toLowerCase();
    const ocultarConcluidos = document.getElementById('toggle-pendentes').checked;

    const itensFiltrados = estadoItens.filter(item => {
        const matchCategoria = filtroAtivo === 'Todas' || item.Categoria === filtroAtivo;
        const matchBusca = (item.Item || '').toLowerCase().includes(termoBusca) || (item.Tags || '').toLowerCase().includes(termoBusca);
        const matchConcluido = ocultarConcluidos ? item.Status === 'Pendente' : true;
        return matchCategoria && matchBusca && matchConcluido;
    });

    if (itensFiltrados.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-8">Nenhum item encontrado.</div>`;
        return;
    }

    itensFiltrados.forEach(item => {
        let linksHtml = '';
        try {
            const links = item.Links ? JSON.parse(item.Links) : [];
            links.forEach(l => { linksHtml += `<a href="${l.url}" target="_blank" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border inline-block mb-1 mr-1"><i class="fas fa-external-link-alt mr-1"></i>${l.loja}</a>`; });
        } catch (e) { linksHtml = 'Erro links'; }

        // Cores de Status e Regras de Exibição
        let statusColor = 'bg-gray-100 text-gray-600';
        let progressoParcelaHtml = '';
        let infoPagamentoHtml = '';

        if (item.Status === 'Comprado') {
            statusColor = 'bg-green-100 text-green-700';
            const vFinal = parseFloat(item.ValorFinal) || 0;
            
            if(item.FormaPagamento === 'Parcelado') {
                const totalParc = parseInt(item.QtdParcelas) || 1;
                const pagas = parseInt(item.ParcelasPagas) || 0;
                const porcentagem = (pagas / totalParc) * 100;
                const valParcela = vFinal / totalParc;
                
                infoPagamentoHtml = `<p class="font-bold text-gray-800">Total: R$ ${vFinal.toFixed(2)}</p>
                                     <p class="text-[11px] text-gray-500">${totalParc}x de R$ ${valParcela.toFixed(2)}</p>`;
                
                progressoParcelaHtml = `
                    <div class="mt-2 pt-2 border-t border-gray-100">
                        <div class="flex justify-between text-[10px] text-gray-500 font-bold mb-1">
                            <span>Parcelas (${pagas}/${totalParc})</span>
                            <span class="${pagas === totalParc ? 'text-green-500' : 'text-red-400'}">Faltam ${totalParc - pagas}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-green-400 h-1.5 rounded-full" style="width: ${porcentagem}%"></div></div>
                    </div>`;
            } else {
                infoPagamentoHtml = `<p class="font-bold text-green-700">À Vista: R$ ${vFinal.toFixed(2)}</p>`;
            }
        } else if (item.Status === 'Ganhamos') {
            statusColor = 'bg-purple-100 text-purple-700';
            infoPagamentoHtml = `<p class="text-xs text-purple-600 font-bold mt-1"><i class="fas fa-gift mr-1"></i>De: ${item.QuemDeu || 'Não anotado'}</p>`;
        } else { // Pendente
            statusColor = 'bg-yellow-100 text-yellow-700';
            infoPagamentoHtml = `<p class="text-gray-500 text-sm">Estimado: R$ ${parseFloat(item.ValorEstimado || 0).toFixed(2)}</p>`;
        }

        const imagem = item.ImagemURL || 'https://via.placeholder.com/400x300?text=Sem+Imagem';
        const prioridadeTxt = item.Prioridade ? item.Prioridade.split('-')[1] || item.Prioridade : '';
        const tagsHtml = item.Tags ? `<div class="mt-2 text-[10px] text-gray-400">Tags: ${item.Tags}</div>` : '';

        const card = `
            <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-gray-100 flex flex-col">
                <div class="h-40 overflow-hidden bg-gray-50 flex items-center justify-center relative group">
                    <img src="${imagem}" alt="${item.Item}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <span class="absolute top-2 right-2 px-2 py-1 text-[11px] font-bold rounded shadow-sm ${statusColor} uppercase tracking-wider">${item.Status}</span>
                </div>
                
                <div class="p-4 flex-1 flex flex-col relative">
                    <button onclick="abrirEdicao(${item.ID})" class="absolute top-4 right-4 text-gray-300 hover:text-casanova-primary transition-colors"><i class="fas fa-edit"></i></button>
                    <div class="pr-6">
                        <h3 class="font-bold text-gray-800 text-md leading-tight mb-1">${item.Item}</h3>
                        <div class="text-[11px] text-gray-500 mb-2 space-x-1">
                            <span class="bg-casanova-primary bg-opacity-10 text-casanova-primary px-1.5 py-0.5 rounded border border-casanova-primary border-opacity-20">${item.Categoria}</span>
                            <span class="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">${prioridadeTxt}</span>
                        </div>
                        ${infoPagamentoHtml}
                        ${progressoParcelaHtml}
                    </div>

                    <div class="mt-auto pt-3">
                        <details class="group/det">
                            <summary class="text-[11px] font-bold text-casanova-secondary cursor-pointer hover:text-blue-500 list-none flex items-center">
                                <i class="fas fa-chevron-right mr-1 transition-transform group-open/det:rotate-90"></i> Ver Detalhes / Links
                            </summary>
                            <div class="mt-2 pl-2 border-l-2 border-gray-100 pt-1">
                                <p class="text-xs text-gray-500 italic mb-2">${item.Observacoes || 'Nenhuma observação.'}</p>
                                <div class="flex flex-wrap">${linksHtml || '<span class="text-[10px] text-gray-300">Sem links</span>'}</div>
                                ${tagsHtml}
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

function atualizarDashboard() {
    let estimado = 0, pagoReal = 0, divida = 0;
    let concluidos = 0;

    estadoItens.forEach(item => {
        if (item.Status === 'Pendente') estimado += parseFloat(item.ValorEstimado) || 0;
        
        if (item.Status === 'Comprado' || item.Status === 'Ganhamos') concluidos++;

        if (item.Status === 'Comprado') {
            const vFinal = parseFloat(item.ValorFinal) || 0;
            if (item.FormaPagamento === 'Parcelado') {
                const totalParc = parseInt(item.QtdParcelas) || 1;
                const pagas = parseInt(item.ParcelasPagas) || 0;
                const valParcela = vFinal / totalParc;
                
                pagoReal += (valParcela * pagas);
                divida += (valParcela * (totalParc - pagas));
            } else {
                pagoReal += vFinal;
            }
        }
    });

    const porcentagem = estadoItens.length > 0 ? Math.round((concluidos / estadoItens.length) * 100) : 0;
    
    document.getElementById('progress-text').innerText = `${porcentagem}% Concluído (${concluidos}/${estadoItens.length})`;
    document.getElementById('progress-bar-geral').style.width = `${porcentagem}%`;

    document.getElementById('total-estimado').innerText = `R$ ${estimado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total-pago').innerText = `R$ ${pagoReal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total-divida').innerText = `R$ ${divida.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// === CONTROLES DO FORMULÁRIO E EVENTOS ===
window.toggleCamposCondicionais = function() {
    const status = document.getElementById('input-status').value;
    const divFinal = document.getElementById('div-valor-final');
    const divQuemDeu = document.getElementById('div-quem-deu');
    const sessaoParcelas = document.getElementById('sessao-parcelas');
    const formaPag = document.getElementById('input-forma-pag').value;
    
    // Resetar visibilidade
    divFinal.classList.add('hidden'); divQuemDeu.classList.add('hidden'); sessaoParcelas.classList.add('hidden');
    document.querySelectorAll('.campo-parcela').forEach(el => el.classList.add('hidden'));

    if (status === 'Comprado') {
        divFinal.classList.remove('hidden');
        sessaoParcelas.classList.remove('hidden');
        if (formaPag === 'Parcelado') {
            document.querySelectorAll('.campo-parcela').forEach(el => el.classList.remove('hidden'));
        }
    } else if (status === 'Ganhamos') {
        divQuemDeu.classList.remove('hidden');
    }
}

window.abrirEdicao = function(id) {
    const item = estadoItens.find(i => i.ID == id);
    if (!item) return;

    document.getElementById('input-id').value = item.ID;
    document.getElementById('input-nome').value = item.Item;
    document.getElementById('input-categoria').value = item.Categoria || 'Cozinha';
    document.getElementById('input-status').value = item.Status || 'Pendente';
    
    const selPrioridade = document.getElementById('input-prioridade');
    Array.from(selPrioridade.options).forEach(opt => { if (opt.value.startsWith(item.Prioridade)) opt.selected = true; });

    document.getElementById('input-valor-estimado').value = item.ValorEstimado || '';
    document.getElementById('input-valor-final').value = item.ValorFinal || '';
    document.getElementById('input-forma-pag').value = item.FormaPagamento || 'À vista';
    document.getElementById('input-qtd-parcelas').value = item.QtdParcelas || 1;
    document.getElementById('input-parcelas-pagas').value = item.ParcelasPagas || 0;
    document.getElementById('input-quem-deu').value = item.QuemDeu || '';

    document.getElementById('input-tags').value = item.Tags || '';
    document.getElementById('input-imagem').value = item.ImagemURL || '';
    document.getElementById('input-obs').value = item.Observacoes || '';

    const container = document.getElementById('links-container');
    container.innerHTML = ''; 
    try {
        const links = item.Links ? JSON.parse(item.Links) : [];
        if (links.length === 0) throw new Error(); 
        links.forEach(l => criarLinhaLink(l.loja, l.url));
    } catch (e) { criarLinhaLink('', ''); }

    // Botão excluir
    const btnExcluir = document.getElementById('btn-delete-item');
    btnExcluir.classList.remove('hidden');
    btnExcluir.onclick = () => excluirItem(item.ID);

    toggleCamposCondicionais(); // Ajusta os inputs
    document.querySelector('#item-modal h2').innerText = "Editar Item";
    document.getElementById('item-modal').classList.remove('hidden');
}

function configurarEventosUI() {
    // Modal
    document.getElementById('btn-open-modal').addEventListener('click', () => {
        document.getElementById('input-id').value = '';
        document.getElementById('item-form').reset();
        document.getElementById('links-container').innerHTML = '';
        criarLinhaLink('','');
        document.getElementById('btn-delete-item').classList.add('hidden');
        toggleCamposCondicionais();
        document.querySelector('#item-modal h2').innerText = "Adicionar Novo Item";
        document.getElementById('item-modal').classList.remove('hidden');
    });
    
    document.getElementById('btn-close-modal').addEventListener('click', fecharModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', fecharModal);
    document.getElementById('item-form').addEventListener('submit', salvarItem);

    // Links Dinâmicos
    document.getElementById('btn-add-link-field').addEventListener('click', () => criarLinhaLink('', ''));

    // Filtros e Busca
    document.getElementById('search-bar').addEventListener('input', renderizarItens);
    document.getElementById('toggle-pendentes').addEventListener('change', renderizarItens);

    const filtros = document.getElementById('category-filters');
    filtros.addEventListener('click', (e) => {
        if(e.target.tagName === 'BUTTON') {
            filtros.querySelectorAll('button').forEach(btn => {
                btn.className = "px-4 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-semibold whitespace-nowrap";
            });
            e.target.className = "px-4 py-1 bg-casanova-primary text-white rounded-full text-sm font-semibold whitespace-nowrap";
            filtroAtivo = e.target.innerText;
            renderizarItens();
        }
    });
}

function criarLinhaLink(loja, url) {
    const container = document.getElementById('links-container');
    const html = `
        <div class="flex gap-2 link-row">
            <input type="text" value="${loja}" placeholder="Loja (Ex: Amazon)" class="w-1/3 p-2 border border-gray-300 rounded text-sm outline-none link-loja">
            <input type="url" value="${url}" placeholder="URL do produto" class="w-2/3 p-2 border border-gray-300 rounded text-sm outline-none link-url">
            <button type="button" class="text-red-400 hover:text-red-600 px-1" onclick="this.closest('.link-row').remove()"><i class="fas fa-trash"></i></button>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
}

function fecharModal() { document.getElementById('item-modal').classList.add('hidden'); }
