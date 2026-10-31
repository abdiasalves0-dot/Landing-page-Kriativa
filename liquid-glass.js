/* ==========================================================================
   LIQUID GLASS — comportamento (refração, interatividade, mola, dock)
   Ver liquid-glass.css para o mapeamento SwiftUI -> web e as fontes.

   Componentes:
   - LiquidGlass: gera, por elemento .lg, um mapa de deslocamento do bisel
     (perfil convexo + lei de Snell, n = 1.5) e o aplica via backdrop-filter:url().
     Só Chromium renderiza a refração; os demais recebem blur + saturação + aro.
   - Spring: integrador de mola (movimento contínuo, com leve overshoot).
   - Dock: tab bar com seleção em "matched geometry", lente na interação,
     sincronização com a rolagem e minimização ao rolar para baixo.
   ========================================================================== */
(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var REDUCED_TRANSPARENCY = window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    var CAN_REFRACT = /Chrome\//.test(navigator.userAgent) && !/OPR\/|Firefox/.test(navigator.userAgent);

    /* ---------------------------------------------------------------------
       Refração
       --------------------------------------------------------------------- */
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

    /* Superfície convexa (squircle): altura h(t), t = distância normalizada da borda.
       A inclinação define o ângulo da normal; a lei de Snell dá o desvio do raio;
       o deslocamento lateral é a espessura do vidro vezes tan(desvio). */
    function refractionProfile(bezel, thickness, n, steps) {
        var table = new Float32Array(steps);
        var max = 0;
        var f = function (t) { return Math.pow(1 - Math.pow(1 - t, 4), 0.25); };
        for (var i = 0; i < steps; i++) {
            var t = i / (steps - 1);
            var e = 0.002;
            var a = Math.max(t - e, 0);
            var b = Math.min(t + e, 1);
            var slope = (f(b) - f(a)) / (b - a);
            var theta = Math.atan(slope * thickness / bezel);
            var phi = Math.asin(Math.sin(theta) / n);
            var mag = Math.tan(theta - phi) * thickness;
            table[i] = mag;
            if (mag > max) max = mag;
        }
        return { table: table, max: max };
    }

    function sign(v) { return v < 0 ? -1 : 1; }

    /* Mapa de deslocamento: R/G codificam o vetor (128 = neutro).
       Dois termos somados, ambos apontando para dentro do vidro:
       1) dobra da borda (perfil convexo + Snell): forte junto ao contorno curvo;
       2) ampliacao interna (zoom): a lente amplia o que esta sob ela, como a lupa
          da referencia. O vetor de zoom satura com tanh para nao explodir em
          formas largas. */
    function buildMap(w, h, radius, bezel, thickness, zoom) {
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        var img = ctx.createImageData(w, h);
        var px = img.data;
        var steps = 256;
        var prof = refractionProfile(bezel, thickness, 1.5, steps);
        var hw = w / 2;
        var hh = h / 2;
        var r = Math.min(radius, hw, hh);
        var vx = new Float32Array(w * h);
        var vy = new Float32Array(w * h);
        var maxV = 0.0001;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var cx = x + 0.5 - hw;
                var cy = y + 0.5 - hh;
                var qx = Math.abs(cx) - (hw - r);
                var qy = Math.abs(cy) - (hh - r);
                var ox = Math.max(qx, 0);
                var oy = Math.max(qy, 0);
                var outer = Math.sqrt(ox * ox + oy * oy);
                var d = -(outer + Math.min(Math.max(qx, qy), 0) - r);
                var k = y * w + x;
                if (d < 0) continue;

                var ux = 0;
                var uy = 0;
                if (d < bezel) {
                    var mag = prof.table[Math.min(steps - 1, Math.floor((d / bezel) * (steps - 1)))];
                    var nx;
                    var ny;
                    if (outer > 0) {
                        nx = (ox / outer) * sign(cx);
                        ny = (oy / outer) * sign(cy);
                    } else if (qx > qy) {
                        nx = sign(cx);
                        ny = 0;
                    } else {
                        nx = 0;
                        ny = sign(cy);
                    }
                    ux = -nx * mag;
                    uy = -ny * mag;
                }
                if (zoom) {
                    ux += -Math.tanh(cx / hh) * zoom;
                    uy += -Math.tanh(cy / hh) * zoom;
                }
                vx[k] = ux;
                vy[k] = uy;
                var m = Math.max(Math.abs(ux), Math.abs(uy));
                if (m > maxV) maxV = m;
            }
        }

        for (var j = 0; j < w * h; j++) {
            var o = j * 4;
            px[o] = 128 + 127 * (vx[j] / maxV);
            px[o + 1] = 128 + 127 * (vy[j] / maxV);
            px[o + 2] = 128;
            px[o + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        return { url: canvas.toDataURL('image/png'), max: maxV };
    }

    function applyRefraction(el) {
        if (!CAN_REFRACT || REDUCED_TRANSPARENCY) return;
        var w = Math.round(el.offsetWidth);
        var h = Math.round(el.offsetHeight);
        if (!w || !h) return;
        var key = w + 'x' + h;
        if (el._lgKey === key) return;
        el._lgKey = key;

        var cs = getComputedStyle(el);
        var radius = parseFloat(cs.getPropertyValue('--lg-radius')) || h / 2;
        var bezel = parseFloat(el.dataset.lgBezel) || Math.min(h * 0.45, 24);
        var thickness = parseFloat(el.dataset.lgThickness) || bezel * 1.3;
        var zoom = parseFloat(el.dataset.lgZoom) || 0;
        var strength = parseFloat(el.dataset.lgStrength) || 1;
        var map = buildMap(w, h, radius, bezel, thickness, zoom);

        var id = el._lgId || ('lg-f-' + (++uid));
        var filter = document.getElementById(id);
        if (!filter) {
            filter = document.createElementNS(NS, 'filter');
            filter.id = id;
            ensureDefs().appendChild(filter);
        }
        while (filter.firstChild) filter.removeChild(filter.firstChild);
        filter.setAttribute('filterUnits', 'userSpaceOnUse');
        filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        filter.setAttribute('x', '0');
        filter.setAttribute('y', '0');
        filter.setAttribute('width', w);
        filter.setAttribute('height', h);

        var image = document.createElementNS(NS, 'feImage');
        image.setAttribute('href', map.url);
        image.setAttribute('x', '0');
        image.setAttribute('y', '0');
        image.setAttribute('width', w);
        image.setAttribute('height', h);
        image.setAttribute('preserveAspectRatio', 'none');
        image.setAttribute('result', 'map');

        var disp = document.createElementNS(NS, 'feDisplacementMap');
        disp.setAttribute('in', 'SourceGraphic');
        disp.setAttribute('in2', 'map');
        disp.setAttribute('scale', (map.max * 2 * strength).toFixed(2));
        disp.setAttribute('xChannelSelector', 'R');
        disp.setAttribute('yChannelSelector', 'G');

        filter.appendChild(image);
        filter.appendChild(disp);

        el._lgId = id;
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
            entries.forEach(function (en) { applyRefraction(en.target); });
        }) : null;
        items.forEach(function (el) {
            if (el._lgReady) return;
            el._lgReady = true;
            if (el.classList.contains('lg-interactive')) makeInteractive(el);
            applyRefraction(el);
            if (ro) ro.observe(el);
        });
    }

    /* ---------------------------------------------------------------------
       Mola
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
       Dock
       --------------------------------------------------------------------- */
    function initDock() {
        var dock = document.querySelector('.lg-dock');
        if (!dock) return;
        var tabs = dock.querySelector('.lg-tabs');
        var indicator = dock.querySelector('.lg-indicator');
        var links = tabs ? Array.prototype.slice.call(tabs.querySelectorAll('a')) : [];
        if (!tabs || !indicator || !links.length) return;

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

        function render() {
            var v = Math.abs(sx.v);
            var stretch = Math.min(v / 4200, 0.18);
            var scaleX = (1 + 0.14 * lift.x) * (1 + stretch);
            var scaleY = (1 + 0.24 * lift.x) * (1 - stretch * 0.45);
            indicator.style.transform =
                'translate3d(' + sx.x.toFixed(2) + 'px,0,0) scale(' + scaleX.toFixed(4) + ',' + scaleY.toFixed(4) + ')';
            indicator.style.setProperty('--lg-lift', Math.max(0, lift.x).toFixed(3));
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
        tabs.addEventListener('pointerdown', function () { pressed = true; sync(); });
        tabs.addEventListener('pointerup', function () { pressed = false; sync(); });
        links.forEach(function (a, i) {
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

    window.LiquidGlass = { init: initGlass };
})();

