let produtosData = [];
let carrinho = [];
let coresDisponiveis = [];
let itemPendente = null; // Guarda o produto que está sendo configurado no modal
const fone = "5585989951767";

// 1. Normalização para busca sem acentos
const normalizar = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// 2. Carregar dados e ler URL
async function init() {
    try {
        const resp = await fetch('data.json?t=' + new Date().getTime());
        const data = await resp.json();
        produtosData = data.produtos;
        coresDisponiveis = data.cores;

        carregarEnderecoSalvo();

        // Preencher filtros de Categorias
        const catSelect = document.getElementById('filtroCat');
        catSelect.innerHTML = '<option value="">Todas as Categorias</option>';
        data.categorias.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
        
        // Preencher filtros de Parceiros
        const parcSelect = document.getElementById('filtroParceiro');
        parcSelect.innerHTML = '<option value="">Todos os Parceiros</option>';
        data.parceiros.forEach(p => parcSelect.innerHTML += `<option value="${p}">${p}</option>`);

        // Ler URL Inicial
        const params = new URLSearchParams(window.location.search);
        document.getElementById('busca').value = params.get('q') || "";
        document.getElementById('filtroCat').value = params.get('cat') || "";
        document.getElementById('filtroParceiro').value = params.get('p') || "";

        filtrar();
    } catch (error) {
        console.error("Erro ao inicializar o catálogo:", error);
        mostrarToast("Erro ao carregar os produtos.", 3000);
    }
}

// 3. Sistema de Filtro com URL Sync
function filtrar() {
    const busca = normalizar(document.getElementById('busca').value);
    const cat = document.getElementById('filtroCat').value;
    const parc = document.getElementById('filtroParceiro').value;

    // Atualiza URL dinamicamente
    const url = new URL(window.location);
    if (busca) url.searchParams.set('q', busca); else url.searchParams.delete('q');
    if (cat) url.searchParams.set('cat', cat); else url.searchParams.delete('cat');
    if (parc) url.searchParams.set('p', parc); else url.searchParams.delete('p');
    window.history.replaceState({}, '', url);

    const filtrados = produtosData.filter(item => {
        const matchBusca = normalizar(item.nome).includes(busca);
        const matchCat = cat === "" || item.categoria === cat;
        const matchParc = parc === "" || item.parceiro === parc;
        return matchBusca && matchCat && matchParc && item.isActive;
    });

    render(filtrados);
}

// 4. Renderizar Cards no HTML
function render(lista) {
    const container = document.getElementById('catalogo');
    if (lista.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px 0;">Nenhum produto encontrado.</p>`;
        return;
    }
    
    container.innerHTML = lista.sort(() => Math.random() - 0.5).map(p => `
        <div class="card">
            <img src="${p.imagem}" alt="${p.nome}" loading="lazy">
            <div class="card-info">
                <h3>${p.nome}</h3>
                <p class="price">R$ ${p.preco.toFixed(2)}</p>
                <small>${p.categoria} | ${p?.parceiro ? p.parceiro : "LuviLet3D"}</small>
            </div>
            <button class="btn-add" onclick="addCart(${p.id})">Adicionar</button>
        </div>
    `).join('');
}

// 5. Aciona o modal de quantidade e configura variantes de cor
function addCart(id) {
    const prod = produtosData.find(p => p.id === id);
    itemPendente = prod;
    
    document.getElementById('nome-prod-modal').innerText = prod.nome;
    document.getElementById('input-qtd').value = 1;
    
    const containerVariantes = document.getElementById('container-variantes');
    containerVariantes.innerHTML = ""; // Limpa seleções anteriores

    // Verifica se o produto aceita variantes de cor
    if (prod.colorVariant) {
        // Opções de cores baseadas na sua base de dados
        const opcoesCores = coresDisponiveis.map(cor => `<option value="${cor}">${cor}</option>`).join('');

        if (prod.objects && prod.objects.length > 0) {
            // Caso 1: Tem partes específicas (ex: Articulações, Armadura)
            prod.objects.forEach(objeto => {
                containerVariantes.innerHTML += `
                    <div class="grupo-variante">
                        <label>Cor da parte *${objeto}*:</label>
                        <select class="select-cor-variante" data-objeto="${objeto}">
                            ${opcoesCores}
                        </select>
                    </div>
                `;
            });
        } else {
            // Caso 2: Só tem a flag colorVariant (escolhe uma cor para o produto todo)
            containerVariantes.innerHTML += `
                <div class="grupo-variante">
                    <label>Cor do Produto:</label>
                    <select class="select-cor-variante" data-objeto="Produto Completo">
                        ${opcoesCores}
                    </select>
                </div>
            `;
        }
    }

    document.getElementById('modal-quantidade').style.display = 'flex';
}

// 6. Fecha o modal de quantidade
function fecharModal() {
    document.getElementById('modal-quantidade').style.display = 'none';
    mostrarToast("Produto não adicionado", 2000);
}

// 7. Confirma e injeta o item com suas respectivas cores no carrinho
function confirmarAdicao() {
    const qtd = parseInt(document.getElementById('input-qtd').value);
    
    if (qtd > 0) {
        // Coleta as cores selecionadas no modal
        let coresEscolhidas = {};
        const selects = document.querySelectorAll('.select-cor-variante');
        selects.forEach(select => {
            const objeto = select.getAttribute('data-objeto');
            coresEscolhidas[objeto] = select.value;
        });

        // IMPORTANTE: Para produtos com cores diferentes, tratamos como itens separados no carrinho
        const itemExistente = carrinho.find(item => 
            item.id === itemPendente.id && 
            JSON.stringify(item.cores) === JSON.stringify(coresEscolhidas)
        );
        
        if (itemExistente) {
            itemExistente.qtd += qtd;
        } else {
            carrinho.push({ ...itemPendente, qtd: qtd, cores: coresEscolhidas });
        }
        
        atualizarContadorVisual();
        document.getElementById('modal-quantidade').style.display = 'none';
        mostrarToast(`${qtd}x adicionado(s) com sucesso!`, 2000);
    }
}

// Auxiliar para recalcular a quantidade de bolinhas flutuantes
function atualizarContadorVisual() {
    const totalItens = carrinho.reduce((sum, item) => sum + item.qtd, 0);
    document.getElementById('cart-count').innerText = totalItens;
}

// 8. Sistema de Feedback visual (Toast)
function mostrarToast(mensagem, tempo) {
    const toast = document.getElementById("toast");
    toast.innerText = mensagem;
    toast.className = "show";
    
    setTimeout(() => { 
        toast.className = toast.className.replace("show", ""); 
    }, tempo);
}

// 9. Abrir e Fechar gerenciador do Carrinho
function abrirModalCart() {
    renderizarCarrinho();
    document.getElementById('modal-cart').style.display = 'flex';
}

function fecharCart() {
    document.getElementById('modal-cart').style.display = 'none';
}

// 10. Renderizar a lista real de compras no Modal (Mostrando as cores escolhidas)
function renderizarCarrinho() {
    toggleParcelas();
    const lista = document.getElementById('lista-carrinho');
    const totalElement = document.getElementById('total-carrinho');
    
    if (carrinho.length === 0) {
        lista.innerHTML = "<p style='text-align:center; padding: 20px; color:#64748b;'>O seu carrinho está vazio.</p>";
        totalElement.innerText = "Total: R$ 0,00";
        return;
    }

    let totalGeral = 0;
    lista.innerHTML = carrinho.map((item, index) => {
        const subtotal = item.preco * item.qtd;
        totalGeral += subtotal;

        // Gera o texto das cores formatado se elas existirem
        let textoCores = "";
        if (item.cores && Object.keys(item.cores).length > 0) {
            textoCores = `<div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">`;
            for (const [parte, cor] of Object.entries(item.cores)) {
                textoCores += `• ${parte}: <b>${cor}</b><br>`;
            }
            textoCores += `</div>`;
        }

        return `
            <div class="item-cart">
                <img src="${item.imagem}" alt="${item.nome}">
                <div class="item-cart-info">
                    <h4>${item.nome}</h4>
                    ${textoCores} <!-- Injeção das cores escolhidas -->
                    <p>R$ ${subtotal.toFixed(2)}</p>
                </div>
                <div class="item-cart-acoes">
                    <input type="number" value="${item.qtd}" min="1" onchange="atualizarQtd(${index}, this.value)">
                    <button class="btn-remover" onclick="removerItem(${index})">X</button>
                </div>
            </div>
        `;
    }).join('');

    const valorPix = (totalGeral * 0.95).toFixed(2);
    totalElement.innerHTML = `Total: R$ ${totalGeral.toFixed(2)} <span style="font-size:0.9rem; font-weight:normal; color:#475569; display:block; margin-top:4px;">ou <b>R$ ${valorPix}</b> no Pix (5% OFF)</span>`;
    atualizarContadorVisual();
}

// 11. Alterar quantidades por inputs no carrinho
function atualizarQtd(index, novaQtd) {
    const qtd = parseInt(novaQtd);
    if (qtd > 0) {
        carrinho[index].qtd = qtd;
        renderizarCarrinho();
    }
}

// 12. Remover item do carrinho
function removerItem(index) {
    carrinho.splice(index, 1);
    renderizarCarrinho();
}

// 13. Esvaziar carrinho completamente
function limparCarrinho() {
    carrinho = [];
    document.getElementById('cart-count').innerText = "0";
    fecharCart();
    mostrarToast("Carrinho limpo", 2000);
}

// 14. Exibir ou ocultar parcelas do Cartão
function toggleParcelas() {
    const pag = document.getElementById('forma-pagamento').value;
    document.getElementById('div-parcelas').style.display = (pag === 'Crédito') ? 'block' : 'none';
}

// 15. Busca automática de endereço por CEP (BrasilAPI)
async function buscarCEP() {
    const cep = document.getElementById('end-cep').value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (!response.ok) throw new Error("CEP não encontrado");
        const data = await response.json();
        
        if (data.street) {
            document.getElementById('end-rua').value = data.street;
            document.getElementById('end-bairro').value = data.neighborhood;
            document.getElementById('end-cidade').value = `${data.city} - ${data.state}`;
        }
    } catch (e) {
        mostrarToast("CEP não encontrado ou erro na busca", 2000);
    }
}

// 16. Modais de Endereço
function abrirModalEnd() { document.getElementById('modal-endereco').style.display = 'flex'; }
function fecharModalEnd() { document.getElementById('modal-endereco').style.display = 'none'; }

function limparFormEnd() {
    ['end-cep', 'end-rua', 'end-numero','end-complemento', 'end-bairro', 'end-cidade'].forEach(id => {
        document.getElementById(id).value = "";
    });
    limparEnderecoSalvo();
    carregarEnderecoSalvo();
}

function limparEnderecoSalvo() {
    localStorage.removeItem('luvilet_endereco');
    mostrarToast("Endereço removido", 2000);
}

function salvarEndereco() {
    const end = {
        rua: document.getElementById('end-rua').value,
        num: document.getElementById('end-numero').value,
        comp: document.getElementById('end-complemento').value,
        bairro: document.getElementById('end-bairro').value,
        cidade: document.getElementById('end-cidade').value,
        cep: document.getElementById('end-cep').value
    };

    if (!end.rua || !end.num) return alert("Por favor, preencha a Rua e o Número!");

    localStorage.setItem('luvilet_endereco', JSON.stringify(end));
    carregarEnderecoSalvo();
    fecharModalEnd();
    mostrarToast("Endereço salvo!", 2000);
}

function carregarEnderecoSalvo() {
    const salvo = localStorage.getItem('luvilet_endereco');
    if (salvo) {
        const e = JSON.parse(salvo);
        document.getElementById('end-selecionado').innerHTML = `📍 ${e.rua}, ${e.num} - ${e.bairro}`;
    } else {
        document.getElementById('end-selecionado').innerHTML = `Nenhum endereço cadastrado.`;
    }
}

function abrirCheckout() {
    if(carrinho.length === 0) return alert("Seu carrinho está vazio!");
    
    let total = 0;
    let resumo = "🤖 *Novo Pedido - LuviLet3D*\n";
    resumo += "=========================\n\n";
    
    carrinho.forEach(item => {
        const subtotalItem = item.preco * item.qtd;
        resumo += `📦 *${item.nome}*\n` +
                  `• Qtd: ${item.qtd}x\n`;
        
        // NOVO: Adiciona os detalhes das cores selecionadas no corpo do texto do Whats
        if (item.cores && Object.keys(item.cores).length > 0) {
            for (const [parte, cor] of Object.entries(item.cores)) {
                resumo += `  └ ${parte}: ${cor}\n`;
            }
        }

        resumo += `• Subtotal: R$ ${subtotalItem.toFixed(2)}\n\n`;
        total += subtotalItem;
    });

    resumo += "=========================\n";

    const endSalvo = localStorage.getItem('luvilet_endereco');
    if (endSalvo) {
        const e = JSON.parse(endSalvo);
        const complementoStr = e.comp ? `, ${e.comp}` : "";
        resumo += `\n📍 *Endereço para Entrega:*\n${e.rua}, Nº ${e.num}${complementoStr}\nBairro: ${e.bairro}\n${e.cidade} | CEP: ${e.cep}\n`;
    } else {
        resumo += `\n📍 *Entrega:* Retirada / Frete a combinar.\n`;
    }

    const pag = document.getElementById('forma-pagamento').value;
    const parc = document.getElementById('qtd-parcelas').value;
    const totalFinalObtido = pag === "Crédito" ? total : (total * 0.95);

    resumo += `\n💳 *Forma de Pagamento:* ${pag}${pag === 'Crédito' ? ' (' + parc + 'x)' : ''}`;
    resumo += `\n💰 *Total Geral:* R$ ${totalFinalObtido.toFixed(2)}`;
    
    if(pag === "Pix") {
        resumo += ` _(5% de desconto incluso)_`;
    }

    window.open(`https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(resumo)}`, '_blank');
}

// Funções para o componente de confirmação personalizado
function abrirModalPersonalizado() {
    document.getElementById('modal-personalizado').style.display = 'flex';
}

function confirmarRedirecionamentoPersonalizado() {
    document.getElementById('modal-personalizado').style.display = 'none';
    
    const mensagem = "Olá! Gostaria de fazer um orçamento para um pedido personalizado com a LuviLet3D.";
    
    window.open(`https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(mensagem)}`, '_blank');
}

function cancelarRedirecionamentoPersonalizado() {
    document.getElementById('modal-personalizado').style.display = 'none';
    // Utiliza o seu sistema de Toast nativo para avisar a tela
    mostrarToast("Operação cancelada.", 3000);
}

window.onload = init;