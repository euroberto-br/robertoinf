# roberto.inf.br — site pessoal e portfólio

Site pessoal de **Roberto Oliveira** — Desenvolvedor .NET Sênior, Líder Técnico e Professor.
100% estático: HTML + CSS + JavaScript puros, sem frameworks e sem build.

## Estrutura

```
site/
├── index.html          # página única (todas as seções)
├── CNAME               # domínio customizado para GitHub Pages
├── robots.txt
├── sitemap.xml
├── css/styles.css      # tokens de design + temas (escuro/claro/alto contraste)
├── js/i18n.js          # dicionário PT/EN (todas as strings do site)
├── js/main.js          # i18n, terminal, partículas, GitHub API, acessibilidade
├── assets/roberto.jpg  # foto otimizada (640px)
├── assets/favicon.svg
└── cv/                 # currículos PT e EN em PDF
```

## Recursos

- **Terminal interativo** no hero: `help`, `sobre`, `skills`, `projetos`, `contato`, `cv`, `whatsapp`, `en`, `tema`, easter eggs (`sudo`, `coffee`, `whoami`)…
- **Bilíngue PT/EN** com seletor no topo; preferência salva em `localStorage`. O botão "Baixar CV" troca o PDF conforme o idioma.
- **Repositórios do GitHub** carregados em tempo real de `api.github.com/users/euroberto-br/repos` (com fallback estático se a API falhar).
- **Acessibilidade (eMAG / WCAG 2.1 AA)**:
  - **Painel de acessibilidade** (botão flutuante ou `Alt+0`, ou `?a11y=1` na URL): tamanho do texto, espaço entre linhas e letras, fonte Atkinson Hyperlegible (baixa visão), alto contraste, tema claro, destacar links, guia de leitura, pausar animações
  - **Leitura em voz alta** (Web Speech API) com controle de velocidade — também via comando `ouvir` no terminal
  - **VLibras** (Governo Federal): tradução de qualquer texto para Libras pelo botão azul lateral
  - Atalhos: `Alt+1` conteúdo, `Alt+2` menu, `Alt+3` contato, `Alt+4` rodapé, `Alt+0` painel
  - Anunciador `aria-live` para mudanças de estado; navegação completa por teclado com foco visível e sem armadilhas; landmarks ARIA; `role="log"` no terminal
  - Seção "Declaração de acessibilidade" (#acessibilidade) documenta recursos e meta de conformidade
  - `prefers-reduced-motion` e `prefers-contrast: more` respeitados; skip links aparecem ao focar no mobile
- **SEO**: meta tags, Open Graph, JSON-LD (schema.org/Person), sitemap e robots.

## Publicação (GitHub Pages + domínio roberto.inf.br)

1. Crie o repositório `euroberto-br/roberto.inf.br` (ou `euroberto-br.github.io`) e envie o conteúdo desta pasta:
   ```bash
   cd site
   git init && git add . && git commit -m "Site pessoal roberto.inf.br"
   git branch -M main
   git remote add origin https://github.com/euroberto-br/roberto.inf.br.git
   git push -u origin main
   ```
2. No GitHub: **Settings → Pages → Deploy from a branch → main / root**.
3. O arquivo `CNAME` já aponta para `roberto.inf.br`. No provedor do domínio, configure:
   - `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - ou `CNAME` de `www` → `euroberto-br.github.io`
4. Em **Settings → Pages**, marque **Enforce HTTPS**.

Para testar localmente, basta abrir `index.html` no navegador (ou `python -m http.server` na pasta).
