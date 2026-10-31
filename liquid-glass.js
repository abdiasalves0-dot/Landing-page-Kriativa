/* ==========================================================================
   LIQUID GLASS — Motor Óptico de Refração Real, Interatividade e Mola
   Fundamentação:
   - Apple Developer Documentation: Liquid Glass / Adopting Liquid Glass
   - WWDC25 "Meet Liquid Glass": Lensing óptico com face central estável,
     bisel convexo (menisco) nas bordas e resposta contínua em tempo real.

   Arquitetura Técnica:
   1. Geometria Óptica (Menisco Convexo + Lei de Snell):
      - Distância assinada `sdRoundRect` + normal analítica suave `smoothCapsuleNormal`
        (C-infinito, sem descontinuidades no eixo medial).
      - Perfil de menisco `meniscusMag`: parte de 0 no contorno externo (evitando
        clampeamento de pixels fora da borda), atinge curvatura máxima no bisel
        e decai suavemente até 0 na face central plana.
   2. Campo Óptico Unificado para a Dock (`.lg-bar` + `.lg-indicator`):
      - Compõe em um único `<filter>` SVG tanto o menisco externo da barra quanto
        a lente convexa da cápsula ativa em sua posição `(x, scaleX, scaleY)` atual.
      - Elimina o bug de `backdrop-filter` aninhado do Chromium, permitindo que a
        lente ativa refrate diretamente os textos, linhas e gráficos da página.
      - Usa `<feImage>` para o mapa base da barra + `<feImage>` transladado em
        tempo real para a cápsula + `<feBlend mode="screen">` Não-Linear? Não:
        atualizamos a composição em canvas offscreen leve (`w x h`) ou combinamos
        as camadas para precisão exata de vetores R/G.
   ========================================================================== */
(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var REDUCED_TRANSPARENCY = window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    var CAN_REFRACT = /Chrome\//.test(navigator.userAgent) && !/OPR\/|Firefox/.test(navigator.userAgent);

    var defs = null;
    var uid = 0;

    function ensureDefs() {
        if (defs) return defs;
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
        defs = document.createElementNS(NS, 'defs');
        svg.appendChild(defs);
        document.body.appendChild(svg);
        return defs;
    }

    /* Distância assinada dentro de uma cápsula / retângulo arredondado (> 0 dentro) */
    function sdRoundRect(px, py, hw, hh, r) {
        var qx = Math.abs(px) - (hw - r);
        var qy = Math.abs(py) - (hh - r);
        var ox = Math.max(qx, 0);
        var oy = Math.max(qy, 0);
        var out = Math.sqrt(ox * ox + oy * oy);
        var inn = Math.min(Math.max(qx, qy), 0);
        return -(out + inn - r);
    }

    /* Normal externa analítica C-infinito sem saltos no eixo medial */
    function smoothCapsuleNormal(px, py, hw, hh, r) {
        var Lx = Math.max(0, hw - r);
        var Ly = Math.max(0, hh - r);
        var s = Math.max(8, r * 0.35);
        var sx = Lx > 0 ? Lx * Math.tanh(px / (Lx + s * 0.6)) : 0;
        var sy = Ly > 0 ? Ly * Math.tanh(py / (Ly + s * 0.6)) : 0;
        var dx = px - sx;
        var dy = py - sy;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        return [dx / len, dy / len];
    }

    /* Perfil óptico do bisel convexo (menisco):
       0 na borda externa (u=0), pico suave na zona curva do bisel, 0 na face central (u=1) */
    function meniscusMag(u, thickness) {
        if (u <= 0 || u >= 1) return 0;
        var s = Math.sin(Math.PI * Math.pow(u, 0.65));
        var decay = Math.pow(1 - u, 1.65);
        return thickness * s * decay;
    }

    /* Suavização separável 5-tap do campo vetorial float para eliminar serrilhado de 8 bits */
    function blurField(src, w, h, passes) {
        var tmp = new Float32Array(w * h);
        var dst = new Float32Array(src);
        for (var p = 0; p < passes; p++) {
            for (var y = 0; y < h; y++) {
                var row = y * w;
                for (var x = 0; x < w; x++) {
                    var xm2 = Math.max(0, x - 2), xm1 = Math.max(0, x - 1);
                    var xp1 = Math.min(w - 1, x + 1), xp2 = Math.min(w - 1, x + 2);
                    tmp[row + x] = (dst[row + xm2] + 4 * dst[row + xm1] + 6 * dst[row + x] + 4 * dst[row + xp1] + dst[row + xp2]) / 16;
                }
            }
            for (var y2 = 0; y2 < h; y2++) {
                var ym2 = Math.max(0, y2 - 2) * w, ym1 = Math.max(0, y2 - 1) * w;
                var y0 = y2 * w;
                var yp1 = Math.min(h - 1, y2 + 1) * w, yp2 = Math.min(h - 1, y2 + 2) * w;
                for (var x2 = 0; x2 < w; x2++) {
                    dst[y0 + x2] = (tmp[ym2 + x2] + 4 * tmp[ym1 + x2] + 6 * tmp[y0 + x2] + 4 * tmp[yp1 + x2] + tmp[yp2 + x2]) / 16;
                }
            }
        }
        return dst;
    }

    /* Pré-calcula o campo vetorial base (vx, vy) de um elemento .lg */
    function computeBaseField(w, h, radius, bezel, thickness, zoom) {
        var hw = w / 2;
        var hh = h / 2;
        var r = Math.min(radius, hw, hh);
        var bz = Math.min(bezel, Math.min(hw, hh) * 0.95);
        var vx = new Float32Array(w * h);
        var vy = new Float32Array(w * h);
        var dist = new Float32Array(w * h);

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var cx = x + 0.5 - hw;
                var cy = y + 0.5 - hh;
                var d = sdRoundRect(cx, cy, hw, hh, r);
                var k = y * w + x;
                dist[k] = d;
                if (d <= 0) continue;

                var ux = 0;
                var uy = 0;
                if (d < bz) {
                    var u = d / bz;
                    var mag = meniscusMag(u, thickness);
                    var n = smoothCapsuleNormal(cx, cy, hw, hh, r);
                    ux += -n[0] * mag;
                    uy += -n[1] * mag;
                }
                if (zoom > 0) {
                    var env = Math.sin(Math.min(d / (bz * 0.6), 1) * (Math.PI / 2));
                    ux += -Math.tanh(cx / (hw * 0.85)) * (hw * 0.45) * zoom * env;
                    uy += -Math.tanh(cy / (hh * 0.85)) * (hh * 0.65) * zoom * env;
                }
                vx[k] = ux;
                vy[k] = uy;
            }
        }

        vx = blurField(vx, w, h, 2);
        vy = blurField(vy, w, h, 2);
        return { vx: vx, vy: vy, dist: dist, w: w, h: h };
    }

    /* Codifica um campo vetorial ( opcionalmente somado à lente ativa da dock ) em PNG DataURL */
    function encodeFieldToMap(base, capsule, canvas, ctx, img) {
        var w = base.w;
        var h = base.h;
        var px = img.data;
        var bvx = base.vx;
        var bvy = base.vy;
        var dist = base.dist;
        var maxV = 24.0; // Escala óptica fixa para estabilidade durante animação da lente

        var hasCap = capsule && capsule.w > 0 && capsule.h > 0;
        var capX = hasCap ? capsule.x : 0;
        var capY = hasCap ? capsule.y : h / 2;
        var chw = hasCap ? capsule.w / 2 : 0;
        var chh = hasCap ? capsule.h / 2 : 0;
        var cr = hasCap ? Math.min(chw, chh) : 0;
        var cBezel = hasCap ? Math.min(18, chh * 0.9) : 0;
        var cThick = hasCap ? (14 + 4 * (capsule.lift || 0)) : 0;
        var cZoomX = hasCap ? (0.14 + 0.04 * (capsule.lift || 0)) : 0;
        var cZoomY = hasCap ? (0.20 + 0.05 * (capsule.lift || 0)) : 0;
        var xMin = hasCap ? Math.max(0, Math.floor(capX - chw - 4)) : 0;
        var xMax = hasCap ? Math.min(w - 1, Math.ceil(capX + chw + 4)) : -1;

        for (var y = 0; y < h; y++) {
            var row = y * w;
            var cy = y + 0.5 - capY;
            for (var x = 0; x < w; x++) {
                var k = row + x;
                var ux = bvx[k];
                var uy = bvy[k];

                if (hasCap && x >= xMin && x <= xMax && dist[k] > 0) {
                    var cx = (x + 0.5) - capX;
                    var cd = sdRoundRect(cx, cy, chw, chh, cr);
                    if (cd > 0) {
                        if (cd < cBezel) {
                            var cu = cd / cBezel;
                            var cmag = meniscusMag(cu, cThick);
                            var cn = smoothCapsuleNormal(cx, cy, chw, chh, cr);
                            ux += -cn[0] * cmag;
                            uy += -cn[1] * cmag;
                        }
                        var cEnv = Math.sin(Math.min(cd / 9, 1) * (Math.PI / 2));
                        ux += -cx * cZoomX * cEnv;
                        uy += -cy * cZoomY * cEnv;
                    }
                }

                // Clamping seguro para nunca amostrar fora da caixa [2, w-3] x [2, h-3]
                var sx = (x + 0.5) + ux;
                var sy = (y + 0.5) + uy;
                if (sx < 2) ux = 2 - (x + 0.5);
                if (sx > w - 2) ux = (w - 2) - (x + 0.5);
                if (sy < 2) uy = 2 - (y + 0.5);
                if (sy > h - 2) uy = (h - 2) - (y + 0.5);

                var o = k * 4;
                var rVal = Math.round(128 + 127 * (ux / maxV));
                var gVal = Math.round(128 + 127 * (uy / maxV));
                px[o]     = rVal < 0 ? 0 : (rVal > 255 ? 255 : rVal);
                px[o + 1] = gVal < 0 ? 0 : (gVal > 255 ? 255 : gVal);
                px[o + 2] = 128;
                px[o + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        return { url: canvas.toDataURL('image/png'), max: maxV };
    }

    function applyRefraction(el, capsule) {
        if (!CAN_REFRACT || REDUCED_TRANSPARENCY) return;
        var w = Math.round(el.offsetWidth);
        var h = Math.round(el.offsetHeight);
        if (!w || !h) return;

        var geomKey = w + 'x' + h;
        if (el._lgGeomKey !== geomKey) {
            el._lgGeomKey = geomKey;
            var cs = getComputedStyle(el);
            var radius = parseFloat(cs.getPropertyValue('--lg-radius')) || h / 2;
            var bezel = parseFloat(el.dataset.lgBezel) || Math.min(h * 0.45, 24);
            var thickness = parseFloat(el.dataset.lgThickness) || bezel;
            var zoom = parseFloat(el.dataset.lgZoom) || 0;
            el._lgBase = computeBaseField(w, h, radius, bezel, thickness, zoom);
            var c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            el._lgCanvas = c;
            el._lgCtx = c.getContext('2d');
            el._lgImg = el._lgCtx.createImageData(w, h);
        }

        var stateKey = geomKey + (capsule ? ('_' + Math.round(capsule.x * 2) + '_' + Math.round(capsule.w) + '_' + Math.round((capsule.lift || 0) * 20)) : '');
        if (el._lgStateKey === stateKey) return;
        el._lgStateKey = stateKey;

        var map = encodeFieldToMap(el._lgBase, capsule, el._lgCanvas, el._lgCtx, el._lgImg);
        var strength = parseFloat(el.dataset.lgStrength) || 1;

        var id = el._lgId || ('lg-f-' + (++uid));
        var filter = document.getElementById(id);
        if (!filter) {
            filter = document.createElementNS(NS, 'filter');
            filter.id = id;
            filter.setAttribute('filterUnits', 'objectBoundingBox');
            filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
            filter.setAttribute('color-interpolation-filters', 'sRGB');
            filter.setAttribute('x', '0%');
            filter.setAttribute('y', '0%');
            filter.setAttribute('width', '100%');
            filter.setAttribute('height', '100%');

            var image = document.createElementNS(NS, 'feImage');
            image.setAttribute('x', '0');
            image.setAttribute('y', '0');
            image.setAttribute('preserveAspectRatio', 'none');
            image.setAttribute('result', 'mapRaw');

            var blurMap = document.createElementNS(NS, 'feGaussianBlur');
            blurMap.setAttribute('in', 'mapRaw');
            blurMap.setAttribute('stdDeviation', '1.6');
            blurMap.setAttribute('edgeMode', 'duplicate');
            blurMap.setAttribute('result', 'map');

            var smoothSrc = document.createElementNS(NS, 'feGaussianBlur');
            smoothSrc.setAttribute('in', 'SourceGraphic');
            smoothSrc.setAttribute('stdDeviation', '0.4');
            smoothSrc.setAttribute('edgeMode', 'duplicate');
            smoothSrc.setAttribute('result', 'srcSmooth');

            var disp = document.createElementNS(NS, 'feDisplacementMap');
            disp.setAttribute('in', 'srcSmooth');
            disp.setAttribute('in2', 'map');
            disp.setAttribute('xChannelSelector', 'R');
            disp.setAttribute('yChannelSelector', 'G');

            filter.appendChild(image);
            filter.appendChild(blurMap);
            filter.appendChild(smoothSrc);
            filter.appendChild(disp);
            ensureDefs().appendChild(filter);

            el._lgFeImg = image;
            el._lgFeDisp = disp;
            el._lgId = id;
        }

        el._lgFeImg.setAttribute('href', map.url);
        el._lgFeImg.setAttribute('width', w);
        el._lgFeImg.setAttribute('height', h);
        el._lgFeDisp.setAttribute('scale', (map.max * 2 * strength).toFixed(2));

        el.style.setProperty(
            '--lg-bf',
            'url(#' + id + ') blur(var(--lg-blur)) saturate(var(--lg-sat)) brightness(var(--lg-bright))'
        );
    }

    /* ---------------------------------------------------------------------
       Interatividade (.interactive())
       --------------------------------------------------------------------- */
    function makeInteractive(el) {
        var glow = document.createElement('span');
        glow.className = 'lg-glow';
        glow.setAttribute('aria-hidden', 'true');
        el.insertBefore(glow, el.firstChild);

        el.addEventListener('pointermove', function (e) {
            var r = el.getBoundingClientRect();
            el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
        el.addEventListener('pointerdown', function () { el.classList.add('is-pressed'); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (name) {
            el.addEventListener(name, function () { el.classList.remove('is-pressed'); });
        });
    }

    function initGlass(root) {
        var items = (root || document).querySelectorAll('.lg');
        var ro = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.target._lgUpdateCap) en.target._lgUpdateCap();
                else applyRefraction(en.target);
            });
        }) : null;
        items.forEach(function (el) {
            if (!el._lgInteractiveDone && el.classList.contains('lg-interactive')) {
                el._lgInteractiveDone = true;
                makeInteractive(el);
            }
            applyRefraction(el);
            if (!el._lgObserved && ro) {
                el._lgObserved = true;
                ro.observe(el);
            }
        });
    }

    /* ---------------------------------------------------------------------
       Mola Física Contínua
       --------------------------------------------------------------------- */
    function Spring(value, stiffness, damping, eps) {
        this.x = value;
        this.v = 0;
        this.target = value;
        this.k = stiffness;
        this.c = damping;
        this.eps = eps;
    }
    Spring.prototype.step = function (dt) {
        var a = -this.k * (this.x - this.target) - this.c * this.v;
        this.v += a * dt;
        this.x += this.v * dt;
    };
    Spring.prototype.settled = function () {
        return Math.abs(this.x - this.target) < this.eps && Math.abs(this.v) < this.eps * 4;
    };
    Spring.prototype.snap = function () {
        this.x = this.target;
        this.v = 0;
    };

    /* ---------------------------------------------------------------------
       Dock (Tab Bar com Campo Óptico Unificado + Matched Geometry)
       --------------------------------------------------------------------- */
    function initDock() {
        var dock = document.querySelector('.lg-dock');
        if (!dock) return;
        var bar = dock.querySelector('.lg-bar');
        var tabs = dock.querySelector('.lg-tabs');
        var indicator = dock.querySelector('.lg-indicator');
        var links = tabs ? Array.prototype.slice.call(tabs.querySelectorAll('a')) : [];
        if (!bar || !tabs || !indicator || !links.length) return;

        var sections = links.map(function (a) {
            return document.querySelector(a.getAttribute('href'));
        });

        var active = 0;
        var hoverIdx = -1;
        var pressed = false;

        var sx = new Spring(0, 320, 24, 0.05);
        var lift = new Spring(0, 260, 20, 0.002);
        var running = false;
        var last = 0;

        function tabWidth() { return links[0].offsetWidth; }
        function indexX(i) { return i * tabWidth(); }

        function updateBarLens(scaleX, scaleY) {
            var tw = tabWidth();
            var th = indicator.offsetHeight || 44;
            var tabsLeft = tabs.offsetLeft;
            var capCenterX = tabsLeft + sx.x + tw / 2;
            var capCenterY = bar.offsetHeight / 2;
            applyRefraction(bar, {
                x: capCenterX,
                y: capCenterY,
                w: tw * scaleX,
                h: th * scaleY,
                lift: Math.max(0, lift.x)
            });
        }

        bar._lgUpdateCap = function () {
            render();
        };

        function render() {
            var v = Math.abs(sx.v);
            var stretch = Math.min(v / 4200, 0.18);
            var scaleX = (1 + 0.14 * lift.x) * (1 + stretch);
            var scaleY = (1 + 0.22 * lift.x) * (1 - stretch * 0.45);
            indicator.style.transform =
                'translate3d(' + sx.x.toFixed(2) + 'px,0,0) scale(' + scaleX.toFixed(4) + ',' + scaleY.toFixed(4) + ')';
            indicator.style.setProperty('--lg-lift', Math.max(0, lift.x).toFixed(3));
            updateBarLens(scaleX, scaleY);
        }

        function frame(now) {
            var dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            var sub = 2;
            for (var i = 0; i < sub; i++) {
                sx.step(dt / sub);
                lift.step(dt / sub);
            }
            render();
            if (sx.settled() && lift.settled()) {
                sx.snap();
                lift.snap();
                render();
                running = false;
                return;
            }
            requestAnimationFrame(frame);
        }

        function kick() {
            if (REDUCED_MOTION) {
                sx.snap();
                lift.snap();
                render();
                return;
            }
            if (running) return;
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
        }

        function sync() {
            var idx = hoverIdx >= 0 ? hoverIdx : active;
            sx.target = indexX(idx);
            lift.target = pressed ? 1.35 : (hoverIdx >= 0 ? 1 : 0);
            kick();
        }

        function setActive(i) {
            if (i === active && links[i].classList.contains('active')) return;
            active = i;
            links.forEach(function (a, n) { a.classList.toggle('active', n === i); });
            sync();
        }

        function indexFromPointer(e) {
            var r = tabs.getBoundingClientRect();
            var i = Math.floor((e.clientX - r.left) / tabWidth());
            return Math.max(0, Math.min(links.length - 1, i));
        }

        tabs.addEventListener('pointerenter', function (e) {
            hoverIdx = indexFromPointer(e);
            sync();
        });
        tabs.addEventListener('pointermove', function (e) {
            var i = indexFromPointer(e);
            if (i !== hoverIdx) {
                hoverIdx = i;
                sync();
            }
        });
        tabs.addEventListener('pointerleave', function () {
            hoverIdx = -1;
            pressed = false;
            sync();
        });
        tabs.addEventListener('pointerdown', function (e) {
            hoverIdx = indexFromPointer(e);
            pressed = true;
            sync();
        });
        tabs.addEventListener('pointerup', function () { pressed = false; sync(); });
        links.forEach(function (a, i) {
            a.addEventListener('pointerenter', function () {
                if (hoverIdx !== i) {
                    hoverIdx = i;
                    sync();
                }
            });
            a.addEventListener('click', function () { setActive(i); });
        });

        /* Sincronização com a rolagem + minimizar ao rolar para baixo */
        var lastY = window.scrollY;
        var ticking = false;

        function onScroll() {
            ticking = false;
            var y = window.scrollY;
            var dy = y - lastY;

            if (y > 140 && dy > 6) dock.classList.add('is-min');
            else if (dy < -6 || y < 80) dock.classList.remove('is-min');
            if (Math.abs(dy) > 6) lastY = y;

            var probe = window.innerHeight * 0.4;
            var found = -1;
            sections.forEach(function (s, i) {
                if (!s) return;
                var r = s.getBoundingClientRect();
                if (r.top <= probe && r.bottom > probe) found = i;
            });
            if (found >= 0) setActive(found);
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(onScroll);
            }
        }, { passive: true });

        window.addEventListener('resize', function () {
            sx.target = indexX(hoverIdx >= 0 ? hoverIdx : active);
            sx.snap();
            render();
        });

        links[0].classList.add('active');
        sx.target = indexX(0);
        sx.snap();
        render();
        onScroll();
    }

    function boot() {
        initGlass(document);
        initDock();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    window.LiquidGlass = {
        init: initGlass,
        apply: applyRefraction
    };
})();
