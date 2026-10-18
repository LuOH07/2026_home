/* ==========================================================================
   4.js —— 增量效果层
   --------------------------------------------------------------------------
   和 4.css 配对：1.js / 2.js / 3.js / index.html 的正文标记一行都不动，
   凡是“页面主时间轴之外的小效果”都往这个文件里加。
   加载顺序是 1.js → 2.js → 3.js → 4.js（见 index.html），
   所以这里能读到前面三段脚本已经建好的 DOM 和全局变量（如 window.__home）。

   本文件当前只做一件事：给 text-1 这句话里的某几个词套上样式钩子
     “Compact”   → <span class="compact">   （白字 + #467aae / 20px 圆角卡片，见 4.css）
     “Beginning” → <span class="beginning"> （单独放大到 128px，见 4.css）
   其余文字（“ is only the”）原样保留，一个字符都不改。

   ★ 为什么在 JS 里包、而不是改 index.html：
     index.html 是“文案文件”，保持它一个字都不动；
     这一层只是给某些词加样式钩子，属于效果层的事。
     想撤掉某个效果：把下面 TARGETS 里对应的那一行删掉即可
     （4.css 里那条规则随之失效；留着也无害）。
   ★ 不会重复包：该词已经在某个 span 里时直接跳过，刷新 / 重跑都安全。
   ========================================================================== */

(function () {
    "use strict";

    var HOST = ".text-1";                  /* 这些话所在的那一句 */
    var TARGETS = [
        { word: "compact",   cls: "compact" },     /* → 4.css 的 .text-1 .compact   */
        { word: "beginning", cls: "beginning" }    /* → 4.css 的 .text-1 .beginning */
    ];

    /* 把 host 里【第一次出现的整词 word】包成 <span class="cls">，
       前后的文字各自留在纯文本节点里（空格、<br> 都不动）。
       ★ 匹配不区分大小写：index.html 里写 “Beginning” 还是 “BEGINNING” 都能命中，
         并且 span 里保留原文的大小写（不会擅自改成大/小写）。
       找不到 / 已经包过就什么也不做。 */
    function wrapWord(host, word, cls) {
        if (host.querySelector("." + cls)) return;

        var nodes = Array.prototype.slice.call(host.childNodes);
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.nodeType !== Node.TEXT_NODE) continue;

            var text = node.nodeValue;
            var at = text.toLowerCase().indexOf(word.toLowerCase());
            if (at < 0) continue;

            /* 整词判定：紧挨着的字符不能是字母 / 数字 / 下划线 / 连字符 */
            var wordChar = /[A-Za-z0-9_-]/;
            if (at > 0 && wordChar.test(text.charAt(at - 1))) continue;
            var next = text.charAt(at + word.length);
            if (next && wordChar.test(next)) continue;

            var span = document.createElement("span");
            span.className = cls;
            span.textContent = text.substr(at, word.length);   /* ← 原样保留大小写 */

            var before = document.createTextNode(text.slice(0, at));
            var after = document.createTextNode(text.slice(at + word.length));

            host.insertBefore(before, node);
            host.insertBefore(span, node);
            host.insertBefore(after, node);
            host.removeChild(node);
            return;
        }
    }

    function apply() {
        var host = document.querySelector(HOST);
        if (!host) return;
        TARGETS.forEach(function (t) { wrapWord(host, t.word, t.cls); });
    }

    apply();

    /* ======================================================================
       BEGINNING 的出场动效（纯滚轮驱动，能随滚轮倒放）
       ----------------------------------------------------------------------
       时间轴（都用 1.js 已有的进度单位，秒 = 进度 / window.__home.rate）：
         A ──淡入── H ──────── 停留 ──────── B ──淡出── E
               └ 整句淡入         └ ★ 这段里演 BEGINNING
       所以顺序正好是：
         ① A→H：整句（Compact is only the）淡入，BEGINNING 藏起来（opacity 0）
         ② H 之后：BEGINNING 原地出现，视觉大小 304px，同时淡入
         ③ 接着缩小回 4.css 里的字号（现在是 152px），停在它本来该在的位置
       做法：每帧读 window.__home.cur（1.js 已算好的进度），只改 .beginning 的
             inline transform / opacity —— 布局归 CSS，时间归 1.js，这里只做插值。

       ★ 为什么用 transform: scale 而不是改 font-size：
         1.js 的 layout() 会量一次 offsetHeight 来定“钉在画面 40% 处”的位置。
         如果直接把字号从 152px 改到 304px，那一瞬间量到的高度会大一倍多，
         整句会被顶高（而且缩小之后也不会自己修正）。
         transform 不参与布局，offsetHeight 永远是 4.css 里的 152px 版本，
         所以什么时候量、量多少次都不会影响 1.js 的定位。
       ★ transform-origin: left top（在 4.css 里）：
         左对齐 + 左/上边界固定 → 放大时往「右下」长，不会压到上面那行字；
         缩到 scale(1) 时正好回到它本来的大小和位置。
       ====================================================================== */

    var PEAK_PX    = 304;   /* ← 一出现时的视觉大小（要求 304px） */
    var APPEAR_SEC = 0.35;  /* ← 出现（淡入）用多久 */
    var SHRINK_SEC = 1.15;  /* ← 从 304px 缩回本来的大小用多久 */
    var MIN_FIT    = 0.35;  /* 万一这句在画面上停留得太短，最短压到原来的 35% */

    var host = document.querySelector(HOST);
    var word = host && host.querySelector(".beginning");
    if (!host || !word || !window.__home) return;

    /* 基准字号取自 4.css（改 --beginning-size，这里自动跟着变） */
    var basePx = parseFloat(getComputedStyle(word).fontSize) || 152;
    /* 304px 相对基准字号的倍数（152px → 2 倍） */
    var peakScale = Math.max(1, PEAK_PX / basePx);

    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

    /* 当前这一帧写进 inline 的值；null = 交还给 CSS */
    var curOpacity = null, curScale = null;

    function itemOf(el) {
        var items = window.__home.items || [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].el === el) return items[i];   /* resize 会重建 items，所以每帧找 */
        }
        return null;
    }

    function paint(opacity, scale) {
        if (opacity !== curOpacity) {
            word.style.opacity = opacity === null ? "" : String(opacity);
            curOpacity = opacity;
        }
        if (scale !== curScale) {
            word.style.transform = scale === null ? "" : "scale(" + scale.toFixed(4) + ")";
            curScale = scale;
        }
    }

    var lastCur = null;

    function frame() {
        requestAnimationFrame(frame);

        var home = window.__home;
        if (!home || home.cur === lastCur) return;   /* 页面没在动就不做事 */
        lastCur = home.cur;

        var it = itemOf(host);
        var rate = home.rate;
        if (!it || !(rate > 0)) return;

        var t = (home.cur - it.H) / rate;             /* 相对「整句淡入结束」的秒数 */
        var avail = (it.E - it.H) / rate;             /* 这一句还能在画面上待多久 */
        var total = APPEAR_SEC + SHRINK_SEC;
        var k = Math.min(1, Math.max(MIN_FIT, avail / total));
        var a = APPEAR_SEC * k, s = SHRINK_SEC * k;

        if (t <= 0) {
            paint(0, peakScale);                      /* 整句淡入期间：还看不见 */
        } else if (t < a) {
            paint(t / a, peakScale);                  /* 原地 304px 淡入 */
        } else if (t < a + s) {
            var u = easeOut((t - a) / s);             /* 304px → 本来的字号 */
            paint(1, peakScale + (1 - peakScale) * u);
        } else {
            paint(null, null);                        /* 归位：样式全部交还 4.css */
        }
    }

    word.style.opacity = "0";                         /* 先藏住，免得第一帧闪一下 */
    word.style.transform = "scale(" + peakScale.toFixed(4) + ")";
    curOpacity = 0;
    curScale = peakScale;
    lastCur = null;

    window.addEventListener("resize", function () {
        basePx = parseFloat(getComputedStyle(word).fontSize) || basePx;
        peakScale = Math.max(1, PEAK_PX / basePx);
        lastCur = null;          /* 下一帧重新算一次 */
    });

    requestAnimationFrame(frame);
})();
