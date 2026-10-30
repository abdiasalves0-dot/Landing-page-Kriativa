"""Gera o catálogo O Boticário e o plano de campanha em 2 atos no design Kriativa (HTML -> PDF)."""
import math
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
CSS = open(os.path.join(AQUI, "kriativa-print.css"), encoding="utf-8").read()

# Logo oficial da Kriativa (SVG/1Prancheta 1.svg), recortado no viewBox da marca.
_svg = open(os.path.join(RAIZ, "SVG", "1Prancheta 1.svg"), encoding="utf-8").read()
_shapes = "".join(re.findall(r"<(?:path|rect|circle)[^>]*/>", _svg)).replace('class="cls-1" ', "")
def logo(h="9mm"):
    return f'<svg class="logo" style="height:{h}" viewBox="72 298 610 172" xmlns="http://www.w3.org/2000/svg" aria-label="Kriativa">{_shapes}</svg>'

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Playfair+Display:ital,wght@1,700&display=swap" rel="stylesheet">'

def doc(title, pages):
    return f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>{title}</title>{FONTS}<style>{CSS}</style></head><body>{"".join(pages)}</body></html>'

def brl(v):
    s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s

def top(meta):
    return f'<div class="top z">{logo()}<span class="top-meta">{meta}</span></div>'

def foot(left, n):
    return f'<div class="foot z"><span>{left}</span><span>{n:02d}</span></div>'

# --- Produtos: preços consultados em boticario.com.br em 14/10/2026 -----------------
# (linha, nome, tipo, tamanho, descrição, preço de tabela, oferta no site ou None)
PERFUMES = [
    ("Malbec", "Malbec Eau de Parfum", "Eau de Parfum", "90 ml", "O mais concentrado da linha Malbec: amadeirado com ingredientes exclusivos e 12h de intensidade.", 279.90, None),
    ("Zaad", "Zaad Eau de Parfum", "Eau de Parfum", "95 ml", "Fragrância masculina energética, inspirada no espírito de viagem.", 349.90, None),
    ("Her Code", "Her Code Eau de Parfum", "Eau de Parfum", "50 ml", "Feminino marcante, criado para mulheres livres em busca do próprio prazer.", 254.90, None),
    ("Lily", "L'eau de Lily", "Desodorante Colônia", "75 ml", "A assinatura floral de Lily com frescor e delicadeza, ideal para o dia.", 229.90, 194.90),
    ("Floratta", "Floratta Red", "Desodorante Colônia", "75 ml", "Flor da maçã de Vermont e a doçura do fruto: atitude e romantismo.", 174.90, None),
    ("Egeo", "Egeo Original", "Desodorante Colônia", "90 ml", "Fragrância divertida e versátil para acompanhar qualquer rotina.", 164.90, 135.90),
]
HIDRATANTES = [
    ("Nativa SPA", "Loção Hidratante Ameixa Negra", "Loção corporal", "400 ml", "Hidratação desodorante com o perfume icônico da ameixa da linha Nativa SPA.", 89.90, None),
    ("Cuide-se Bem", "Loção Hidratante Deleite", "Loção corporal", "400 ml", "Textura leve e fragrância gourmand suave para o uso diário.", 78.90, None),
    ("Malbec", "Loção Hidratante Corporal", "Loção corporal", "200 ml", "Hidratação com a assinatura amadeirada de Malbec na pele.", 67.90, None),
    ("Her Code", "Loção Hidratante Clímax", "Loção corporal", "200 ml", "Prolonga a fragrância de Her Code com pele macia e perfumada.", 67.90, None),
    ("Glamour", "Loção Hidratante Intense", "Loção corporal", "200 ml", "Lançamento: a versão intensa de Glamour em hidratante corporal.", 69.90, None),
    ("Nativa SPA", "Loção Hidratante Quinoa FPS 15", "Loção corporal", "200 ml", "Hidrata e protege: loção corporal com fator de proteção solar 15.", 69.90, None),
]
SABONETES = [
    ("Lily", "Sabonete em Barra Perfumado", "Barra", "2 × 90 g", "O floral de Lily no ritual do banho, em barras perfumadas.", 57.90, None),
    ("Nativa SPA", "Sabonete Líquido Ameixa", "Líquido", "250 ml", "Sabonete líquido perfumado com a fragrância de ameixa.", 59.90, None),
    ("Boticollection", "Kit Sabonetes Perfumados", "Barra", "80 g cada", "Kit de sabonetes com os clássicos da perfumaria Boticollection.", 54.90, None),
    ("Nativa SPA", "Sabonetes em Barra Ameixa Plum", "Barra", "3 × 90 g", "Trio de barras com o perfume de ameixa, ótimo para presente.", 42.90, None),
    ("Cuide-se Bem", "Sabonetes em Barra Pessegura", "Barra", "4 × 80 g", "Quatro barras com fragrância frutada de pêssego.", 38.90, None),
    ("Malbec", "Sabonete em Barra", "Barra", "2 × 80 g", "A fragrância amadeirada de Malbec em sabonete em barra.", 31.90, None),
]
CATS = [
    ("perfumes", "Perfumes", "assinaturas que ficam.", PERFUMES, "Eau de parfum e desodorantes colônia das linhas mais desejadas da marca."),
    ("hidratantes", "Hidratantes", "a pele como vitrine.", HIDRATANTES, "Loções corporais que hidratam e prolongam a fragrância ao longo do dia."),
    ("sabonetes", "Sabonetes", "o ritual começa aqui.", SABONETES, "Barras e líquidos perfumados: entrada de baixo ticket e alto giro."),
]

# Ícones de linha no estilo dos ícones de serviço da Kriativa (28px, traço fino)
MARKS = {
    "perfumes": '<svg class="mark" viewBox="0 0 28 28"><rect x="7" y="10" width="14" height="16" rx="2"/><rect x="11" y="4" width="6" height="6"/><path d="M14 2v2"/></svg>',
    "hidratantes": '<svg class="mark" viewBox="0 0 28 28"><rect x="8" y="9" width="12" height="17" rx="3"/><path d="M11 9V5h6v4M17 5h4"/></svg>',
    "sabonetes": '<svg class="mark" viewBox="0 0 28 28"><rect x="3" y="9" width="22" height="13" rx="6"/><circle cx="21" cy="6" r="2"/><circle cx="16" cy="4" r="1.2"/></svg>',
}

def avg(items):
    return sum(p[5] for p in items) / len(items)

# ======================================================================================
# CATÁLOGO
# ======================================================================================
FOTOS = {
    "perfumes": ["perf-malbec", "perf-zaad", "perf-hercode", "perf-lily", "perf-floratta", "perf-egeo"],
    "hidratantes": ["hid-nativa-ameixa", "hid-deleite", "hid-malbec", "hid-hercode", "hid-glamour", "hid-quinoa"],
    "sabonetes": ["sab-lily", "sab-nativa-liquido", "sab-boticollection", "sab-nativa-plum", "sab-pessegura", "sab-malbec"],
}

def card(i, key, p):
    linha, nome, tipo, tam, desc, preco, oferta = p
    foto = FOTOS[key][i - 1]
    promo = f'<div class="pc-offer">Oferta no site · R$ {brl(oferta)}</div>' if oferta else '<div class="pc-offer" style="visibility:hidden">—</div>'
    return f'''<div class="pcard">
<div class="pc-photo"><img src="fotos/{foto}.jpg" alt="{nome}"><span class="pc-num">{i:02d}</span></div>
<div class="pc-body"><div class="line">{linha}</div><div class="name">{nome}</div><div class="pc-spec">{tipo} · {tam}</div></div>
<div class="pc-price"><span class="pc-cur">R$</span><span class="pc-val">{brl(preco)}</span></div>{promo}</div>'''

def catalogo():
    pages = []
    pages.append(f'''<section class="page"><div class="grid-bg"></div><div class="glow" style="right:-40mm;top:40mm"></div>
<div class="top z">{logo("11mm")}<span class="top-meta">Edição Outubro · 2026</span></div>
<div class="z" style="margin-top:62mm">
  <p class="eyebrow">[ Catálogo de produtos ]</p>
  <h1 class="h-display" style="font-size:60pt;margin-top:8mm">Seleção<span class="h-serif" style="font-size:52pt;margin-top:2mm">O Boticário.</span></h1>
  <p class="lead" style="max-width:120mm;margin-top:12mm">Uma curadoria Kriativa com os produtos de maior desejo da marca em três categorias, com preço de tabela e ofertas vigentes.</p>
  <div style="display:flex;gap:3mm;margin-top:10mm"><span class="pill">Perfumes</span><span class="pill">Hidratantes</span><span class="pill">Sabonetes</span></div>
</div>
<div class="foot z"><span>Kriativa · Design Studio &amp; Software House</span><span>Brasília · BR</span></div></section>''')

    rows = "".join(
        f'<div style="padding:8mm 7mm"><span class="num">0{n+1}</span><div class="h-section" style="font-size:20pt;margin-top:6mm">{t}</div>'
        f'<p class="body" style="margin-top:3mm">{d}</p><div class="rule" style="margin:6mm 0 4mm"></div>'
        f'<div style="display:flex;justify-content:space-between"><span class="small">{len(items)} produtos</span><span class="small">a partir de R$ {brl(min(p[5] for p in items))}</span></div></div>'
        for n, (k, t, s, items, d) in enumerate(CATS))
    pages.append(f'''<section class="page alt">{top("Catálogo · Índice")}
<div class="z" style="margin-top:18mm"><p class="eyebrow">[ Curadoria ]</p>
<h2 class="h-section" style="margin-top:6mm">Três categorias.<span class="h-serif">um só padrão.</span></h2>
<p class="lead" style="max-width:140mm;margin-top:8mm">Selecionamos 18 produtos que combinam reconhecimento de marca, boa avaliação dos clientes e faixas de preço complementares: do sabonete de entrada ao eau de parfum de alto ticket.</p></div>
<div class="hgrid z" style="grid-template-columns:repeat(3,1fr);margin-top:14mm">{rows}</div>
<div class="z" style="margin-top:12mm;display:grid;grid-template-columns:repeat(3,1fr);gap:8mm">
  <div><span class="bar" style="display:block;margin-bottom:3mm"></span><div class="h-display" style="font-size:26pt">18</div><p class="small" style="margin-top:2mm;letter-spacing:.1em;text-transform:uppercase">Produtos selecionados</p></div>
  <div><span class="bar" style="display:block;margin-bottom:3mm"></span><div class="h-display" style="font-size:26pt">R$ {brl(avg(PERFUMES))[:-3]}</div><p class="small" style="margin-top:2mm;letter-spacing:.1em;text-transform:uppercase">Ticket médio perfumes</p></div>
  <div><span class="bar" style="display:block;margin-bottom:3mm"></span><div class="h-display" style="font-size:26pt">R$ {brl(avg(SABONETES))[:-3]}</div><p class="small" style="margin-top:2mm;letter-spacing:.1em;text-transform:uppercase">Ticket médio sabonetes</p></div>
</div>
<p class="small z" style="margin-top:10mm;max-width:150mm">Preços consultados em boticario.com.br em 14/10/2026. Valores e ofertas podem mudar sem aviso; confirme antes de cada venda.</p>
{foot("Seleção O Boticário · Kriativa", 2)}</section>''')

    for n, (key, titulo, serif, items, d) in enumerate(CATS):
        cards = "".join(card(i + 1, key, p) for i, p in enumerate(items))
        pages.append(f'''<section class="page">{top(f"Catálogo · {titulo}")}
<div class="z" style="margin-top:7mm;display:flex;justify-content:space-between;align-items:flex-end">
<div><p class="eyebrow">[ Categoria 0{n+1} ]</p><h2 class="h-section" style="margin-top:5mm">{titulo}<span class="h-serif">{serif}</span></h2></div>
<p class="body" style="max-width:62mm;text-align:right">{d}</p></div>
<div class="pgrid z">{cards}</div>
{foot("Seleção O Boticário · Kriativa", n + 3)}</section>''')

    pages.append(f'''<section class="page alt"><div class="grid-bg"></div>
{top("Catálogo · Contato")}
<div class="z" style="margin-top:60mm"><p class="eyebrow">[ Vamos trabalhar juntos ]</p>
<h2 class="h-display" style="font-size:44pt;margin-top:8mm">Pronto para<span class="h-serif" style="font-size:40pt;margin-top:2mm">vender mais?</span></h2>
<p class="lead" style="max-width:120mm;margin-top:10mm">Este catálogo faz parte de uma operação comercial desenhada pela Kriativa: vitrine, campanha e leitura de dados para escalar o produto certo.</p>
<div style="margin-top:12mm;display:flex;gap:3mm"><span class="pill solid">kriaativadesign@gmail.com</span><span class="pill">Brasília · BR</span></div></div>
<div class="z" style="margin-top:auto;padding-top:10mm"><p class="small" style="max-width:160mm">O Boticário e os nomes das linhas citadas são marcas de seus respectivos titulares. Este material é uma curadoria comercial da Kriativa e não é uma publicação oficial da marca. Preços de tabela, ofertas e imagens dos produtos conforme boticario.com.br em 14/10/2026.</p></div>
{foot("Kriativa · Feito com intenção.", 6)}</section>''')
    return doc("Catálogo Seleção O Boticário — Kriativa", pages)

# ======================================================================================
# PLANO DE CAMPANHA EM 2 ATOS
# ======================================================================================
CREDITO = 800.0         # crédito O Boticário da cliente, exclusivo para produtos (preço de tabela)
MIDIA_A1 = 200.0        # anúncios do Ato 1, investimento da Kriativa
MIDIA_A2 = 200.0        # anúncios do Ato 2, investimento da Kriativa
DIAS_A1 = 14
SPLIT_A2 = (0.60, 0.25, 0.15)

# Kit de teste do Ato 1: (produto, preço de tabela, unidades) — cerca de ⅓ do crédito por categoria
KIT_A1 = {
    "perfumes": [("Egeo Original 90 ml (vitrine)", 164.90, 1)],
    "hidratantes": [("Her Code Loção Clímax 200 ml", 67.90, 2), ("Malbec Loção Corporal 200 ml", 67.90, 2)],
    "sabonetes": [("Malbec Sabonete em Barra 2×80 g", 31.90, 3), ("Cuide-se Bem Pessegura 4×80 g", 38.90, 3), ("Nativa SPA Ameixa Plum 3×90 g", 42.90, 1)],
}

def kit_valor(key):
    return sum(p * u for _, p, u in KIT_A1[key])

def kit_unid(key):
    return sum(u for _, _, u in KIT_A1[key])

def plano():
    pages = []
    terco = CREDITO / 3
    midia_cat = MIDIA_A1 / 3
    valor_tot = sum(kit_valor(k) for k in KIT_A1)
    reserva = CREDITO - valor_tot
    pages.append(f'''<section class="page"><div class="grid-bg"></div><div class="glow" style="right:-30mm;top:30mm"></div>
<div class="top z">{logo("11mm")}<span class="top-meta">Plano de campanha · 2026</span></div>
<div class="z" style="margin-top:50mm"><p class="eyebrow">[ Estratégia comercial ]</p>
<h1 class="h-display" style="font-size:54pt;margin-top:8mm">Operação<span class="h-serif" style="font-size:48pt;margin-top:2mm">em dois atos.</span></h1>
<p class="lead" style="max-width:130mm;margin-top:12mm">Plano de campanha de vendas para transformar o crédito de R$ {brl(CREDITO)[:-3]} em produtos O Boticário em faturamento: validar com dados no Ato 1 e reinvestir no produto vencedor no Ato 2.</p>
<div class="hgrid" style="grid-template-columns:1fr 1fr 1fr;margin-top:14mm;max-width:170mm">
  <div style="padding:6mm"><span class="num">CRÉDITO EM PRODUTOS</span><div class="h-section" style="font-size:18pt;margin-top:4mm">R$ {brl(CREDITO)[:-3]}</div><p class="body" style="margin-top:2mm">⅓ sabonete · ⅓ hidratante · ⅓ perfume</p></div>
  <div style="padding:6mm"><span class="num">ANÚNCIOS</span><div class="h-section" style="font-size:18pt;margin-top:4mm">Kriativa</div><p class="body" style="margin-top:2mm">Investimento da agência na campanha</p></div>
  <div style="padding:6mm"><span class="num">2 ATOS</span><div class="h-section" style="font-size:18pt;margin-top:4mm">Testar · Escalar</div><p class="body" style="margin-top:2mm">Recompra concentrada no mais vendido</p></div>
</div></div>
<div class="foot z"><span>Kriativa · Design Studio &amp; Software House</span><span>Confidencial</span></div></section>''')

    # Página 2 — tese
    pages.append(f'''<section class="page alt">{top("Plano · Visão geral")}
<div class="z" style="margin-top:14mm"><p class="eyebrow">[ A tese ]</p>
<h2 class="h-section" style="margin-top:6mm">Não adivinhe.<span class="h-serif">deixe o mercado escolher.</span></h2>
<p class="lead" style="max-width:150mm;margin-top:8mm">O crédito de R$ {brl(CREDITO)[:-3]} é capital sem custo: cada produto vendido vira receita. Em vez de gastar tudo em uma categoria, o plano faz um teste justo entre as três e depois coloca o dinheiro que voltou no produto que provou que vende.</p></div>
<div class="hgrid z" style="grid-template-columns:repeat(3,1fr);margin-top:12mm">
  <div style="padding:7mm 6mm"><span class="num">01</span><div class="h-section" style="font-size:15pt;margin-top:5mm">Comprar igual</div><p class="body" style="margin-top:3mm">Cerca de R$ {brl(terco)} do crédito por categoria e R$ {brl(midia_cat)} de anúncio para cada uma.</p></div>
  <div style="padding:7mm 6mm"><span class="num">02</span><div class="h-section" style="font-size:15pt;margin-top:5mm">Medir tudo</div><p class="body" style="margin-top:3mm">{DIAS_A1} dias de campanha com leitura em D7 e D{DIAS_A1}: pedidos, giro, receita e retorno do anúncio.</p></div>
  <div style="padding:7mm 6mm"><span class="num">03</span><div class="h-section" style="font-size:15pt;margin-top:5mm">Reinvestir no vencedor</div><p class="body" style="margin-top:3mm">No Ato 2, 60% do valor recomprado vai para a categoria campeã.</p></div>
</div>
<div class="z" style="margin-top:12mm"><p class="eyebrow" style="margin-bottom:4mm">[ Linha do tempo ]</p>
<table><tr><th>Semana</th><th>Fase</th><th>Entregas</th></tr>
<tr><td><strong>S0</strong></td><td>Preparação</td><td>Compra do kit de teste com o crédito, fotos e vídeos dos produtos, catálogo no WhatsApp Business e link rastreado por categoria.</td></tr>
<tr><td><strong>S1–S2</strong></td><td>Ato 1 · Validação</td><td>Um anúncio por categoria com o mesmo orçamento diário; ajuste de criativos em D7, leitura final em D{DIAS_A1}.</td></tr>
<tr><td><strong>S3</strong></td><td>Decisão</td><td>Índice de Validação, escolha da categoria vencedora e recompra com o dinheiro das vendas.</td></tr>
<tr><td><strong>S3–S6</strong></td><td>Ato 2 · Escala</td><td>Anúncio concentrado no vencedor, remarketing para quem conversou e combos para subir o ticket.</td></tr></table></div>
{foot("Plano de campanha · Kriativa", 2)}</section>''')

    # Página 3 — Ato 1 compra
    linhas = ""
    for key, titulo, s, items, d in CATS:
        for i, (nome, preco, u) in enumerate(KIT_A1[key]):
            cat = f"<strong>{titulo}</strong>" if i == 0 else ""
            linhas += f'<tr><td>{cat}</td><td>{nome}</td><td class="v">{u}</td><td class="v">R$ {brl(preco)}</td><td class="v">R$ {brl(preco*u)}</td></tr>'
    linhas += f'<tr class="total"><td>Total</td><td>{sum(kit_unid(k) for k in KIT_A1)} unidades</td><td class="v"></td><td class="v"></td><td class="v">R$ {brl(valor_tot)}</td></tr>'
    pages.append(f'''<section class="page">{top("Plano · Ato 01")}
<div class="z" style="margin-top:8mm;display:flex;justify-content:space-between;align-items:flex-end">
<div><p class="eyebrow">[ Ato 01 · Semanas 1 e 2 ]</p><h2 class="h-section" style="margin-top:6mm">Validação<span class="h-serif">um terço para cada.</span></h2></div>
<div class="h-display" style="font-size:60pt;color:var(--graphite-light)">01</div></div>
<div class="hgrid z" style="grid-template-columns:repeat(4,1fr);margin-top:6mm">
  <div style="padding:5mm"><span class="num">CRÉDITO</span><div class="h-display" style="font-size:18pt;margin-top:3mm">R$ {brl(CREDITO)[:-3]}</div><p class="small" style="margin-top:1mm">≈ R$ {brl(terco)} por categoria</p></div>
  <div style="padding:5mm"><span class="num">ANÚNCIOS</span><div class="h-display" style="font-size:18pt;margin-top:3mm">R$ {brl(MIDIA_A1)[:-3]}</div><p class="small" style="margin-top:1mm">Kriativa · ≈ R$ {brl(midia_cat/DIAS_A1)}/dia por categoria</p></div>
  <div style="padding:5mm"><span class="num">DURAÇÃO</span><div class="h-display" style="font-size:18pt;margin-top:3mm">{DIAS_A1} dias</div><p class="small" style="margin-top:1mm">Leitura em D7 e D{DIAS_A1}</p></div>
  <div style="padding:5mm"><span class="num">RESERVA</span><div class="h-display" style="font-size:18pt;margin-top:3mm">R$ {brl(reserva)[:-3]}</div><p class="small" style="margin-top:1mm">Crédito para repor quem esgotar primeiro</p></div>
</div>
<div class="z" style="margin-top:6mm"><p class="eyebrow" style="margin-bottom:2mm">[ Kit de teste · preço de tabela ]</p>
<table class="tight"><tr><th>Categoria</th><th>Produto</th><th class="v">Un.</th><th class="v">Preço</th><th class="v">Total</th></tr>{linhas}</table>
<p class="small" style="margin-top:2.5mm">Compra feita com o crédito pelo preço de tabela de boticario.com.br. Se houver oferta ou condição de revenda, o mesmo crédito compra mais unidades.</p></div>
<div class="hgrid z" style="grid-template-columns:repeat(2,1fr);margin-top:5mm">
  <div style="padding:4.5mm 6mm"><span class="num">PERFUME: VITRINE + ENCOMENDA</span><p class="body" style="margin-top:3mm">Um perfume consome quase o terço inteiro. Compre <strong>1 unidade de vitrine</strong> para fotos, vídeos e prova, e venda os demais <strong>sob encomenda</strong>, com pagamento via Pix antes do pedido. Cada encomenda conta como venda no teste.</p></div>
  <div style="padding:4.5mm 6mm"><span class="num">REGRAS DO TESTE</span><ul class="body" style="margin:3mm 0 0 4mm;line-height:1.8">
    <li>Um anúncio por categoria, mesmo orçamento diário.</li><li>Mesmo público, mesma condição de entrega.</li><li>Criativos de produto, uso e prova social.</li><li>Não mover verba entre categorias antes do D{DIAS_A1}.</li></ul></div>
</div>
<div class="hgrid z" style="grid-template-columns:1fr;margin-top:4mm;margin-bottom:4mm"><div style="padding:4mm 6mm"><p class="body"><strong>A conta do Ato 1.</strong> Vendendo o kit inteiro pelo preço de tabela entram R$ {brl(valor_tot)} no caixa, e ainda sobram R$ {brl(reserva)} de crédito. Como o produto veio do crédito e o anúncio é investimento da Kriativa, todo esse valor é receita da operação.</p></div></div>
{foot("Plano de campanha · Kriativa", 3)}</section>''')

    # Página 4 — métricas e decisão
    pages.append(f'''<section class="page alt">{top("Plano · Leitura de dados")}
<div class="z" style="margin-top:12mm"><p class="eyebrow">[ Como escolher o vencedor ]</p>
<h2 class="h-section" style="margin-top:6mm">Índice de<span class="h-serif">validação.</span></h2>
<p class="lead" style="max-width:150mm;margin-top:8mm">"Mais vendido" não é só quem vendeu mais unidades: um sabonete gira mais rápido que um perfume. Por isso o vencedor sai de um índice que pondera giro, receita e retorno do anúncio.</p></div>
<div class="hgrid z" style="grid-template-columns:repeat(3,1fr);margin-top:10mm">
  <div style="padding:7mm 6mm"><div class="h-display" style="font-size:36pt">40%</div><div class="bar" style="margin:4mm 0 3mm"></div><p class="eyebrow" style="color:var(--white)">Giro</p><p class="body" style="margin-top:2mm">Unidades vendidas (incluindo encomendas) sobre unidades compradas.</p></div>
  <div style="padding:7mm 6mm"><div class="h-display" style="font-size:36pt">30%</div><div class="bar" style="margin:4mm 0 3mm"></div><p class="eyebrow" style="color:var(--white)">Receita</p><p class="body" style="margin-top:2mm">Valor vendido em reais por categoria.</p></div>
  <div style="padding:7mm 6mm"><div class="h-display" style="font-size:36pt">30%</div><div class="bar" style="margin:4mm 0 3mm"></div><p class="eyebrow" style="color:var(--white)">ROAS</p><p class="body" style="margin-top:2mm">Receita gerada por real investido em anúncio.</p></div>
</div>
<div class="z" style="margin-top:10mm"><p class="eyebrow" style="margin-bottom:4mm">[ Painel de acompanhamento ]</p>
<table><tr><th>Métrica</th><th>Fórmula</th><th>Quando olhar</th></tr>
<tr><td><strong>Pedidos</strong></td><td>Vendas e encomendas por categoria</td><td>Diário</td></tr>
<tr><td><strong>Giro</strong></td><td>Unidades vendidas ÷ unidades compradas</td><td>D7 · D{DIAS_A1}</td></tr>
<tr><td><strong>Custo por venda (CPA)</strong></td><td>Verba de anúncio ÷ pedidos</td><td>D7 · D{DIAS_A1}</td></tr>
<tr><td><strong>ROAS</strong></td><td>Receita ÷ verba de anúncio</td><td>D7 · D{DIAS_A1}</td></tr>
<tr><td><strong>Conversas no WhatsApp</strong></td><td>Cliques no anúncio que viraram conversa</td><td>Diário</td></tr>
<tr><td><strong>Taxa de conversão</strong></td><td>Pedidos ÷ conversas</td><td>D7 · D{DIAS_A1}</td></tr></table></div>
<div class="hgrid z" style="grid-template-columns:1fr;margin-top:8mm"><div style="padding:5mm 6mm"><p class="body"><strong>Regra de decisão.</strong> Os volumes do teste são pequenos: só declare vencedor com no mínimo 10 pedidos somando as três categorias. Se duas ficarem a menos de 10% uma da outra no índice, vence a de maior receita em reais.</p></div></div>
{foot("Plano de campanha · Kriativa", 4)}</section>''')

    # Página 5 — Ato 2
    a, b, c = SPLIT_A2
    base2 = valor_tot + reserva
    cen = ""
    for key, titulo, s, items, d in CATS:
        kit = KIT_A1[key]
        preco_med = sum(p for _, p, _ in kit) / len(kit)
        u = math.floor(base2 * a / preco_med)
        cen += f'<tr><td><strong>{titulo}</strong></td><td class="v">R$ {brl(base2*a)}</td><td class="v">{u}</td><td class="v">R$ {brl(u*preco_med)}</td></tr>'
    pages.append(f'''<section class="page">{top("Plano · Ato 02")}
<div class="z" style="margin-top:12mm;display:flex;justify-content:space-between;align-items:flex-end">
<div><p class="eyebrow">[ Ato 02 · Semanas 3 a 6 ]</p><h2 class="h-section" style="margin-top:6mm">Escala<span class="h-serif">peso no que vende.</span></h2></div>
<div class="h-display" style="font-size:60pt;color:var(--graphite-light)">02</div></div>
<p class="lead z" style="max-width:150mm;margin-top:8mm">O Ato 2 roda com o que voltou do Ato 1: até R$ {brl(base2)} somando vendas e crédito restante. A recompra concentra peso no vencedor, e a Kriativa mantém mais R$ {brl(MIDIA_A2)[:-3]} em anúncios.</p>
<div class="hgrid z" style="grid-template-columns:0.5fr 0.27fr 0.23fr;margin-top:10mm">
  <div style="padding:6mm;background:var(--white)"><div class="h-display" style="font-size:30pt;color:var(--bg)">{int(a*100)}%</div><p class="eyebrow" style="color:var(--bg);margin-top:3mm">1º lugar</p><p class="body" style="color:#3a3a3a;margin-top:1mm">R$ {brl(base2*a)} em produtos</p></div>
  <div style="padding:6mm"><div class="h-display" style="font-size:22pt">{int(b*100)}%</div><p class="eyebrow" style="margin-top:3mm">2º lugar</p><p class="body" style="margin-top:1mm">R$ {brl(base2*b)}</p></div>
  <div style="padding:6mm"><div class="h-display" style="font-size:18pt">{int(c*100)}%</div><p class="eyebrow" style="margin-top:3mm">3º lugar</p><p class="body" style="margin-top:1mm">R$ {brl(base2*c)}</p></div>
</div>
<p class="small z" style="margin-top:3mm">Anúncios da Kriativa: R$ {brl(MIDIA_A2*a)} no vencedor, R$ {brl(MIDIA_A2*b)} no 2º e R$ {brl(MIDIA_A2*c)} no 3º lugar.</p>
<div class="z" style="margin-top:9mm"><p class="eyebrow" style="margin-bottom:4mm">[ Cenários: se a categoria vencer ]</p>
<table><tr><th>Vencedora</th><th class="v">Produtos ({int(a*100)}%)</th><th class="v">Unidades</th><th class="v">Receita potencial</th></tr>{cen}</table>
<p class="small" style="margin-top:2.5mm">Unidades calculadas com os produtos do kit de teste, pelo preço de tabela. Com o lucro do Ato 2, o ciclo se repete com valor maior.</p></div>
<div class="hgrid z" style="grid-template-columns:repeat(2,1fr);margin-top:8mm">
  <div style="padding:6mm"><span class="num">ACELERADORES</span><ul class="body" style="margin:4mm 0 0 4mm;line-height:1.9">
    <li>Remarketing para quem conversou e não comprou.</li><li>Pedir indicação a quem comprou no Ato 1.</li><li>Subir a verba aos poucos enquanto o ROAS se mantiver.</li></ul></div>
  <div style="padding:6mm"><span class="num">TICKET MÉDIO</span><ul class="body" style="margin:4mm 0 0 4mm;line-height:1.9">
    <li>Combos: perfume + hidratante da mesma linha.</li><li>Sabonete como brinde ou upsell de entrada.</li><li>Kits de presente para datas sazonais.</li></ul></div>
</div>
{foot("Plano de campanha · Kriativa", 5)}</section>''')

    # Página 6 — fechamento
    pages.append(f'''<section class="page alt"><div class="grid-bg"></div>
{top("Plano · Próximos passos")}
<div class="z" style="margin-top:16mm"><p class="eyebrow">[ Próximos passos ]</p>
<h2 class="h-section" style="margin-top:6mm">Do plano<span class="h-serif">à primeira venda.</span></h2></div>
<div class="z" style="margin-top:10mm">
<table><tr><th style="width:14mm">#</th><th>Ação</th><th>Responsável</th></tr>
<tr><td>01</td><td><strong>Usar o crédito</strong> de R$ {brl(CREDITO)[:-3]} no kit de teste: ⅓ sabonete, ⅓ hidratante, ⅓ perfume.</td><td>Cliente</td></tr>
<tr><td>02</td><td><strong>Fotos e vídeos</strong> dos produtos recebidos.</td><td>Cliente + Kriativa</td></tr>
<tr><td>03</td><td><strong>Criar os anúncios</strong> por categoria e investir R$ {brl(MIDIA_A1)[:-3]} em mídia.</td><td>Kriativa</td></tr>
<tr><td>04</td><td><strong>Configurar rastreio</strong>: links por categoria e catálogo no WhatsApp.</td><td>Kriativa</td></tr>
<tr><td>05</td><td><strong>Rodar o Ato 1</strong> por {DIAS_A1} dias com leitura em D7 e D{DIAS_A1}.</td><td>Kriativa</td></tr>
<tr><td>06</td><td><strong>Decidir e recomprar</strong> para o Ato 2.</td><td>Ambos</td></tr></table></div>
<div class="z" style="margin-top:auto;padding-top:12mm"><h3 class="h-display" style="font-size:34pt">Pronto para<span class="h-serif" style="font-size:30pt;margin-top:1mm">escalar com dados?</span></h3>
<div style="margin-top:8mm;display:flex;gap:3mm"><span class="pill solid">kriaativadesign@gmail.com</span><span class="pill">Brasília · BR</span></div>
<p class="small" style="margin-top:8mm;max-width:165mm">Vendas e receitas são projeções de planejamento, não garantia de resultado. Preços de referência: boticario.com.br, 14/10/2026. O Boticário é marca de seus respectivos titulares.</p></div>
{foot("Kriativa · Feito com intenção.", 6)}</section>''')
    return doc("Plano de Campanha em 2 Atos — Kriativa", pages)


if __name__ == "__main__":
    open(os.path.join(AQUI, "catalogo.html"), "w", encoding="utf-8").write(catalogo())
    open(os.path.join(AQUI, "plano.html"), "w", encoding="utf-8").write(plano())
    print("ok")
