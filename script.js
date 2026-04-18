let produtosData = [];
let carrinho = [];
let itemPendente = null; // Guarda o produto que está sendo configurado no modal

// 1. Normalização para busca sem acentos
const normalizar = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// 2. Carregar dados e ler URL
async function init() {
    const resp = await fetch('data.json?t=' + new Date().getTime());
    const data = await resp.json();
    produtosData = data.produtos;

    carregarEnderecoSalvo();

    // Preencher filtros
    const catSelect = document.getElementById('filtroCat');
    data.categorias.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    
    const parcSelect = document.getElementById('filtroParceiro');
    data.parceiros.forEach(p => parcSelect.innerHTML += `<option value="${p}">${p}</option>`);

    // Ler URL Inicial
    const params = new URLSearchParams(window.location.search);
    document.getElementById('busca').value = params.get('q') || "";
    document.getElementById('filtroCat').value = params.get('cat') || "";
    document.getElementById('filtroParceiro').value = params.get('p') || "";

    filtrar();
}

// 3. Sistema de Filtro com URL Sync
function filtrar() {
    const busca = normalizar(document.getElementById('busca').value);
    const cat = document.getElementById('filtroCat').value;
    const parc = document.getElementById('filtroParceiro').value;

    // Atualiza URL
    const url = new URL(window.location);
    url.searchParams.set('q', busca);
    url.searchParams.set('cat', cat);
    url.searchParams.set('p', parc);
    window.history.replaceState({}, '', url);

    const filtrados = produtosData.filter(item => {
        const matchBusca = normalizar(item.nome).includes(busca);
        const matchCat = cat === "" || item.categoria === cat;
        const matchParc = parc === "" || item.parceiro === parc;
        return matchBusca && matchCat && matchParc;
    });

    render(filtrados);
}

// 4. Renderizar Cards
function render(lista) {
    const container = document.getElementById('catalogo');
    container.innerHTML = lista.map(p => `
        <div class="card">
            <img src="${p.imagem}" alt="${p.nome}">
            <div class="card-info">
                <h3>${p.nome}</h3>
                <p class="price">R$ ${p.preco.toFixed(2)}</p>
                <small>${p.categoria} | ${p.parceiro}</small>
            </div>
            <button class="btn-add" onclick="addCart(${p.id})">Adicionar</button>
        </div>
    `).join('');
}

// 1. Função chamada pelo botão "Adicionar" do Card
function addCart(id) {
    const prod = produtosData.find(p => p.id === id);
    itemPendente = prod;
    
    document.getElementById('nome-prod-modal').innerText = prod.nome;
    document.getElementById('input-qtd').value = 1;
    document.getElementById('modal-quantidade').style.display = 'flex';
}

// 2. Fecha o modal e mostra erro
function fecharModal() {
    document.getElementById('modal-quantidade').style.display = 'none';
    mostrarToast("Produto não adicionado", 3000);
}

// 3. Confirma e adiciona com a quantidade correta
function confirmarAdicao() {
    const qtd = parseInt(document.getElementById('input-qtd').value);
    
    if (qtd > 0) {
        // Adiciona ao carrinho (objeto com qtd)
        carrinho.push({ ...itemPendente, qtd: qtd });
        
        // Atualiza contador visual
        const totalItens = carrinho.reduce((sum, item) => sum + item.qtd, 0);
        document.getElementById('cart-count').innerText = totalItens;
        
        document.getElementById('modal-quantidade').style.display = 'none';
        mostrarToast("Produtos adicionados", 2000);
    }
}

// 4. Função para mostrar a "mensagenzinha"
function mostrarToast(mensagem, tempo) {
    const toast = document.getElementById("toast");
    toast.innerText = mensagem;
    toast.className = "show";
    
    setTimeout(() => { 
        toast.className = toast.className.replace("show", ""); 
    }, tempo);
}

// Abrir o modal de gerenciamento do carrinho
function abrirModalCart() {
    renderizarCarrinho();
    document.getElementById('modal-cart').style.display = 'flex';
}

// Fechar o modal do carrinho
function fecharCart() {
    document.getElementById('modal-cart').style.display = 'none';
}

// Renderizar os itens dentro do carrinho com foto, qtd e preço
function renderizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const totalElement = document.getElementById('total-carrinho');
    
    if (carrinho.length === 0) {
        lista.innerHTML = "<p>O carrinho está vazio.</p>";
        totalElement.innerText = "Total: R$ 0,00";
        return;
    }

    let totalGeral = 0;
    lista.innerHTML = carrinho.map((item, index) => {
        const subtotal = item.preco * item.qtd;
        totalGeral += subtotal;
        return `
            <div class="item-cart">
                <img src="${item.imagem}" alt="${item.nome}">
                <div class="item-cart-info">
                    <h4>${item.nome}</h4>
                    <p>R$ ${subtotal.toFixed(2)}</p>
                </div>
                <div class="item-cart-acoes">
                    <input type="number" value="${item.qtd}" min="1" onchange="atualizarQtd(${index}, this.value)">
                    <button class="btn-remover" onclick="removerItem(${index})">X</button>
                </div>
            </div>
        `;
    }).join('');

    totalElement.innerText = `Total: R$ ${totalGeral.toFixed(2)}`;
    document.getElementById('cart-count').innerText = carrinho.reduce((a, b) => a + b.qtd, 0);
}

// Atualizar quantidade em tempo real
function atualizarQtd(index, novaQtd) {
    const qtd = parseInt(novaQtd);
    if (qtd > 0) {
        carrinho[index].qtd = qtd;
        renderizarCarrinho();
    }
}

// Remover item específico
function removerItem(index) {
    carrinho.splice(index, 1);
    renderizarCarrinho();
}

// Limpar todo o carrinho
// Limpar todo o carrinho e atualizar a interface
function limparCarrinho() {
    carrinho = []; // Esvazia o array
    
    // Atualiza o contador do balão flutuante para zero
    document.getElementById('cart-count').innerText = "0";
    
    fecharCart(); // Fecha o modal do carrinho
    mostrarToast("Carrinho limpo", 3000);
}

// 1. Controle de Pagamento
function toggleParcelas() {
    const pag = document.getElementById('forma-pagamento').value;
    document.getElementById('div-parcelas').style.display = (pag === 'Crédito') ? 'block' : 'none';
}

// 2. Busca de CEP (BrasilAPI)
async function buscarCEP() {
    const cep = document.getElementById('end-cep').value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        const data = await response.json();
        
        if (data.street) {
            document.getElementById('end-rua').value = data.street;
            document.getElementById('end-bairro').value = data.neighborhood;
            document.getElementById('end-cidade').value = data.city + " - " + data.state;
        }
    } catch (e) {
        mostrarToast("Erro ao buscar CEP", 2000);
    }
}

// 3. Gestão de Endereço no LocalStorage
function abrirModalEnd() { document.getElementById('modal-endereco').style.display = 'flex'; }
function fecharModalEnd() { document.getElementById('modal-endereco').style.display = 'none'; }

function limparFormEnd() {
    ['end-cep', 'end-rua', 'end-numero', 'end-bairro', 'end-cidade'].forEach(id => {
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
        bairro: document.getElementById('end-bairro').value,
        cidade: document.getElementById('end-cidade').value,
        cep: document.getElementById('end-cep').value
    };

    if (!end.rua || !end.num) return alert("Preencha os campos básicos!");

    localStorage.setItem('luvilet_endereco', JSON.stringify(end));
    carregarEnderecoSalvo();
    fecharModalEnd();
    mostrarToast("Endereço adicionado", 2000);
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

// 4. Checkout Atualizado para WhatsApp
function abrirCheckout() {
    if(carrinho.length === 0) return alert("Seu carrinho está vazio!");
    
    let total = 0;
    let resumo = "Olá! Novo pedido:\n\n";
    
    carrinho.forEach(item => {
        resumo += `- ${item.id}: ${item.nome} (Qtd: ${item.qtd}): R$ ${(item.preco * item.qtd).toFixed(2)}\n`;
        total += (item.preco * item.qtd);
    });

    const endSalvo = localStorage.getItem('luvilet_endereco');
    if (endSalvo) {
        const e = JSON.parse(endSalvo);
        resumo += `\n*Entrega:* ${e.rua}, ${e.num} - ${e.bairro}, ${e.cidade} (CEP: ${e.cep})`;
    } else {
        resumo += `\n*Entrega:* Retirada a combinar.`;
    }

    const pag = document.getElementById('forma-pagamento').value;
    const parc = document.getElementById('qtd-parcelas').value;
    resumo += `\n\n*Pagamento:* ${pag}${pag === 'Crédito' ? ' (' + parc + 'x)' : ''}`;
    resumo += `\n*Total:* R$ ${total.toFixed(2)}`;
    
    const fone = "5585989951767";
    window.open(`https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(resumo)}`);
}


window.onload = init;