/* ==========================================================================
   4.js —— 增量效果层
   --------------------------------------------------------------------------
   和 4.css 配对：1.js / 2.js / 3.js / index.html 的正文标记一行都不动，
   凡是“页面主时间轴之外的小效果”都往这个文件里加。
   加载顺序是 1.js → 2.js → 3.js → 4.js（见 index.html），
   所以这里能读到前面三段脚本已经建好的 DOM 和全局变量（如 window.__home）。

   本文件当前做三件事：
    ① 给 text-1 / text-3 这两句里的某几个词套上样式钩子
        text-1：
         “Compact”   → <span class="compact">   （白字 + #467aae / 20px 圆角卡片，见 4.css）
         “Beginning” → <span class="beginning"> （单独放大到 152px，见 4.css）
        text-3：
         “harder”    → <span class="harder">    （先和其他字一样大，整句完全出现后才长大并挤开旁边的字）
         “Familiar”  → <span class="familiar">  （单独放大到 128px，见 4.css）
         “Host”      → <span class="host">      （单独放大到 128px，见 4.css）
        text-6：
         “Not”       → <span class="not">       （单独放大到 128px，见 4.css）
        text-11：
         “Small” 的 S / “TnpB-based” 的 T / “Innovative” 的 I /
         “Nuclease” 的 N / “Genome” 的 G
                     → <span class="init-11 init-s"> 这样的五个小盒子
                       （首字母单独放大成“白心 + #465e11 描边”，见 4.css）
        text-13：
         “BUILD”     → <span class="build13">   （单独放大，字号旋钮 --build13-size 见 4.css）
      其余文字（text-1 的 “ is only the”、text-3 的 “Genome editing gets … beyond”、
      text-6 的 “But small does … mean flexible.”、text-11 里除这五个字母以外的所有字、
      text-13 的 “Establish the Editing Tools”）
      原样保留，一个字符都不改。
    ② 驱动 “BEGINNING” 的出场（等 ico7 箭头的渐入走完 → 弹出并淡入 → 缩回原大小），
      并把“缩完”那一刻报给 3.js —— ico6 要等它演完才出现。
    ③ 让 text-3 的 “harder” 在整句【完全出现】之后，用 GROW_SEC 秒从“和其他字一样大”
       长到 --text3-harder-size（真改 font-size，所以会把旁边的字挤开），同样由滚轮逐帧驱动、
       可以倒放；具体见下面 “text-3：harder 的撑开 + Familiar Host 的 TNT 爆炸” 那一段。
    ④ 等 harder 长完，把 “Familiar Host” 当成一块 Minecraft 的 TNT：先快速地上下跳两下、
       闪白，然后炸开 —— 一片灰白（十几层灰，没有彩色）的像素块从中间往外铺开，
       再一块块消失。整段一直演到 E（= 这句淡出结束），所以最后一块像素消失的那一刻
       正好跟文字淡出同时收尾。
       （像素云 / 白光都由 4.js 生成，跳动幅度旋钮 --tnt-bob 在 4.css，
         同样由滚轮逐帧驱动、可倒放。）

   ★ 为什么在 JS 里包、而不是改 index.html：
     index.html 是“文案文件”，保持它一个字都不动；
     这一层只是给某些词加样式钩子，属于效果层的事。
     想撤掉某个效果：把下面 TARGETS / PARTS3 里对应的那一行删掉即可
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

    /* text-3 那句（“Genome editing gets harder beyond Familiar Host”）里单独放大的词。
       ① “harder”：它不在 familiar-host 那个组里，自己一个 <span class="harder">，
          字号旋钮在 4.css 的 .text-3 .harder（--text3-harder-size），
          只影响这一个词，句子其余部分还是 44px。
       ② “Familiar” / “Host”：各自包成独立的 <span>，各有一个自己的类，
          所以可以分别调（现在是都放大到 128px，见 4.css 的 .text-3 .familiar / .host）。
          两个词外面再包一层 .familiar-host，只负责“不被拆到两行”；
       其余文字（“Genome editing gets … beyond”）原样保留。
       ★ 两段互不干扰：先包哪个都行 —— wrapWord 只认纯文本节点，
         包完 harder 之后剩下的 “ beyond Familiar Host” 仍是纯文本，wrapPhrase 照样能命中。 */
    var HOST3 = ".text-3";
    var TARGETS3 = [
        { word: "harder",   cls: "harder" }        /* → 4.css 的 .text-3 .harder   */
    ];
    var GROUP3 = "familiar-host";
    var PARTS3 = [
        { word: "familiar", cls: "familiar" },     /* → 4.css 的 .text-3 .familiar */
        { word: "host",     cls: "host" }          /* → 4.css 的 .text-3 .host     */
    ];

    /* text-6 那句（“But small does Not mean flexible.”）里的 “Not”：
       单个词，包一层自己的类就够了（不需要外框锁行），
       样式在 4.css 的 .text-6 .not（单独放大到 128px）。
       其余文字原样保留。 */
    var HOST6 = ".text-6";
    var TARGETS6 = [
        { word: "not", cls: "not" }                /* → 4.css 的 .text-6 .not */
    ];

    /* text-11 那句（“Small TnpB-based Innovative Nuclease toolkit for bacterial Genome editing.”）
       里五个词的【首字母】单独放大成“白心 + #465e11 描边”（样式见 4.css 的 .text-11 .init-11）：
         Small 的 S / TnpB-based 的 T / Innovative 的 I / Nuclease 的 N / Genome 的 G
       ① word 写的是【整词】：拿它来定位（避免误伤别处同名的字母），
          真正包进 span 的只有这个词的第一个字符；
       ② 每个字母还各带一个自己的类（init-s / init-t / ……）：想单独调某一个（比如 I 要高一点）
          就在 4.css 里用它自己的类写一条，只影响那一个字母；
       ③ 这句里其余的字一个都不动（仍是 44px / #324561 / 默认字体）。
       ★ 顺序无所谓：wrapInitial 只认纯文本节点，包完一个词，剩下的文字照样能继续匹配。 */
    var HOST11 = ".text-11";
    var INITIALS11 = [
        { word: "Small",      cls: "init-s" },     /* → S */
        { word: "TnpB-based", cls: "init-t" },     /* → T */
        { word: "Innovative", cls: "init-i" },     /* → I */
        { word: "Nuclease",   cls: "init-n" },     /* → N */
        { word: "Genome",     cls: "init-g" }      /* → G */
    ];

    /* text-13 那句（“BUILD<br>Establish the Editing Tools”）里的 “BUILD”：
       单独包一层，只为了给它一个自己的字号旋钮（--build13-size，见 4.css）。
       ★ 这句的 .text-box 是 flex column，包出来的 <span> 会变成一个独立的 flex item，
         和原来那个匿名块一模一样，所以排版不变 —— 只是 “BUILD” 这个块能单独放大。
       ★ 原文是大写，wrapWord 不区分大小写、并且原样保留大小写，所以不会变成 “Build”。 */
    var HOST13 = ".text-13";
    var TARGETS13 = [
        { word: "build", cls: "build13" }          /* → 4.css 的 .text-13 .build13 */
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

    /* 把 host 里【第一次出现的整个短语】包成：
         <span class="familiar-host"><span class="familiar">Familiar</span> <span class="host">Host</span></span>
       外面那层组只负责 white-space: nowrap —— 这两个词永远待在同一行，
       不会被拆成上下两行（不然 128px 之后一行只放得下一个词，看着像阶梯）；
       每个词自己那层才是真正调字号的地方（4.css）。
       ★ 和 wrapWord 一样不区分大小写，span 里保留原文的写法；
         词与词之间的空白（哪怕多个空格）原样搬进去。
       找不到 / 已经包过就什么也不做。 */
    function wrapPhrase(host, groupCls, parts) {
        if (host.querySelector("." + groupCls)) return;

        var phrase = parts.map(function (p) { return p.word; }).join(" ");
        var wordChar = /[A-Za-z0-9_-]/;
        var nodes = Array.prototype.slice.call(host.childNodes);

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.nodeType !== Node.TEXT_NODE) continue;

            var text = node.nodeValue;
            var at = text.toLowerCase().indexOf(phrase.toLowerCase());
            if (at < 0) continue;

            /* 首尾整词判定：短语前后不能紧挨着字母 / 数字 / 下划线 / 连字符 */
            if (at > 0 && wordChar.test(text.charAt(at - 1))) continue;
            var next = text.charAt(at + phrase.length);
            if (next && wordChar.test(next)) continue;

            var group = document.createElement("span");
            group.className = groupCls;

            /* 按空白切开：词 / 空白 交替出现，词交给对应那层 span，空白原样保留 */
            var tokens = text.substr(at, phrase.length).split(/(\s+)/);
            var k = 0;
            tokens.forEach(function (tok) {
                if (!tok) return;
                if (/^\s+$/.test(tok)) {
                    group.appendChild(document.createTextNode(tok));
                    return;
                }
                var owner = parts[k++] || {};
                var span = document.createElement("span");
                span.className = owner.cls || "";
                span.textContent = tok;                      /* ← 原样保留大小写 */
                group.appendChild(span);
            });

            var before = document.createTextNode(text.slice(0, at));
            var after = document.createTextNode(text.slice(at + phrase.length));

            host.insertBefore(before, node);
            host.insertBefore(group, node);
            host.insertBefore(after, node);
            host.removeChild(node);
            return;
        }
    }

    /* 把 host 里【第一次出现的整词 word】的【第一个字符】包成
         <span class="init-word"><span class="init-11 cls">S</span>mall</span>
       —— 首字母一层（放大 + 白心绿边，见 4.css），整个词外面再套一层外框。
       外框是 inline-block + nowrap，只干一件事：不让这个词在首字母和后面的小字之间断开。
       为什么需要它：首字母是 inline-block（原子行内元素），浏览器【允许】在原子行内元素
       前后换行 —— 不加外框时 “Nuclease” 会被拆成 “N” 掉在上一行末尾、“uclease” 落到
       下一行开头，看着像拼错了。
       ★ 词以外所有的文字（空格、标点、别的词）都留在纯文本节点里，一个字符都不动。
       ★ 和 wrapWord 一样：不区分大小写地找词，span 里保留原文的写法；
         整词判定照旧（前面的字符不能是字母 / 数字 / 下划线 / 连字符），
         免得 “Genome” 匹配到 “genomes” 之类。
       找不到 / 已经包过就什么也不做。 */
    function wrapInitial(host, word, cls) {
        if (host.querySelector("." + cls)) return;

        var wordChar = /[A-Za-z0-9_-]/;
        var nodes = Array.prototype.slice.call(host.childNodes);

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.nodeType !== Node.TEXT_NODE) continue;

            var text = node.nodeValue;
            var at = text.toLowerCase().indexOf(word.toLowerCase());
            if (at < 0) continue;

            /* 首尾整词判定 */
            if (at > 0 && wordChar.test(text.charAt(at - 1))) continue;
            var next = text.charAt(at + word.length);
            if (next && wordChar.test(next)) continue;

            var span = document.createElement("span");
            span.className = "init-11 " + cls;
            span.textContent = text.charAt(at);          /* ← 只包第一个字符（原样保留大小写） */

            /* 整词外框：首字母 + 这个词剩下的字母（装进同一个盒子，就不会在中间断开） */
            var group = document.createElement("span");
            group.className = "init-word";
            group.appendChild(span);
            group.appendChild(document.createTextNode(text.slice(at + 1, at + word.length)));

            var before = document.createTextNode(text.slice(0, at));
            var after  = document.createTextNode(text.slice(at + word.length));

            host.insertBefore(before, node);
            host.insertBefore(group, node);
            host.insertBefore(after, node);
            host.removeChild(node);
            return;
        }
    }

    function apply() {
        var host1 = document.querySelector(HOST);
        if (host1) TARGETS.forEach(function (t) { wrapWord(host1, t.word, t.cls); });

        var host3 = document.querySelector(HOST3);
        if (host3) {
            /* 先包 “harder”（单个词），再包 “Familiar Host” 那个组；
               两步都只动纯文本节点，顺序反过来也能跑（见上面 TARGETS3 的注释）。 */
            TARGETS3.forEach(function (t) { wrapWord(host3, t.word, t.cls); });
            wrapPhrase(host3, GROUP3, PARTS3);
        }

        var host6 = document.querySelector(HOST6);
        if (host6) TARGETS6.forEach(function (t) { wrapWord(host6, t.word, t.cls); });

        /* text-11：五个词的第一个字母各自包一层（白心 + #465e11 描边，见 4.css） */
        var host11 = document.querySelector(HOST11);
        if (host11) INITIALS11.forEach(function (t) { wrapInitial(host11, t.word, t.cls); });

        /* text-13：“BUILD” 单独包一层，字号旋钮在 4.css 的 .text-13 .build13 */
        var host13 = document.querySelector(HOST13);
        if (host13) TARGETS13.forEach(function (t) { wrapWord(host13, t.word, t.cls); });
    }

    apply();

    /* ======================================================================
       text-3：harder 的“撑开” + “Familiar Host”的 TNT 爆炸（纯滚轮驱动，能随滚轮倒放）
       ----------------------------------------------------------------------
       时间轴（和 1.js 同一套进度单位，秒 = 进度 / window.__home.rate）：
          A ──淡入── H ─────────── 停留 ─────────── B ──淡出── E
                     │
                     └─ 从这里起 GROW_SEC 秒内：44px（和其他字同字号）→ --text3-harder-size

       ① A→H（整句淡入）：harder 和其他文字一样大，所以看不出它是个大字；
       ② 进度到 H（整句“完全出现”）之后才开始长大，用 GROW_SEC 秒长到目标字号；
       ③ 长大的时候会把附近的字【真挤开】：同一行的字往右推、后面的行往下推。
          所以这里必须改 font-size（真重排），不能学 BEGINNING 用 transform: scale ——
          scale 不参与布局，旁边的字不会让位，那就不是“挤开”了；
       ④ 长完就一直保持目标字号，直到随整句一起淡出（B→E）。
       ⑤ 再往后（= harder 长完那一刻），把 “Familiar Host” 当成一块 TNT：
          先明显地上下跳两下 → 闪两下白 → 炸开（一层白光 + 一片灰白像素云）→ 逐渐消散。
          像素是一块块陆续出现、又一块块消失的（每块自己的 --pa / --pd 决定），
          整段从这一刻一直演到 E（= 这句淡出结束），所以最后一块消失的瞬间
          正好和 1.js 的淡出同时发生。
       ★ 每一帧都从 cur 重新算一遍字号，所以往上滚它就会倒着缩回去，和页面完全同步。
       ★ 不引入新的字号：最终值仍然只由 4.css 的 --text3-harder-size 那一个数决定。
       ★ 只在“这一句的窗口内”写 inline font-size，窗口外一律清成空串 ——
         这样 1.js 的 layout() 量到的永远是“最终字号”那一版高度。
         （.text-3 是 position: absolute，自己长高不会推别的句子，
           只是这一句的内容在锚线上往下长一点，看起来就是“被撑开”。）
       ====================================================================== */

    var harderHost = document.querySelector(HOST3);
    var harder = harderHost && harderHost.querySelector(".harder");

    /* ---- TNT 爆炸要用的三层壳（都在 .familiar-host 里造好，之后只改样式）----
       .tnt-body ：包着两个词的行内外壳 —— 白闪 / 消散只作用在它身上，
                   这样炸开的像素云不会被文字的透明度一起带走；
       .tnt-flash：炸开瞬间的一层白色闪光；
       .tnt-cloud：像素云（一堆灰白 / 灰的方块），像参考图那样铺开。
       ★ 已经造过就不再造：刷新 / 重跑都安全。
       ★ 两个词没包出来（.familiar / .host 不在）就不造，免得把整句都包进去。 */
    var tntGroup = harderHost && harderHost.querySelector("." + GROUP3);
    var tntBody = null, tntFlash = null, tntCloud = null;

    if (tntGroup &&
        tntGroup.querySelector(".familiar") &&
        tntGroup.querySelector(".host") &&
        !tntGroup.querySelector(".tnt-cloud")) {

        tntBody = document.createElement("span");
        tntBody.className = "tnt-body";
        while (tntGroup.firstChild) tntBody.appendChild(tntGroup.firstChild);
        tntGroup.appendChild(tntBody);

        tntFlash = document.createElement("span");
        tntFlash.className = "tnt-flash";
        tntFlash.setAttribute("aria-hidden", "true");
        tntGroup.appendChild(tntFlash);

        tntCloud = document.createElement("span");
        tntCloud.className = "tnt-cloud";
        tntCloud.setAttribute("aria-hidden", "true");
        tntGroup.appendChild(tntCloud);

        /* 像素云：只有灰白两色（不要绿），但灰的层次拉得很开，从近白到深灰十几种。
           ★ 位置不再局限在句子周围：目标点铺满整个窗口（横向按 vw、纵向按 vh），
             每块从【爆炸中心】出发飞向自己的目标点 —— 所以是“由中心向四周扩散”，
             而且外围是随机参差的，不是规整的一圈。
           ★ 每个块自己带“何时出现（--pa）/ 何时消失（--pd）/ 飞到哪里（--pdx/--pdy）”，
             这些都在 CSS 里用 --tnt-s 一条变量算出来，
             所以每帧只写一次 --tnt-s，不用逐个改像素。 */
        var PX_LIGHT = ["#ffffff", "#fcfcfc", "#f8f8f8", "#f4f4f4", "#efefef",
                        "#eaeaea", "#e4e4e4", "#dedede", "#d8d8d8", "#d1d1d1",
                        "#cacaca", "#c2c2c2", "#bababa", "#b2b2b2"];
        var PX_GRAY  = ["#a8a8a8", "#9e9e9e", "#949494", "#8a8a8a", "#808080",
                        "#757575", "#6a6a6a", "#5e5e5e"];

        function pickPx() {
            /* 近白的一档占大头，深灰少量 —— 层次多，但整体还是那张图的灰白感 */
            if (Math.random() < 0.72) return PX_LIGHT[(Math.random() * PX_LIGHT.length) | 0];
            return PX_GRAY[(Math.random() * PX_GRAY.length) | 0];
        }

        /* 先撒 14 个“色块核心”：一部分像素聚在核心附近、成片同色，
           另一部分完全散开 —— 这样整页的分布有疏有密、外围参差不齐。 */
        var PX_CLUSTERS = [];
        var k;
        for (k = 0; k < 14; k++) {
            PX_CLUSTERS.push({
                x: Math.random() * 2 - 1,        /* -1 … 1（相对爆炸中心） */
                y: Math.random() * 2 - 1,
                r: 0.16 + Math.random() * 0.34,
                c: pickPx()
            });
        }

        var PX_COUNT = 420;            /* 像素块数量：铺满整页要够多，但也别把机器拖垮 */
        var i, px, x, y, d, pw, cl, ang, rad;

        for (i = 0; i < PX_COUNT; i++) {
            px = document.createElement("span");
            px.className = "tnt-px";

            if (Math.random() < 0.55) {
                /* 成片：聚在某个核心附近（同一片颜色相近） */
                cl = PX_CLUSTERS[(Math.random() * PX_CLUSTERS.length) | 0];
                x = cl.x + (Math.random() - 0.5) * 2 * cl.r;
                y = cl.y + (Math.random() - 0.5) * 2 * cl.r;
            } else {
                /* 散开：以爆炸中心为原点随机撒，但用极坐标让外围更参差 */
                ang = Math.random() * Math.PI * 2;
                rad = Math.pow(Math.random(), 0.62);
                x = Math.cos(ang) * rad;
                y = Math.sin(ang) * rad;
                cl = null;
            }

            x = Math.max(-1, Math.min(1, x));
            y = Math.max(-1, Math.min(1, y));

            /* 离中心越远，出现得越晚 —— 像素云是从中间往外“长”出来的 */
            d = Math.min(1, Math.hypot(x, y));

            /* 尺寸按 em 给（跟着 --text3-word-size 缩放），参考图那种块比较大的样子 */
            pw = 0.10 + Math.random() * 0.30;

            px.style.width = pw.toFixed(3) + "em";
            px.style.height = (pw * (0.7 + Math.random() * 0.6)).toFixed(3) + "em";
            px.style.background = cl && Math.random() < 0.78 ? cl.c : pickPx();

            /* 目标点：横向 46vw、纵向 44vh（从爆炸中心量），铺满整个窗口 */
            px.style.setProperty("--pdx", (x * 46).toFixed(1));
            px.style.setProperty("--pdy", (y * 44).toFixed(1));

            /* --pa / --pd 都在“炸开之后 0→1”的坐标里：0.02 起陆续出现，0.50 起陆续消失 */
            px.style.setProperty("--pa", (0.02 + d * 0.30 + Math.random() * 0.05).toFixed(3));
            px.style.setProperty("--pd", (0.50 + Math.random() * 0.30).toFixed(3));

            tntCloud.appendChild(px);
        }
    }

    if (harder || tntGroup) {
        var GROW_SEC = 0.7;            /* ← harder 长大用几秒（1.js 那三段时间不受影响） */

        var harderBase = 0;            /* 出场时的大小 = 这一句的字号（现在是 44px） */
        var harderPx = 0;              /* 最终大小 = 4.css 的 --text3-harder-size（现在是 110px） */

        var tex3Ease = function (t) { return 1 - Math.pow(1 - t, 3); };

        /* ==================================================================
           TNT 爆炸（Minecraft 那种）：快速上下跳两下 → 闪白（时间长一点）→ 炸开
           → 文字立刻消失、灰白像素从中心向整页扩散 → 到 E 之前全部散完
           跳动 / 闪白用【固定秒数】，所以不管这一句在画面上停多久，节奏都一样利落；
           爆炸之后的像素云按“到 E 还剩多少秒”归一化，最后一块消失正好落在 E
           （= 1.js 把这一句淡出完的那一刻）。
           旋钮在 4.css 的 .familiar-host 上：
             --tnt-bob   跳多高（em）
           ================================================================== */
        var TNT_HOP_SEC   = 0.42;      /* 两下跳完总共用多少秒（要“快速”，别拖成一秒多） */
        var TNT_FLASH_SEC = 0.34;      /* 跳完到炸开之间的闪白时间（白色占大头，所以看着更“白”） */
        var tntFontPx = 164;           /* 这两个词的字号（读自 CSS，跟着 --text3-word-size 走） */
        var tntBobEm = 0.22;           /* 跳多高（em） */
        var tntCur = -1;               /* 上一帧画到第几秒；-1 = 还没画过 */

        function readTntKnobs() {
            if (!tntGroup) return;
            var cs = getComputedStyle(tntGroup);
            var bob = parseFloat(cs.getPropertyValue("--tnt-bob"));
            tntBobEm = isFinite(bob) && bob > 0 ? bob : 0.22;
            tntFontPx = parseFloat(cs.fontSize) || 164;
        }

        /* 全部归位（合上 / 窗口外都在这里） */
        function resetTnt() {
            if (!tntGroup) return;
            tntGroup.style.transform = "";
            if (tntBody) {
                tntBody.style.color = "";
                tntBody.style.textShadow = "";
                tntBody.style.opacity = "";
            }
            if (tntFlash) tntFlash.style.opacity = "0";
            if (tntCloud) tntCloud.style.display = "none";
        }

        /* t：从“harder 长完”到现在过了几秒；total：这段总共几秒（到 E 为止） */
        function paintTnt(t, total) {
            if (!tntGroup || !tntBody) return;

            if (!(t > 0) || !(total > 0)) {
                if (tntCur === 0) return;
                tntCur = 0;
                resetTnt();
                return;
            }
            if (t > total) t = total;
            if (t === tntCur) return;
            tntCur = t;

            /* 跳动 / 闪白都用固定秒数（停留再久也不拖长），但给后面的消散留足时间 */
            var hopSec = Math.min(TNT_HOP_SEC, total * 0.35);
            var flashSec = Math.min(TNT_FLASH_SEC, total * 0.22);
            var boomAt = hopSec + flashSec;
            if (boomAt > total * 0.6) boomAt = total * 0.6;

            /* ---- ① 快速上下跳两下：每一下一条抛物线，落地时略微压扁 ---- */
            var bob = 0, sqx = 1, sqy = 1;
            if (t < hopSec) {
                var hop = t / (hopSec / 2);        /* 0→2：第几下 */
                var h = hop - Math.floor(hop);     /* 这一下里的 0→1 */
                var arc = 4 * h * (1 - h);         /* 抛物线：地面 → 最高 → 地面 */
                bob = -tntBobEm * tntFontPx * arc;

                var ground = (1 - arc) * (1 - arc);
                sqy = 1 - 0.07 * ground;           /* 落地压扁 */
                sqx = 1 + 0.05 * ground;
            }

            /* ---- ② 闪白：从第二下跳的时候就开始闪，一直闪到炸开；白的占比调大，
                    每个周期里约 72% 的时间是白的 —— 所以“白”的时长比之前长得多 ---- */
            var white = 0;
            var flashFrom = hopSec * 0.55;
            if (t >= flashFrom && t < boomAt) {
                var fu = (t - flashFrom) / Math.max(1e-6, boomAt - flashFrom);
                white = (fu % 0.5) < 0.36 ? 1 : 0;
            } else if (t >= boomAt && t < boomAt + 0.08) {
                white = 1;
            }

            /* ---- ③ 文字：炸开的一瞬间就没了（0.05 秒内淡完）——
                    所以像素云刚开始冒出来的时候，爆炸的文字已经消失 ---- */
            var gone = t > boomAt ? Math.min(1, (t - boomAt) / 0.05) : 0;

            /* ---- ④ 像素云进度：从炸开到 total（= E），最后一块正好在 E 消失 ---- */
            var dis = t > boomAt ? (t - boomAt) / Math.max(1e-6, total - boomAt) : 0;
            if (dis > 1) dis = 1;

            var sc = 1 + 0.03 * white;

            tntGroup.style.transform =
                "translateX(calc(var(--text3-shift) * 1vw))" +
                " translate(0px," + bob.toFixed(2) + "px)" +
                " scale(" + (sc * sqx).toFixed(4) + "," + (sc * sqy).toFixed(4) + ")";

            tntBody.style.color = white ? "#ffffff" : "";
            /* 页面底色偏白，纯白字会糊进背景 —— 闪的时候补一圈暗影，白闪才看得出来 */
            tntBody.style.textShadow = white ? "0 0 0.06em rgba(16, 27, 44, 0.55)" : "";
            tntBody.style.opacity = gone > 0 ? (1 - gone).toFixed(3) : "";

            /* ---- ⑤ 炸开瞬间的白色闪光 ---- */
            if (tntFlash) {
                var fl = t > boomAt ? Math.max(0, 1 - (t - boomAt) / 0.12) : 0;
                tntFlash.style.opacity = fl.toFixed(3);
            }

            /* ---- ⑥ 像素云：只写一条 --tnt-s（0→1，1 = 到 E）----
               每个块自己的出现 / 消失时间在 CSS 里用它算，所以每帧只有一次属性写入。 */
            if (tntCloud) {
                var show = t >= boomAt;
                tntCloud.style.display = show ? "block" : "none";
                if (show) tntCloud.style.setProperty("--tnt-s", dis.toFixed(4));
            }
        }

        /* 读 harder 的字号（两个都放在 CSS 里，这里只负责跟着变） */
        function readHarderSizes() {
            if (!harder) return;
            harderBase = parseFloat(getComputedStyle(harderHost).fontSize) || 44;

            var cs = getComputedStyle(harder);
            var v = parseFloat(cs.getPropertyValue("--text3-harder-size"));
            if (v > 0) {
                harderPx = v;
            } else {
                /* 没写那个变量就退回它自己的 font-size（读之前先摘掉 inline，免得读到动画中的值） */
                var saved = harder.style.fontSize;
                harder.style.fontSize = "";
                harderPx = parseFloat(getComputedStyle(harder).fontSize) || harderBase;
                harder.style.fontSize = saved;
            }
        }

        function readSizes() {
            readHarderSizes();
            readTntKnobs();            /* 字号 / 浮动幅度 / 飞散半径（改 4.css 后 resize 一次就生效） */
        }
        readSizes();

        var harderCur = null;          /* 当前写在 inline 上的字号；null = 没写，交还 CSS */
        var harderLast = null;         /* 上一帧算过的进度：页面没动就不重算 */

        function paintHarder(px) {
            if (!harder || px === harderCur) return;
            harder.style.fontSize = px === null ? "" : px.toFixed(2) + "px";
            harderCur = px;
        }

        function frameHarder() {
            requestAnimationFrame(frameHarder);

            var home = window.__home;
            if (!home) return;
            if (home.cur === harderLast) return;            /* 页面没动：不做事 */
            harderLast = home.cur;

            var it = itemOf(harderHost);
            var rate = home.rate;
            if (!it || !(rate > 0)) { paintHarder(null); paintTnt(0, 0); return; }

            var p = home.cur;
            if (p <= it.A || p >= it.E) { paintHarder(null); paintTnt(0, 0); return; }   /* 窗口外：交还 CSS */

            var t = (p - it.H) / rate;                      /* 整句“完全出现”之后过了几秒 */

            /* ① harder：44px → 目标字号 */
            if (harderPx > harderBase) {
                paintHarder(t <= 0
                    ? harderBase
                    : harderBase + (harderPx - harderBase) * tex3Ease(Math.min(1, t / GROW_SEC)));
            }

            /* ② TNT：从 harder 长完那一刻起，一直演到 E（= 这句淡出结束）。
               传“已经过了几秒 + 这段总共几秒”：跳动和闪白用固定秒数，
               像素云按剩下的秒数归一化，所以最后一块消失正好落在 E。 */
            var tStart = it.H + GROW_SEC * rate;
            var tDurSec = (it.E - tStart) / rate;
            paintTnt((p - tStart) / rate, tDurSec);
        }

        window.addEventListener("resize", function () {
            /* 先交还 CSS 的最终字号：1.js 的 layout() 会在 resize 时量一次高度，
               量到“最终字号”那一版才是准的（量到动画中途的字号会差十几像素）。
               ★ 下一帧 frameHarder 会把当前进度该有的字号重新写上，所以不会闪。 */
            paintHarder(null);

            readSizes();               /* 字号 / TNT 旋钮再看一眼 */
            harderLast = null;         /* 下一帧重新算一次 */
        });

        requestAnimationFrame(frameHarder);
    }

    /* ======================================================================
       BEGINNING 的出场动效（纯滚轮驱动，能随滚轮倒放）
       ----------------------------------------------------------------------
       时间轴（都用 1.js 已有的进度单位，秒 = 进度 / window.__home.rate）：
          A ──淡入── H ──────── 停留 ──────── B ──淡出── E
                └ 整句淡入         └ ★ 这段里演 BEGINNING

       ★ BEGINNING 什么时候出场，由 3.js 的 ico7（箭头）说了算：
         3.js 把 ico7 的出场 / 渐入时长按 FRAC 报在 __bugIcons.timeline.ico7End 上
         （1 FRAC = 这一句的淡入窗口 H - A），这里把它换成进度：
             起点 = A + ico7End × (H - A)      ← 箭头渐入【彻底走完】的那一刻
         整个顺序：
           ① A→H：整句（Compact is only the）淡入，BEGINNING 先藏起来（opacity 0）
           ② ico5 → ico7（都归 3.js 管），等箭头的渐入彻底走完
           ③ BEGINNING 原地出现（视觉大小 PEAK_PX），淡入用 APPEAR_SEC 秒
           ④ 再缩小回 4.css 里的字号（现在是 152px），用 SHRINK_SEC 秒
           ⑤ 缩完那一刻 → 3.js 的 ico6 才出场（它来读下面挂出去的 done）

       ★ 这里算出来的两个时刻会挂到 window.__beginning 上给 3.js 的 ico6 用：
             start(item) —— BEGINNING 开始出现
             done(item)  —— 缩小完全结束（ico6 就等这一刻）
         两段时长会按“这句还能在画面上待多久”整体压缩（MIN_FIT），
         所以 done 必须和 frame() 用同一套算法，不能在 3.js 里拿秒数硬算。
         真被拖长了也没关系：ico6 一直亮到 text-2 淡出，和后面的文字同屏不影响。
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

    /* ---- BEGINNING 这两个时刻（进度值）----
       start = 开始出现（= ico7 的渐入彻底走完）    done = 缩小完全结束（ico6 等这一刻）
       ★ 两段时长要按“这句还能在画面上待多久”整体压缩（MIN_FIT），
         所以这里算出来的 appear / shrink 必须和 frame() 用的是同一份 —— 共用这个函数。 */
    function schedOf(it) {
        var rate = (window.__home && window.__home.rate) || 0;
        /* 3.js 的时刻表：ico7End = 箭头渐入结束（1 FRAC = H - A）。
           万一 3.js 不在（只加载了本文件），退回老行为：整句淡入结束就出场。 */
        var tl = window.__bugIcons && window.__bugIcons.timeline;
        var start = tl ? it.A + tl.ico7End * (it.H - it.A) : it.H;

        var total = APPEAR_SEC + SHRINK_SEC;
        var avail = rate > 0 ? (it.E - start) / rate : total;   /* 这句还能在画面上待多久（秒） */
        var k = Math.min(1, Math.max(MIN_FIT, avail / total));

        return {
            start: start,
            appear: APPEAR_SEC * k,
            shrink: SHRINK_SEC * k,
            done: start + (APPEAR_SEC + SHRINK_SEC) * k * rate
        };
    }

    /* 3.js 的 ico6 就是等 done —— 它在 4.js 之后加载，但这两函数是每帧才调用的，
       所以挂在这里正好（3.js 的 beginningDone() 会来读）。 */
    window.__beginning = {
        start: function (it) { return schedOf(it).start; },
        done:  function (it) { return schedOf(it).done; }
    };

    var lastCur = null;

    function frame() {
        requestAnimationFrame(frame);

        var home = window.__home;
        if (!home || home.cur === lastCur) return;   /* 页面没在动就不做事 */
        lastCur = home.cur;

        var it = itemOf(host);
        var rate = home.rate;
        if (!it || !(rate > 0)) return;

        var sch = schedOf(it);                        /* 出场点 + 两段实际时长（含 MIN_FIT 缩放） */
        var t = (home.cur - sch.start) / rate;        /* 相对 BEGINNING 出场那一刻的秒数 */
        var a = sch.appear, s = sch.shrink;

        if (t <= 0) {
            paint(0, peakScale);                      /* 还没轮到（整句淡入期间也藏）：看不见 */
        } else if (t < a) {
            paint(t / a, peakScale);                  /* 原地按 PEAK_PX 淡入 */
        } else if (t < a + s) {
            var u = easeOut((t - a) / s);             /* PEAK_PX → 本来的字号 */
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
