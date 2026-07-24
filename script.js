/* ==========================================================
   SCRIPT.JS — Anime Site
   - Animação de entrada dos elementos
   - Menu hambúrguer (abrir/fechar, ícone, clique fora)
   - Sistema de Favoritos (localStorage)
   - Pesquisa funcional (filtro ao vivo + busca entre páginas)
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initAnimacoes();
  initMenu();
  initFavoritos();
  initPesquisa();
});

/* ---------- Animação de entrada ---------- */
function initAnimacoes() {
  // OBS: ".card" foi removido desta lista de propósito.
  // Antes, cada card tinha sua própria animação de opacidade,
  // e isso fazia alguns cards ficarem "invisíveis" (caixas brancas)
  // durante rolagens rápidas, pois o IntersectionObserver avalia
  // cada card individualmente, mesmo com a section já visível.
  const elementos = document.querySelectorAll(
    ".card, .footer, .form-container, .menu-container, .coluna"
  );

  elementos.forEach((el) => el.classList.add("animar"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("mostrar");
        }
      });
    },
    { threshold: 0.15 }
  );

  elementos.forEach((el) => observer.observe(el));
}

/* ---------- Menu hambúrguer ---------- */
function initMenu() {
  const icone = document.querySelector(".menu-icon");
  const menu = document.getElementById("menu");
  if (!icone || !menu) return;

  icone.addEventListener("click", (e) => {
    e.stopPropagation();
    abrirMenu();
  });

  // Fecha o menu ao clicar em um link (útil no celular)
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("ativo");
      icone.textContent = "☰";
    });
  });

  // Fecha o menu ao clicar fora dele
  document.addEventListener("click", (e) => {
    if (menu.classList.contains("ativo") && !menu.contains(e.target) && e.target !== icone) {
      menu.classList.remove("ativo");
      icone.textContent = "☰";
    }
  });
}

// Mantida como função global por compatibilidade com onclick="abrirMenu()" no HTML
function abrirMenu() {
  const menu = document.getElementById("menu");
  const icone = document.querySelector(".menu-icon");
  if (!menu) return;

  menu.classList.toggle("ativo");
  if (icone) {
    icone.textContent = menu.classList.contains("ativo") ? "✕" : "☰";
  }
}

/* ---------- Favoritos ---------- */
const CHAVE_FAVORITOS = "favoritos";

function getFavoritos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || [];
  } catch {
    return [];
  }
}

function salvarFavoritos(lista) {
  localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(lista));
}

function estaFavoritado(titulo) {
  return getFavoritos().some((f) => f.titulo === titulo);
}

function alternarFavorito(item) {
  let lista = getFavoritos();
  const existe = lista.some((f) => f.titulo === item.titulo);

  if (existe) {
    lista = lista.filter((f) => f.titulo !== item.titulo);
  } else {
    lista.push(item);
  }

  salvarFavoritos(lista);
  return !existe; // retorna true se acabou de favoritar
}

function initFavoritos() {
  const paginaAtual = location.pathname.split("/").pop() || "index.html";
  const ehPaginaFavoritos = paginaAtual.toLowerCase() === "favoritos.html";

  if (ehPaginaFavoritos) {
    renderizarFavoritos();
    return;
  }

  const cards = document.querySelectorAll(".card");

  cards.forEach((card) => {
    const img = card.querySelector("img");
    const h3 = card.querySelector("h3");
    if (!img || !h3) return;

    const titulo = h3.textContent.trim();
    const categoria = detectarCategoria();

    // Evita duplicar botão se o script rodar mais de uma vez
    if (card.querySelector(".favorito-btn")) return;

    const btn = document.createElement("button");
    btn.className = "favorito-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Adicionar aos favoritos");
    btn.innerHTML = "♥";

    if (estaFavoritado(titulo)) btn.classList.add("active");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const item = {
        titulo,
        img: img.getAttribute("src"),
        categoria,
        pagina: paginaAtual,
      };

      const favoritado = alternarFavorito(item);
      btn.classList.toggle("active", favoritado);

      // Pequena animação de feedback
      btn.classList.add("pulso");
      setTimeout(() => btn.classList.remove("pulso"), 300);
    });

    card.style.position = "relative";
    card.appendChild(btn);
  });
}

function detectarCategoria() {
  const h2 = document.querySelector("section h2");
  if (!h2) return "Geral";
  return h2.textContent.replace(/[^\p{L}\s]/gu, "").trim();
}

function renderizarFavoritos() {
  const container = document.getElementById("favoritosContainer");
  const vazio = document.getElementById("favoritosVazio");
  if (!container) return;

  const lista = getFavoritos();
  container.innerHTML = "";

  if (lista.length === 0) {
    if (vazio) vazio.style.display = "block";
    return;
  }

  if (vazio) vazio.style.display = "none";

  lista.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.position = "relative";

    card.innerHTML = `
      <img src="${item.img}" alt="${item.titulo}">
      <h3>${item.titulo}</h3>
      <button class="favorito-btn active" type="button" aria-label="Remover dos favoritos">♥</button>
    `;

    const btn = card.querySelector(".favorito-btn");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      alternarFavorito(item);
      card.remove();

      if (getFavoritos().length === 0 && vazio) {
        vazio.style.display = "block";
      }
    });

    container.appendChild(card);
  });
}

/* ---------- Pesquisa ---------- */
const PAGINAS_CATEGORIA = [
  { arquivo: "Anime.html", nome: "Animes" },
  { arquivo: "Series.html", nome: "Séries" },
  { arquivo: "Filmes.html", nome: "Filmes" },
];

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function initPesquisa() {
  const input = document.getElementById("pesquisaInput");
  if (!input) return;

  const paginaAtual = location.pathname.split("/").pop() || "index.html";

  // Cria a área de links rápidos para outras categorias (uma vez só)
  const wrapper = input.closest(".pesquisa");
  let linksRapidos = null;
  if (wrapper && !wrapper.querySelector(".pesquisa-links")) {
    linksRapidos = document.createElement("div");
    linksRapidos.className = "pesquisa-links";
    wrapper.appendChild(linksRapidos);
  } else if (wrapper) {
    linksRapidos = wrapper.querySelector(".pesquisa-links");
  }

  function aplicarFiltro(termo) {
    const termoNormalizado = normalizar(termo);
    const secoes = document.querySelectorAll("section");

    secoes.forEach((secao) => {
      const cards = secao.querySelectorAll(".card");
      let algumVisivel = false;

      cards.forEach((card) => {
        const titulo = card.querySelector("h3")?.textContent || "";
        const corresponde = normalizar(titulo).includes(termoNormalizado);
        card.style.display = corresponde ? "" : "none";
        if (corresponde) algumVisivel = true;
      });

      // Mensagem de "nenhum resultado" por seção
      let aviso = secao.querySelector(".sem-resultado");
      if (!termoNormalizado) {
        if (aviso) aviso.remove();
        return;
      }

      if (!algumVisivel) {
        if (!aviso) {
          aviso = document.createElement("p");
          aviso.className = "sem-resultado";
          aviso.textContent = "Nenhum resultado encontrado nesta categoria.";
          secao.querySelector(".cards")?.after(aviso);
        }
      } else if (aviso) {
        aviso.remove();
      }
    });

    // Atualiza links rápidos para as outras categorias
    if (linksRapidos) {
      linksRapidos.innerHTML = "";
      if (termoNormalizado) {
        PAGINAS_CATEGORIA
          .filter((p) => p.arquivo.toLowerCase() !== paginaAtual.toLowerCase())
          .forEach((p) => {
            const a = document.createElement("a");
            a.href = `${p.arquivo}?busca=${encodeURIComponent(termo)}`;
            a.textContent = `Buscar em ${p.nome} →`;
            linksRapidos.appendChild(a);
          });
      }
    }
  }

  // Faz os links do MENU PRINCIPAL (☰) também carregarem o termo pesquisado
  const linksMenu = document.querySelectorAll('#menu a[href]');
  function atualizarLinksMenu(termo) {
    linksMenu.forEach((a) => {
      const arquivoBase = a.getAttribute("href").split("?")[0];
      // Não mexe no link de Favoritos, que não tem pesquisa/filtro
      if (arquivoBase.toLowerCase() === "favoritos.html") return;

      if (termo) {
        a.setAttribute("href", `${arquivoBase}?busca=${encodeURIComponent(termo)}`);
      } else {
        a.setAttribute("href", arquivoBase);
      }
    });
  }

  input.addEventListener("input", () => {
    aplicarFiltro(input.value);
    atualizarLinksMenu(input.value.trim());
  });

  // Se veio de outra página com ?busca=..., aplica automaticamente
  const params = new URLSearchParams(location.search);
  const buscaUrl = params.get("busca");
  if (buscaUrl) {
    input.value = buscaUrl;
    aplicarFiltro(buscaUrl);
    atualizarLinksMenu(buscaUrl.trim());
  }
}
