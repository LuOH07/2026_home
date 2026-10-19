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
        text-9：
         “cut”（第一个） → <span class="cut9">  （单独放大 + 原地上下蹦，见 4.css）
        text-11：
         “Small” 的 S / “TnpB-based” 的 T / “Innovative” 的 I /
         “Nuclease” 的 N / “Genome” 的 G
                     → <span class="init-11 init-s"> 这样的五个小盒子
                       （首字母单独放大成“白心 + #465e11 描边”，见 4.css）
        text-13：
         “BUILD”     → <span class="build13">   （单独放大，字号旋钮 --build13-size 见 4.css）
        text-15：
         “EXPAND”    → <span class="expand15">  （单独放大，字号旋钮 --expand15-size 见 4.css）
        text-17：
         “MODEL”     → <span class="model17">   （单独放大，字号旋钮 --model17-size 见 4.css）
      其余文字（text-1 的 “ is only the”、text-3 的 “Genome editing gets … beyond”、
      text-6 的 “But small does … mean flexible.”、text-11 里除这五个字母以外的所有字、
      text-13 的 “Establish the Editing Tools”、text-15 的 “Broaden the Targeting Toolbox”、
      text-17 的 “From Data to Mechanism”）
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
    ⑤ 给 text-6 这一句单独加一个动效：它【淡出】的时候，整句跟着往左滑出去
       （默认页面宽度的 5%，距离旋钮 --t6-shift 在 4.css 的 .text-6 上），
       滑完停在那儿，之后照常淡出；同样由滚轮逐帧驱动、可以倒放。
       计时从“完全出现”（H）往后算，不从结尾倒推 —— 见下面 “text-6：完全出现后整句往左移” 那一段。
    ⑥ text-9 这一句单独左端对齐（4.css 的 .text-9），并把句子里【第一个】“cut”
       放大、让它在原地一直上下蹦 —— 纯 CSS animation，不需要逐帧驱动；
       放大程度 / 蹦的幅度 / 蹦的速度三个旋钮都在 4.css 的 .text-9 .cut9 里。
       另外【点一下这个词】会让这一句配套的视频（3.js 的图标 10：editing.webm）
       从头再播一遍，选择器 / 做法见下面 “text-9：点一下第一个 cut …” 那一段。
    ⑦ 等 text-9 自己的视频播完第一遍之后，另一段视频 gene.webm 从上方飞进来、
       边飞边淡入、在空中转一圈，落在 “where” 的正上方并一直循环播放；
       整段随滚轮推进 / 倒放，到这一句淡出时跟着一起淡掉。
       旋钮见下面 “text-9：gene.webm 从上方飞进来” 那一段的 GENE9_* 变量
       和 4.css 的 .text-9 .gene9（--gene9-w / --gene9-gap / --gene9-dx）。

    ⑧ 把 text-20 的【四句话】拆成四个独立的块（<span class="t20-line t20-p1"> … t20-p4），
       让每一句都能单独调静态位置 —— 位置旋钮在 4.css 里：
       --t20-p1-x / --t20-p1-y … --t20-p4-x / --t20-p4-y（默认 0 = 完全保持现在的样子）。
       文字、字号、颜色、居中方式、出场动效全都不变，见下面 “text-20：把四句话拆成四个块” 那一段。

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

    /* text-9 那句（“An editor can cut well / and still be unable to cut where we need it.”）
       里的【第一个】“cut”：包一层自己的类，字号 + 上下蹦的旋钮都在 4.css 的 .text-9 .cut9
       （--cut9-size / --cut9-bob / --cut9-bob-sec）。
       ★ 这句里有两个 “cut”，wrapWord 只包【第一次出现】的那一个（就是 “can cut well” 里那个），
         第二个 “cut” 以及其余文字一个字符都不动。
       ★ 跳动是纯 CSS animation（不需要滚轮驱动、也不会被 1.js 的 transform 覆盖），
         所以这里只负责“套钩子”，没有对应的逐帧动画代码。
       另外把 “where” 也包一层（.where9）：它只当【定位锚点】，
       让飞进来的 gene.webm 能贴在它正上方（见 4.css 的 .text-9 .where9 / .gene9，
       飞行动画在下面的 “text-9：gene.webm 从上方飞进来” 那一段）。 */
    var HOST9 = ".text-9";
    var TARGETS9 = [
        { word: "cut",   cls: "cut9" },             /* → 4.css 的 .text-9 .cut9 */
        { word: "where", cls: "where9" }            /* → 4.css 的 .text-9 .where9（只当锚点） */
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

    /* text-15 那句（“EXPAND<br>Broaden the Targeting Toolbox”）里的 “EXPAND”：
       和 text-13 的 BUILD 完全同一套做法 —— 单独包一层，只为给它一个字号旋钮
       （--expand15-size，见 4.css）。原文大写会原样保留。
       ★ 同样是 flex column 里的一个独立块，放大不会把下面那行挤歪。 */
    var HOST15 = ".text-15";
    var TARGETS15 = [
        { word: "expand", cls: "expand15" }        /* → 4.css 的 .text-15 .expand15 */
    ];

    /* text-17 那句（“MODEL<br>From Data to Mechanism”）里的 “MODEL”：
       和 BUILD / EXPAND 同一套 —— 单独包一层，只为给它一个字号旋钮
       （--model17-size，见 4.css）。原文大写会原样保留。 */
    var HOST17 = ".text-17";
    var TARGETS17 = [
        { word: "model", cls: "model17" }          /* → 4.css 的 .text-17 .model17 */
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

        /* text-9：只包第一个 “cut”，样式（放大 + 原地上下蹦）在 4.css 的 .text-9 .cut9 */
        var host9 = document.querySelector(HOST9);
        if (host9) TARGETS9.forEach(function (t) { wrapWord(host9, t.word, t.cls); });

        /* text-11：五个词的第一个字母各自包一层（白心 + #465e11 描边，见 4.css） */
        var host11 = document.querySelector(HOST11);
        if (host11) INITIALS11.forEach(function (t) { wrapInitial(host11, t.word, t.cls); });

        /* text-13：“BUILD” 单独包一层，字号旋钮在 4.css 的 .text-13 .build13 */
        var host13 = document.querySelector(HOST13);
        if (host13) TARGETS13.forEach(function (t) { wrapWord(host13, t.word, t.cls); });

        /* text-15：“EXPAND” 单独包一层，字号旋钮在 4.css 的 .text-15 .expand15 */
        var host15 = document.querySelector(HOST15);
        if (host15) TARGETS15.forEach(function (t) { wrapWord(host15, t.word, t.cls); });

        /* text-17：“MODEL” 单独包一层，字号旋钮在 4.css 的 .text-17 .model17 */
        var host17 = document.querySelector(HOST17);
        if (host17) TARGETS17.forEach(function (t) { wrapWord(host17, t.word, t.cls); });
    }

    apply();

    /* ======================================================================
       text-20：把四句话拆成四个“块”，让每一句都能单独调静态位置
       ----------------------------------------------------------------------
       index.html 里这一句是（四行用 <br> 隔开）：
           Our platform allows<br>More targets<br>More functions<br>More understanding
       四行挤在同一个 flex 列里（1.css 的 .text-box 是 flex column），
       只能整块跟着 .text-20 走，没法各自挪。

       这里只做一件事：把每一行各包进一个 <span class="t20-line t20-p1"> … t20-p4，
       文字一个字符都不改、顺序不变、字号 / 颜色 / 居中方式也全不动
       （原来的 <br> 换成“块的分界”，本来就只是断行，视觉上一模一样）。

       每一块的静态位置在 4.css 里各有 2 个数：
           --t20-p1-x / --t20-p1-y    …   --t20-p4-x / --t20-p4-y
       单位是「页面宽 / 高的 %」（1 = 1vw / 1vh），默认是 0
       → 一进来和现在完全相同，只改那几个数就能单独挪某一句。

       ★ 只 transform 平移、不参与布局：挪动不会推挤别的行、也不会改变
         .text-20 的高度（1.js 的 layout() 量到的仍是原来那个高度）。
       ★ 1.js 每帧写的是 .text-20 自己的 inline transform（把整句钉在锚线上），
         这里动的是它【里面】的块，两套 transform 互不干扰。
       ★ 已经拆过（有 .t20-line）就直接跳过：刷新 / 重跑都安全。
       ====================================================================== */
    var HOST20 = ".text-20";

    (function splitText20() {
        var host = document.querySelector(HOST20);
        if (!host || host.querySelector(".t20-line")) return;     /* 已经拆过：不动 */

        /* 按 <br> 分块：每个 <br> 之前的内容算一块（文本节点原样搬，不 trim、不合并） */
        var buckets = [[]];
        Array.prototype.slice.call(host.childNodes).forEach(function (node) {
            if (node.nodeType === 1 && node.nodeName === "BR") {
                buckets.push([]);                                  /* 遇到 <br> = 分块边界 */
                return;
            }
            buckets[buckets.length - 1].push(node);
        });

        /* 去掉“空块”（连续 <br> / 收尾 <br> 造成的那种）—— 现在这句正好四块 */
        buckets = buckets.filter(function (nodes) {
            return nodes.some(function (node) {
                return node.nodeType !== Node.TEXT_NODE || node.nodeValue.trim() !== "";
            });
        });
        if (!buckets.length) return;

        /* 先清空，再把每一块装进自己的 <span>（原来的节点只是换个父亲，文字没动） */
        while (host.firstChild) host.removeChild(host.firstChild);

        buckets.forEach(function (nodes, i) {
            var line = document.createElement("span");
            line.className = "t20-line t20-p" + (i + 1);           /* → 4.css 的位置旋钮 */
            nodes.forEach(function (node) { line.appendChild(node); });
            host.appendChild(line);
        });
    })();

    /* ======================================================================
       text-20：每句里点名的那一个（几个）字母单独放大
       ----------------------------------------------------------------------
       需求（按原句逐句对上）：
         “Our platform allows”    → 最后一个 s
         “More targets”           → 第一个 t
         “More functions”         → i
         “More understanding”     → 第一个 n 和最后一个 g（原文都是小写，原样保留）

       这里只把【点名的那几个字符】各包成 <span class="t20-big t20-big-x">，
       句子里其余的字一个都不动（仍是 44px / #324561 / impact / 居中）。

       ★ 大小旋钮在 4.css：每个字母一个数，另有一个“五个一起缩放”的倍数
            .text-20 .t20-big-s { --t20-big-size: … }   “allows” 的 s
            .text-20 .t20-big-t { --t20-big-size: … }   “targets” 的 t
            .text-20 .t20-big-i { --t20-big-size: … }   “functions” 的 i
            .text-20 .t20-big-n { --t20-big-size: … }   “understanding” 的第一个 n
            .text-20 .t20-big-g { --t20-big-size: … }   “understanding” 最后一个 g
          五个一起放大 / 缩小：改 .text-20 上的 --t20-big-scale（1 = 原样）。
       ★ 和前后字母的间距：4.css 的 --t20-big-gap（后面）/ --t20-big-gap-before（前面），
         也可以只给某一个字母单独调（在它自己那条里覆盖）。

       ★ 一句话里有两处（现在 “understanding” 的 n 和 g）也在【同一趟】里切开 ——
         一次把整词切成 词头 / 大字① / 中间 / 大字② / 词尾，所以两个字母都放得下，
         不会因为“第一次切开后整词就找不到了”而漏掉第二个。
       ★ at 里的位置从 0 数（0 = 词的第一个字母），"last" = 这个词的最后一个字母；
         大小写不敏感地找词，span 里保留原文的写法。
       ★ 已经包过（这一行里已有 .t20-big）就跳过：刷新 / 重跑都安全。
       ====================================================================== */
    var T20_LETTERS = [
        { line: "t20-p1", word: "allows",        at: ["last"], cls: "t20-big-s" },              /* allows 的 s（最后一个） */
        { line: "t20-p2", word: "targets",       at: [0],       cls: "t20-big-t" },              /* targets 的 t（第一个） */
        { line: "t20-p3", word: "functions",     at: [5],       cls: "t20-big-i" },              /* functions 的 i */
        { line: "t20-p4", word: "understanding", at: [1, "last"],
          cls: ["t20-big-n", "t20-big-g"] },                                                        /* understanding 的第一个 n + 最后一个 g */
    ];


    /* 把 lineEl 里【第一次出现的整词 word】的 at 指定的那几个字符包成 .t20-big：
         前文 / 大字① / 中间 / 大字② / 后文 …，一次切好，文字一个字符都不改。 */
    function wrapLetters20(lineEl, word, at, cls) {
        if (!lineEl || lineEl.querySelector(".t20-big")) return;     /* 没有这一行 / 已经包过 */

        /* 要包的字符位置（词内第几个，从 0 数；"last" = 最后一个），和各自的类名成对排好 */
        var spots = at.map(function (pos, j) {
            return {
                pos: pos === "last" ? word.length - 1 : (pos < 0 ? word.length + pos : pos),
                cls: Array.isArray(cls) ? (cls[j] || cls[0]) : cls
            };
        }).sort(function (a, b) { return a.pos - b.pos; });

        var wordChar = /[A-Za-z0-9_-]/;
        var nodes = Array.prototype.slice.call(lineEl.childNodes);

        for (var n = 0; n < nodes.length; n++) {
            var node = nodes[n];
            if (node.nodeType !== Node.TEXT_NODE) continue;

            var text = node.nodeValue;
            var start = text.toLowerCase().indexOf(word.toLowerCase());
            if (start < 0) continue;

            /* 整词判定：词前 / 词后不能紧挨着字母、数字、下划线、连字符 */
            if (start > 0 && wordChar.test(text.charAt(start - 1))) continue;
            var next = text.charAt(start + word.length);
            if (next && wordChar.test(next)) continue;

            var frag = document.createDocumentFragment();
            var cursor = start;                       /* 已经搬走的最后一个字符之后的位置 */

            spots.forEach(function (spot) {
                var abs = start + spot.pos;
                if (abs > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, abs)));

                var span = document.createElement("span");
                span.className = "t20-big " + spot.cls;   /* → 4.css 的字号旋钮 */
                span.textContent = text.charAt(abs);      /* ← 原样保留大小写 */
                frag.appendChild(span);

                cursor = abs + 1;
            });
            if (cursor < start + word.length) {
                frag.appendChild(document.createTextNode(text.slice(cursor, start + word.length)));
            }

            lineEl.insertBefore(document.createTextNode(text.slice(0, start)), node);
            lineEl.insertBefore(frag, node);
            lineEl.insertBefore(document.createTextNode(text.slice(start + word.length)), node);
            lineEl.removeChild(node);
            return;
        }
    }

    (function bigLettersText20() {
        var host = document.querySelector(HOST20);
        if (!host) return;
        T20_LETTERS.forEach(function (t) {
            wrapLetters20(host.querySelector("." + t.line), t.word, t.at, t.cls);
        });
    })();

    /* ======================================================================
       text-20：ico15 从上方进入 → 在文字之间弹跳 → 依次敲击 S / T / I / N / G
                 → 从右侧飞出
       ----------------------------------------------------------------------
       需求：
         · 图标 15（3.js 里那颗“分子”，understand-1.avif）从上方进入这一句；
         · 在四行文字之间弹跳，依次敲到 S → T → I → N → G 五个大字母；
         · 被敲中的字母立刻变成 #465E77、关掉荧光（4.css 的 .is-hit）；
         · ★ 四段文字【逐段出场】：一开始只有第一段；敲中第一段那颗之后才淡入第二段，
           敲中第二段之后淡入第三段……最后（敲完 G）四段【一起淡出】；
         · 五个都敲完，图标从右侧飞出屏幕；
         · ★ 不避让：路线压到不该碰的文字时【直接穿过去】——
           图标被放在文字图层之上（.sting-layer，z-index 60），压过去也看得见；
         · text-20 离开屏幕（淡出 / 滚走）→ 全部复位，下次出现重新演一遍。

       ★ 位置谁管：3.js 里图标 15 已改成 pin: true，不再被随机飘动推着走；
         这里每帧写它的 transform。4.css 把 slot 的 left / top 归零了，
         所以 transform 里的坐标就是【视口坐标】；3.js 只负责它的淡入淡出。

       ★ 轨迹：每一段都是二次贝塞尔（抛物线）——
           起点 = 上一颗字母的落点（第一段从 S 正上方、屏幕外开始），
           终点 = 下一颗字母顶边上方 H/2 + clear 处，
           控制点在两端连线中点再抬高 dist × arc → 看起来就是“弹起来、落下去”。
         落点都压在字母顶上，所以五颗都敲得到。

       ★ 穿模是允许的：不再做任何“把图标推出去”的避让计算，
         路线该从哪儿过就从哪儿过；会不会压到别的字，交给图层顺序解决。

       ★ 撞击的“物理感”：每敲中一颗，图标会被撞得【转一下】——\n         角速度先给一个大值（spinKick）、再按指数衰减（spinTau），\n         转角 = 角速度对 u 的积分；方向每撞一次反过来（spinFlip）。\n         全部是 u 的闭式函数，所以往回滚会原样倒着转回去。\n       ★ 时间轴：跟着滚轮走（见下面的 u），不自己跑；滚回起点会复位。

       ★ 想调节奏 / 幅度：只改下面 CFG 里的几个数。
       ====================================================================== */
    /* ======================================================================
       text-20：ico15 跟着滚轮弹跳 → 依次敲击 S / T / I / N / G → 从右侧飞出
       ----------------------------------------------------------------------
       需求：
         · 不再“自己演一遍”，而是【跟着鼠标滚轮走】：
             往下滚 → 图标从上方进入、在文字之间弹跳、依次敲 S → T → I → N → G、最后从右侧飞出；
             往上滚 → 整段原样倒回去（敲过的字母会自己变回黄色）。
         · 字母默认 #fbe15c（带荧光）；被敲中 → #465E77、关掉荧光（4.css 的 .is-hit）。
         · 不避让：路线压到别的字就直接穿过去（图标在文字图层之上）；
         · 这一句的时间不够演完也没关系：动画可以继续演到后面几句文字的位置上
           （所以图标在这段时间里强制可见，见下面的 .is-sting）。

       ★ 时间轴（滚轮单位，和 1.js / 其他效果完全同一套）：
           起始点 = 这一句【完全出现】那一刻（item.H）
           整段占 totalSec 秒的滚动量（rate 把“秒”换成进度）
           进度 = (home.cur - H) / (totalSec × rate) → u ∈ [0,1]
         u 的分配（按下面 CFG 的权重）：
            入场 0.85  →  敲 S 1  →  T 1  →  I 1  →  N 1  →  G 1  →  飞出 0.9
         全部由 u 算出来，所以停住不动就停住、往回滚就倒着演，没有“自己跑”的时间。

       ★ 位置谁管：3.js 里图标 15 已改成 pin: true，位置完全由这里每帧写 transform；
         4.css 把 slot 的 left / top 归零，所以 transform 里的坐标就是【视口坐标】。

       ★ 轨迹：每一段都是二次贝塞尔（抛物线）——
           起点 = 上一颗字母的落点（第一段从 S 正上方、屏幕外开始），
           终点 = 下一颗字母顶边上方 H/2 + clear 处，
           控制点在两端连线中点再抬高 dist × arc。
       ★ 不做避让：路线怎么走就怎么走，压到别的文字就直接穿过去 ——\n          图标被挪到 .sting-layer（文字图层之上），压过去也看得见。
       ★ 想调节奏 / 幅度：只改下面 CFG 里的几个数；图标个头在 4.css 的 --icon-height。
       ====================================================================== */
    (function stingBounce() {
        var host = document.querySelector(HOST20);
        var slot = host && document.querySelector(".bug-icon-slot.bug-icon-15");
        var icon = slot && slot.querySelector(".bug-icon");
        if (!host || !slot || !icon) return;

        var letters = Array.prototype.slice.call(host.querySelectorAll(".t20-big"));
        var linesEls = Array.prototype.slice.call(host.querySelectorAll(".t20-line"));   /* 四行文字：逐段淡入用 */
        if (letters.length < 2) return;

        /* ★ 把这一颗图标挪到一个【文字上面】的独立图层里：
           .bug-icons 原本是 z-index: 3（在文字下面），现在按需求要压过文字，
           所以给它单独建一层 .sting-layer（position: fixed + 很高的 z-index）。
           ★ 它还是原来那个 slot 元素，3.js 的淡入淡出 / 尺寸全都照旧。 */
        var layer = document.createElement("div");
        layer.className = "sting-layer";
        layer.setAttribute("aria-hidden", "true");
        (document.body || document.documentElement).appendChild(layer);
        layer.appendChild(slot);

        /* ---- 可调旋钮 ---- */
        var CFG = {
            totalSec: 2.6,       /* 整段动画 = 多少秒的滚动量（越大越“慢”；还会自动压缩到淡出之前） */
            enterW: 0.85,        /* 入场段占的比重 */
            legW: 1,             /* 每敲一颗字母占的比重 */
            exitW: 0.9,          /* 飞出段占的比重 */
            arc: 0.34,           /* 弧顶比两端连线再高多少（× 两点距离） */
            clear: 4,            /* 落点离字母顶边留多少 px */
            pad: 13,             /* 碰撞盒在文字外面再放大多少 px（含压扁时鼓出来的量） */
            squash: 0.22,        /* 敲中一下压扁多少（0 = 不压） */
            squashU: 0.035,      /* 压扁在 u 上持续多长 */
            spinKick: 1100,      /* ★ 撞一下给多少“角速度”（度 / 每个 u），0 = 不转 */
            spinTau: 0.18,       /* ★ 角速度衰减的长度（u）：越大转得越久（每个撞击约转 1100×0.18 ≈ 200°） */
            spinFlip: true,      /* ★ 每次撞击方向相反（像真的弹一下就换个转向） */
            lineFadeU: 0.055,    /* ★ 每段文字淡入用多长（u）：越小越“啪”地出现 */
            bounceAmp: 0.16,     /* ★ 字母被撞后弹一下的幅度（0 = 不弹） */
            bounceHalf: 0.045,   /* ★ 弹的半周期（u）：越小弹得越快 */
            bounceTau: 0.060,    /* ★ 弹的衰减（u）：越小停得越快 */
            bounceSpan: 0.22,    /* ★ 超过这个范围就不再写 transform（省一次样式更新） */
            lineDelay: 0.012     /* ★ 敲中之后隔多久开始淡入下一段 */
        };

        var W = 0, Hh = 90;                    /* 图标宽 / 高 */
        var legCount = letters.length - 1;                     /* S→T→I→N→G = 4 段 */
        var totalW = CFG.enterW + CFG.legW * legCount + CFG.exitW;
        var active = false;                    /* 现在是不是“在演” */

        function unit(w) { return w / totalW; } /* 权重 → u */

        function measure() {
            W = icon.offsetWidth || 108;
            Hh = icon.offsetHeight || 90;
        }
        measure();

        var seenW = W, seenH = Hh;
        function refreshSize() {
            if (icon.offsetWidth !== seenW || icon.offsetHeight !== seenH) {
                seenW = icon.offsetWidth;
                seenH = icon.offsetHeight;
                measure();
            }
        }

        /* 窗口变了：文字位置 / 字号都可能变 —— 冻结的那份屏幕坐标、量出来的基线都作废 */
        window.addEventListener("resize", function () {
            geom = null;
            baseOffs = null;
            metrics.fs = 0;
            setTimeout(measure, 60);
        });

        /* ---- 每颗字母的字形墨迹度量（字号不变就不重量）----
           .t20-big 是 line-height: 0 的 inline-block：它的 rect 高度是 0，
           所以这里用 canvas 量“基线以上多高 / 以下多深 / 左右墨迹边”，
           再和“真正的基线”拼成字形盒子（基线怎么来的见下面 measureBaselines）。 */
        var metrics = { fs: 0, list: [] };

        function letterMetrics() {
            var fs = parseFloat(getComputedStyle(letters[0]).fontSize) || 88;
            if (Math.abs(fs - metrics.fs) < 0.01 && metrics.list.length === letters.length) return metrics.list;

            var ctx = document.createElement("canvas").getContext("2d");
            var list = [];
            for (var i = 0; i < letters.length; i++) {
                var el = letters[i];
                var cs = getComputedStyle(el);
                ctx.font = cs.fontSize + " " + cs.fontFamily;
                var m = ctx.measureText(el.textContent || "");
                var fsz = parseFloat(cs.fontSize) || 88;
                list.push({
                    asc: m.actualBoundingBoxAscent || (fsz * 0.72),
                    des: m.actualBoundingBoxDescent || 0,
                    inkL: m.actualBoundingBoxLeft ? -m.actualBoundingBoxLeft : 0,
                    inkR: m.actualBoundingBoxRight || (fsz * 0.5)
                });
            }
            metrics = { fs: fs, list: list };
            return list;
        }

        /* ---- 每颗字母的基线相对 rect.top 的偏移 ----
           .t20-big 的 rect.top 既不是字形顶也不是基线；临时插一个 0×0、
           vertical-align: baseline 的探针，它的 top 就是基线，量完立刻删掉。 */
        var baseOffs = null;

        function measureBaselines() {
            var out = [];
            for (var i = 0; i < letters.length; i++) {
                var el = letters[i];
                var probe = document.createElement("span");
                probe.setAttribute("aria-hidden", "true");
                probe.style.cssText = "display:inline-block;width:0;height:0;overflow:hidden;" +
                                      "margin:0;padding:0;border:0;vertical-align:baseline;";
                el.parentNode.insertBefore(probe, el.nextSibling);
                var base = probe.getBoundingClientRect().top;
                probe.parentNode.removeChild(probe);
                out.push(base - el.getBoundingClientRect().top);
            }
            return out;
        }

        /* 五颗字母当前的【字形盒子】（视口坐标） */
        function boxes() {
            var mt = letterMetrics();
            if (!baseOffs || baseOffs.length !== letters.length) baseOffs = measureBaselines();
            var out = [];
            for (var i = 0; i < letters.length; i++) {
                var r = letters[i].getBoundingClientRect();
                var m = mt[i];
                var base = r.top + baseOffs[i];
                var l = r.left + m.inkL;
                var rr = r.left + m.inkR;
                out.push({ l: l, r: rr, t: base - m.asc, b: base + m.des, cx: (l + rr) / 2 });
            }
            return out;
        }

        /* ★ 四段文字的出场：跟着敲击走 ——
           第 1 段一开始就在；敲中第 L-1 颗之后，第 L 段才淡入（L = 1..3）。
           最后一起淡出：敲完 G、飞出段的 35% 之后开始，到 u=1 全部淡完。
           全部由 u 算，所以往回滚会逆着“收”回去。 */
        function paintLines(u) {
            var e0 = unit(CFG.enterW);
            var legW = unit(CFG.legW);
            var exitW = unit(CFG.exitW);
            var legsEnd = e0 + legW * legCount;

            var outStart = legsEnd + exitW * 0.35;          /* 最后一起淡出的起点 */
            var out = 1;
            if (u > 1) out = 0;
            else if (u > outStart) out = 1 - (u - outStart) / Math.max(1e-6, 1 - outStart);
            if (out < 0) out = 0;

            for (var L = 0; L < linesEls.length; L++) {
                var op = 1;
                if (L > 0) {
                    var start = e0 + legW * (L - 1) + CFG.lineDelay;   /* 上一颗被敲中之后 */
                    op = (u - start) / CFG.lineFadeU;
                    if (op < 0) op = 0;
                    if (op > 1) op = 1;
                }
                linesEls[L].style.opacity = (op * out).toFixed(3);
            }
        }
        function contactOf(box) {
            return { x: box.cx, y: box.t - Hh / 2 - CFG.clear };
        }

        function putIcon(x, y, squashY, angle) {
            var sy = squashY == null ? 1 : squashY;
            var sx = 1 + (1 - sy) * 0.6;
            var rot = angle ? " rotate(" + angle.toFixed(2) + "deg)" : "";
            slot.style.transform =
                "translate(" + (x - W / 2).toFixed(1) + "px," + (y - Hh / 2).toFixed(1) + "px)" +
                " scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")" + rot;
        }

        function parkIcon() {
            slot.style.transform = "translate(-9999px,-9999px)";
        }

        function setActive(on) {
            if (on === active) return;
            active = on;
            slot.classList.toggle("is-sting", on);   /* 演出期间强制可见（3.js 的淡入淡出只管它自己） */
            if (!on) parkIcon();
        }

        /* 二次贝塞尔：t=0 → a，t=1 → b，弧顶由 a/b 中点再抬高 dist × arc。
           apex = 弧顶至少要升到哪条水平线（-Infinity = 不限制）：
           控制点按 2×apex − 中点算，这样 t=0.5 的弧顶正好落在 apex 上。 */
        function bezPoint(a, b, t, apex) {
            var dx = b.x - a.x, dy = b.y - a.y;
            var rise = Math.max(40, Math.sqrt(dx * dx + dy * dy) * CFG.arc);
            var mx = (a.x + b.x) / 2;
            var midY = (a.y + b.y) / 2;
            var my = midY - rise;
            if (isFinite(apex)) my = Math.min(my, 2 * apex - midY);
            var v = 1 - t;
            return {
                x: v * v * a.x + 2 * v * t * mx + t * t * b.x,
                y: v * v * a.y + 2 * v * t * my + t * t * b.y
            };
        }

        var lastCur = null;
        var geom = null;      /* 演出开始时抓的一份【屏幕坐标】文字盒子（之后不跟页面滚） */
        var geomAt = 0;       /* 第一次抓几何的时间：开头 0.6 秒内允许重抓，等字体 / 布局稳定 */

        function frame() {
            requestAnimationFrame(frame);
            refreshSize();

            var home = window.__home;
            var it = home && itemOf(host);
            if (!home || !it || !(home.rate > 0)) { setActive(false); return; }

            if (home.cur === lastCur) return;        /* 滚轮没动：这一帧不重算 */
            lastCur = home.cur;

            /* 整段占多少进度：默认 totalSec 秒，但一定在【开始淡出（B）之前】收尾 ——
               这样图标会在这一句淡出去之前就飞出画面。 */
            var span = Math.min(CFG.totalSec * home.rate, Math.max(1, (it.B - it.H) * 0.98));
            var u = (home.cur - it.H) / span;        /* 0 = 还没开始，1 = 演完 */

            /* 四段文字逐段出场（敲中一段才淡入下一段），最后一起淡出 */
            paintLines(u > 1 ? 1 : (u > 0 ? u : 0));

            if (!(u > 0)) {                          /* 还没开始 / 往回滚过了头：复位 */
                setActive(false);
                geom = null;
                for (var i = 0; i < letters.length; i++) {
                    letters[i].classList.remove("is-hit");
                    letters[i].style.transform = "";          /* 弹一下的痕迹也清掉 */
                }
                return;
            }
            if (u > 1) u = 1;

            setActive(true);

            /* ★ 演出开始时把文字的位置【按屏幕坐标抓一次】，之后一直用这一份：
               图标只跟着滚轮在屏幕上走，不跟着底图 / 页面一起滚（相对屏幕固定）。 */
            if (!geom) { geomAt = performance.now(); }
            if (performance.now() - geomAt < 600) geom = { bs: boxes() };   /* 开头重抓几帧，等布局稳定 */
            var bs = geom.bs;

            var e0 = unit(CFG.enterW);
            var legW = unit(CFG.legW);
            var exitW = unit(CFG.exitW);
            var legsEnd = e0 + legW * legCount;

            /* 敲击状态：入场落地（u = e0）就敲中 S，之后每过一段多敲中一颗；
               往回滚会自动取消（字回到 #fbe15c）。
               ★ 被撞的那一下，字自己也会【弹一下】：阻尼正弦（压扁 → 回弹 → 稳定），
                 幅度只由 dh（距离被撞过了多少 u）算，所以倒着滚会原样倒放。 */
            for (var j = 0; j < letters.length; j++) {
                var hitU = e0 + legW * j;
                var on = u >= hitU;
                letters[j].classList.toggle("is-hit", on);

                var dh = u - hitU;
                if (on && CFG.bounceAmp > 0 && dh > 0 && dh < CFG.bounceSpan) {
                    var decay = Math.exp(-dh / CFG.bounceTau);
                    var sy = 1 - CFG.bounceAmp * decay * Math.sin(dh * Math.PI / CFG.bounceHalf);
                    var sx = 1 + (1 - sy) * 0.55;              /* 压扁时横向鼓一点 */
                    letters[j].style.transform =
                        "scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";
                } else if (letters[j].style.transform) {
                    letters[j].style.transform = "";
                }
            }

            /* 压扁：刚敲中的一小段 u 里压一下、很快弹回 */
            var sq = 1;
            for (var k = 0; k < letters.length; k++) {
                var d = u - (e0 + legW * k);
                if (d >= 0 && d < CFG.squashU) {
                    var q = d / CFG.squashU;
                    sq = Math.min(sq, 1 - CFG.squash * (1 - q) * (1 - q));
                }
            }

            /* ★ 撞击带来的旋转（物理感）：每敲中一颗，就像被撞了一下——
               角速度先给一个大值、再按指数衰减，转角 = 角速度对 u 的积分。
               全部是 u 的闭式函数，所以往回滚会原样倒着转回去。
                 这一次的转角 = ±spinKick × spinTau × (1 − e^(−(u−命中点)/spinTau)) */
            var angle = 0;
            if (CFG.spinKick) {
                for (var s = 0; s < letters.length; s++) {
                    var du = u - (e0 + legW * s);
                    if (du > 0) {
                        var dir = (CFG.spinFlip && (s % 2)) ? -1 : 1;
                        angle += dir * CFG.spinKick * CFG.spinTau * (1 - Math.exp(-du / CFG.spinTau));
                    }
                }
            }

            var cx, cy;
            if (u < e0) {
                /* 入场：从 S 正上方、屏幕外落到 S 的落点 */
                var a0 = { x: bs[0].cx, y: -Hh - 30 };
                var p0 = bezPoint(a0, contactOf(bs[0]), u / e0);
                cx = p0.x; cy = p0.y;
            } else if (u < legsEnd) {
                /* 第 leg 段：从第 leg 颗字母的落点弹到第 leg+1 颗（k = 0 → S 落地后 → T） */
                var leg = Math.floor((u - e0) / legW);
                if (leg >= legCount) leg = legCount - 1;
                if (leg < 0) leg = 0;
                var t = ((u - e0) - leg * legW) / legW;
                var fromC = contactOf(bs[leg]);
                var toC = contactOf(bs[leg + 1]);
                var p1 = bezPoint(fromC, toC, t);
                cx = p1.x; cy = p1.y;
            } else {
                /* 敲完 G：从右侧飞出屏幕 */
                var t2 = Math.min(1, (u - legsEnd) / exitW);
                var fromG = contactOf(bs[letters.length - 1]);
                var ease = t2 * t2;
                cx = fromG.x + (window.innerWidth + W - fromG.x) * ease;
                cy = fromG.y - 140 * ease;
            }

            putIcon(cx, cy, sq, angle);   /* 不做避让：路线压到不该碰的字就直接穿过去（图标在文字图层之上） */
        }

        parkIcon();
        requestAnimationFrame(frame);
    })();

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
       text-6：完全出现后整句“往左移”（纯滚轮驱动，能随滚轮倒放）
       ----------------------------------------------------------------------
       需求：这一句（“But small does NOT mean flexible.”）【完全出现】之后，再往下滑一点滚轮，
             整句就开始往左挪一段（默认页面宽度的 5%，距离 = 4.css 的 .text-6 的 --t6-shift），
             挪完就停在那儿，之后照常淡出。

       时间轴（和 1.js 同一套进度单位，秒 = 进度 / window.__home.rate）：
          A ──淡入── H ──再滑 T6_DELAY_SEC 秒── ★开始左移──T6_MOVE_SEC 秒── ★移完──停住── B ──淡出── E

       ★ 计时是【从“完全出现”那一刻（H）往后算】的，不从结尾（B / E）倒推 ——
          所以它完全出现后，滚轮再往下滑一点点就开始动，跟淡出没有关系。
       ★ 移动用 easeOut 曲线（先快后慢），走完就停在 --t6-shift 那个位置上，
          之后一直到淡出都保持这个位置（淡出是原地淡出，不再移动）；
       ★ 往上滚就倒着来：先退回原位，再继续倒着演这一句（和页面完全同步）。
       ★ 淡入 / 刚出现那一小段、以及完全消失之后一律回原位（--t6-u = 0）：
          这样它在窗口外是干干净净的“原位置”，不会影响 1.js 量到的任何东西。

       ★ 两个时间旋钮都在下面：
           T6_DELAY_SEC  完全出现后【还要再滑多少滚轮】才开始（秒；1 秒 ≈ 1000 delta ≈ 滚轮 10 下）
           T6_MOVE_SEC   往左走完全程用多久（秒）
         想出现后立刻动 → T6_DELAY_SEC = 0；想一动就到位 → T6_MOVE_SEC 调小（0.35）。

       ★ 为什么这里只写 --t6-u、位移交给 4.css 去算：
         1.js 每帧都往 .text-6 上写 inline transform（把它钉在锚线上），
         这里再写 transform 会被覆盖掉；4.css 用的是独立的 translate 属性，
         两者叠加、互不干扰（详见 4.css 里 .text-6 那段注释）。
       ★ 不增删任何 DOM、不改字号、不动布局：只是每帧写一个自定义属性。
       ====================================================================== */

    var T6_DELAY_SEC = 0.35;    /* ← 完全出现后【再滑多少滚轮】才开始左移（秒；0 = 立刻开始） */
    var T6_MOVE_SEC  = 0.9;     /* ← 往左走完全程用多久（秒） */

    var t6El = document.querySelector(HOST6);
    if (t6El) {
        var t6Cur = null;       /* 上一帧写进 --t6-u 的值；null = 还没写过 */
        var t6Last = null;      /* 上一帧的页面进度：页面没动就不重算 */

        var t6Ease = function (t) { return 1 - Math.pow(1 - t, 3); };
        var t6Clamp01 = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };

        function paintT6(u) {
            if (u === t6Cur) return;
            t6Cur = u;
            t6El.style.setProperty("--t6-u", String(u));
        }

        function frameT6() {
            requestAnimationFrame(frameT6);

            var home = window.__home;
            if (!home) return;
            if (home.cur === t6Last) return;            /* 页面没动：不做事 */
            t6Last = home.cur;

            var it = itemOf(t6El);                      /* resize 会重建 items，所以每帧找 */
            var rate = home.rate;
            if (!it || !(rate > 0)) { paintT6(0); return; }

            var p = home.cur;
            if (p <= it.A || p >= it.E) { paintT6(0); return; }   /* 窗口外：交还原位 */

            /* ★ 从“完全出现”（H）往后算 —— 不从结尾倒推 */
            var t = (p - it.H) / rate;                            /* 完全出现之后过了几秒 */
            if (t <= T6_DELAY_SEC) { paintT6(0); return; }        /* 刚出现那一小段：原地不动 */

            var u = t6Ease(t6Clamp01((t - T6_DELAY_SEC) / Math.max(1e-6, T6_MOVE_SEC)));
            paintT6(Number(u.toFixed(4)));
        }

        window.addEventListener("resize", function () {
            t6Last = null;      /* 下一帧按新的 H 重算一次（距离走 vw，会自动跟着窗口缩放） */
        });

        requestAnimationFrame(frameT6);
    }

    /* ======================================================================
       text-9：点一下第一个 “cut” → 让这一句对应的视频从头再播一遍
       ----------------------------------------------------------------------
       需求：点了 text-9 里那个放大的 “cut” 之后，这一句配套的视频重新播放。

       ★ 视频是谁：3.js 的图标 10（ICONS 那一条里 host: ".text-9"、src: "./editing.webm"），
         它建出来的结构是
             <div class="bug-icon-slot bug-icon-10 is-pinned">
                 <video class="bug-icon" …>
         所以下面用 ".bug-icon-10 video" 找它 —— 只认【text-9 这一句】的那一段视频，
         别的图标 / 别的视频一概不动。想换成另一段：只改 CUT9_VIDEO 这一行。
       ★ 为什么必须写 currentTime = 0：这段素材是“只播一次、播完定格在最后一帧”
         （3.js 里 autoplay: false / loop: false）。它已经播完的时候直接 play() 什么都不会发生，
         所以先把它拨回第 0 秒，才有“重新播放”的效果；正在播的时候点，就是从头重播。
       ★ metadata 还没到下时写 currentTime 会抛异常 → 用 try/catch 包住，
         真抛了就先 play()，等浏览器自己把进度接上（3.js 的 mediaLive 也会补一次 play）。
       ★ 可点范围：.text-box 是 pointer-events: none（整句都点不到），
         4.css 里只给 .cut9 开了 pointer-events: auto + cursor: pointer ——
         所以只有这个词能点，句子其余部分、页面滚轮、文字选择都不受影响。
       ★ 没视频（3.js 没加载 / 图标 10 被删了）就静默什么都不做，不会报错；
         也不会重复绑（dataset 打标记），4.js 被重复执行也只会绑一次。
       ====================================================================== */
    var CUT9_VIDEO = ".bug-icon-10 video";   /* ← 点 “cut” 之后要重播的那段视频（3.js 的图标 10） */

    var cut9El = document.querySelector(".text-9 .cut9");
    if (cut9El && !cut9El.dataset.cut9Replay) {
        cut9El.dataset.cut9Replay = "1";            /* ★ 只绑一次 */

        cut9El.addEventListener("click", function (e) {
            var v = document.querySelector(CUT9_VIDEO);
            if (!v) return;

            e.preventDefault();                     /* 别触发页面里别的默认行为 */

            /* ① 拨回开头（已经播完、定格在最后一帧的时候必须这一步） */
            try { v.currentTime = 0; } catch (err) { /* metadata 还没到，忽略 */ }

            /* ② 再播。静音 + playsinline 在 3.js 建节点时就设好了，所以浏览器不会拦这次 play() */
            var p = v.play();
            if (p && typeof p.catch === "function") p.catch(function () {});
        });
    }

    /* ======================================================================
       text-9：gene.webm 从【屏幕顶边的右侧】飞进来 → 在半路空中转一圈 → 落在 “where” 正上方
       ----------------------------------------------------------------------
       需求：这一句自己的视频（3.js 的图标 10：editing.webm）播完【第一遍】之后，
             另一段视频 gene.webm 从顶边的右侧飞入、同时淡入，
             在【半路空中】像过山车那样绕一个完整的圈，然后落在 “where” 的正上方；
             之后一直循环播放；鼠标悬停在它上面会淡出名字 “gene”（颜色 / 字体跟随正文）；
             整段由滚轮驱动（往上滚原样倒放），到这一句淡出时跟着一起淡掉。

       时间轴（和 1.js 同一套进度单位，秒 = 进度 / window.__home.rate）：
          A ──淡入── H ──────── 停留 ──────── B ──淡出── E
                        └ ★ 淡入一结束，gene 的出场就完全交给滚轮
                                                       └ 这句淡出（gene 跟着一起淡）

       起点 = H（整句淡入完全结束那一刻）
          · 也就是说：这一句一“完全出现”，滚轮再往下滑一点，gene 就立刻开始飞进来 ——
            【不再去等图标 10 那段视频（editing.webm）播完】，也不读它的时长。
            那段视频还在播也照样飞，两者互不干扰（它是 3.js 的图标，gene 是这里的元素）。
          · ★ 为什么绑在进度上、而不是听视频的 ended 事件：
            这一段要能随滚轮【倒放】。ended 是真实时间的一次性事件，往回滚它不会复位，
            整段就再也放不了了（和 BEGINNING / TNT 同样的取舍：时间归 1.js 的进度）。
          · 落地要多久由 GENE9_FLY_SEC 定（默认 3.2 秒），并且会自动压进
            “H → 开始淡出（B）” 这段时间里，所以这句停留多长都不会飞不完。

       落地：视频是 “where” 那个 <span> 的绝对定位子元素（4.css 的 .text-9 .gene9-wrap），
         所以“正上方”这件事由 CSS 保证（left: 50% + 负 margin 居中、bottom: 100% + gap），
         这里一个像素都不量 —— 窗口缩放 / 字体晚加载都不会错位。

       ★ 路线 = 三段（这才是“半路空中转”的关键）：
            ① 0 → GENE9_LOOP_AT      ：从右上角俯冲到【半路的回环入口】；
            ② 回环入口 → 再花 GENE9_LOOP_DUR ：在原地绕一个完整的圆（过山车大回环）；
            ③ 剩下的行程              ：从回环出口落到 where 正上方，慢慢收住。
         回环入口 = 进入点 → 落点 这条直线上的 GENE9_LOOP_AT 处，所以它天生在【半路】，
         而不是贴着落点转（以前是贴着落点转的，这次按要求挪到半路空中）。
         旋钮：
           GENE9_FROM_VW / GENE9_FROM_VH  进入点（右 / 上，都是相对落点的距离）
           GENE9_LOOP_AT                  回环在哪：0 = 刚进来就绕，1 = 贴着落点绕（默认 0.55 = 半路偏下）
           GENE9_LOOP_DUR                 绕一圈占整段行程的比例（默认 0.30 = 一圈约 0.96 秒，越大越慢）
           GENE9_LOOP_R_VH                回环半径（回环总高 = 2×它；用 vh 折成 px，保证是正圆）
           GENE9_SPINS                    绕几圈（1 = 一个回环；2 = 连转两圈）
         把 GENE9_LOOP_R_VH 调成 0 = 退回“纯斜线俯冲”，没有回环。

       ★ hover 名字 “gene”：外壳 landing 之后 4.js 给它加 .is-landed，
         CSS 里 .gene9-wrap.is-landed:hover .gene9-name 就把名字淡出来；
         名字的颜色 / 字体 / 字距全部 inherit（= 完全跟随正文 .text-box），
         只有字号是 4.css 里 --gene9-name-size 那一个旋钮。

       ★ 这里只写 inline transform / opacity（不动布局、不增删节点）：
           - 淡出不用管：视频在 .text-9 里面，1.js 给整句写 opacity 时会自动带上它，
             所以“视频和 text9 一起淡出”是免费的。
           - transform 也只能写在视频自己身上：1.js 每帧写 transform 的是 .text-box 父盒。
       ★ 视频只在“已经飞进来”的那段时间里 play()，窗口外 / 还没开始就 pause()，
         不白解码（和 3.js 的 mediaLive 是同一个理由）。
       ====================================================================== */

    var GENE9_SRC       = "./gene.webm";   /* ← 要飞进来的视频（相对 index.html 的路径） */
    var GENE9_FLY_SEC   = 3.2;             /* ← 飞入 + 回环 + 落位总共用多少秒（越小越快；调大 = 整体变慢） */
    var GENE9_SPINS     = 1;               /* ← 回环绕几圈：1 = 一个完整的大回环，2 = 连绕两圈 */
    var GENE9_LOOP_R_VH = 6;               /* ← 回环半径（vh；回环总高 = 2×这个数，0 = 不要回环） */
    var GENE9_LOOP_AT   = 0.55;            /* ← 回环在半路的哪个位置：0 = 刚进来就绕，1 = 贴着落点绕 */
    var GENE9_LOOP_DUR  = 0.30;            /* ← 绕一圈占整段行程的比例（越大 = 绕得越慢；0.30 ≈ 0.96 秒一圈） */
    var GENE9_FROM_VW   = 42;              /* ← 进入点离落点【往右】多远（vw；0 = 正上方） */
    var GENE9_FROM_VH   = 40;              /* ← 进入点离落点【往上】多高（vh） */
    var GENE9_GROW      = 0.82;            /* ← 起步时多大（1 = 一路上都是原大小；0.82 = 由小飞到大） */
    var GENE9_FADE_U    = 0.32;            /* ← 行程的前百分之多少里完成淡入（0→1） */
    var GENE9_MIN_FLY   = 0.5;             /* ← 万一窗口太短，飞入也至少保留这么多秒 */
    var GENE9_FIT       = 0.8;             /* ← 飞入最多占“从 H 到开始淡出”这段时间的多少 */
    var GENE9_NAME      = "gene";          /* ← hover 时显示的名字 */

    var gene9Host = document.querySelector(".text-9");
    var gene9Word = gene9Host && gene9Host.querySelector(".where9");
    var gene9Wrap = null;      /* 外壳：飞行 / 淡入 / hover 都作用在它身上 */
    var gene9 = null;          /* 里面那段视频 */
    var gene9NameEl = null;    /* hover 才出现的名字 */

    /* 结构（建一次，之后只改样式；已经建过就不再建）：
         <span class="where9">
             where
             <span class="gene9-wrap">          ← 绝对定位 + 飞行动画
                 <video class="gene9">          ← 视频本体
                 <span class="gene9-name">gene  ← hover 名字（颜色 / 字体继承正文）
             </span>
         </span> */
    if (gene9Word && !gene9Word.querySelector(".gene9-wrap")) {
        gene9Wrap = document.createElement("span");
        gene9Wrap.className = "gene9-wrap";

        gene9 = document.createElement("video");
        gene9.className = "gene9";
        gene9.muted = true;
        gene9.defaultMuted = true;
        gene9.autoplay = false;              /* ★ 不自动播：什么时候播由下面的逐帧循环决定 */
        gene9.loop = true;                   /* ★ 一直循环播放 */
        gene9.playsInline = true;
        gene9.setAttribute("muted", "");
        gene9.setAttribute("playsinline", "");
        gene9.setAttribute("webkit-playsinline", "");   /* 老 iOS 认这个前缀 */
        gene9.setAttribute("preload", "auto");
        gene9.setAttribute("disablepictureinpicture", "");
        gene9.setAttribute("aria-hidden", "true");      /* 纯装饰，读屏器跳过 */
        gene9.controls = false;              /* ★ 绝不能出现 controls 属性，否则会画出一条控制条 */
        gene9.src = GENE9_SRC;

        /* 素材没放对 / 浏览器不支持这种编码 → 记一笔，之后不再 play()，也不报一屏错。
           （页面照旧运行，只是看不到这段飞进来的视频。） */
        gene9.addEventListener("error", function () {
            gene9.__broken = true;
            gene9.style.opacity = "0";
        });

        gene9Wrap.appendChild(gene9);

        gene9NameEl = document.createElement("span");
        gene9NameEl.className = "gene9-name";
        gene9NameEl.textContent = GENE9_NAME;
        gene9NameEl.setAttribute("aria-hidden", "true");   /* 只是 hover 提示，读屏器跳过 */
        gene9Wrap.appendChild(gene9NameEl);

        gene9Word.appendChild(gene9Wrap);
    }

    if (gene9 && gene9Host) {
        var gene9Last = null;       /* 上一帧的页面进度：页面没动就不重算 */
        var gene9Painted = null;    /* 上一帧写进去的 u；null = 还没写过 */
        var gene9Playing = false;   /* 现在是不是在播（用来只在必要的时候 play / pause） */

        function gene9Play(on) {
            if (gene9.__broken) return;               /* 素材加载失败就别再 play() 了 */
            if (on === gene9Playing) return;
            gene9Playing = on;
            if (on) {
                var p = gene9.play();
                if (p && typeof p.catch === "function") p.catch(function () {});
            } else {
                try { gene9.pause(); } catch (err) { /* 还没加载好，忽略 */ }
            }
        }

        /* u：0 = 还在起点（看不见），1 = 已经落位。
           这里只做插值 —— 每一帧都从 cur 重新算，所以往上滚会原样倒着飞回去。 */
        function gene9Paint(u) {
            if (u === gene9Painted) return;
            gene9Painted = u;

            var iw = window.innerWidth;
            var ih = window.innerHeight;

            if (!(u > 0)) {
                /* 还没开始 / 窗口外：收在起点（右上角、透明），并停下解码 */
                gene9Wrap.style.opacity = "0";
                gene9Wrap.style.transform =
                    "translate(" + (GENE9_FROM_VW * iw / 100).toFixed(2) + "px, " +
                    (-GENE9_FROM_VH * ih / 100).toFixed(2) + "px)" +
                    " rotate(0deg) scale(" + GENE9_GROW + ")";
                gene9Wrap.classList.remove("is-landed");   /* 飞回去就不该还能 hover */
                gene9Play(false);
                return;
            }

            gene9Play(true);                                   /* 飞进来了：开始（或继续）循环播 */

            /* ================= 飞行轨迹：三段 = 俯冲 → 半路空中回环 → 落位 =================
               ★ “半路空中转”就是这么来的：回环的入口 G 取在【进入点 → 落点】直线的
                 GENE9_LOOP_AT 处，所以圈是在半路上画出来的，而不是贴着落点。
               ★ 回环本身是“中心点沿着圆走一圈”（不是原地自转）：
                     θ 从 0 走到 360°（GENE9_SPINS 圈就是 720°、1080°），
                     位置 = 圆心 + 半径 × (方向)，于是画出一个真正的立体回环。
               ★ 回环必须是【正圆】：vh / vw 是两个长度单位，1vh ≠ 1vw，
                 一个用 vh 一个用 vw 画出来就是扁椭圆 —— 所以里面全部折成 px 再算。
               ★ 回环角度用 smoothstep 推进（两头慢、中间快）：进环 / 出环都不“卡”。
               ★ 落地那一段也用 smoothstep：从回环里甩出来之后慢慢收住，像真的“落”下来。 */
            var at  = Math.min(0.85, Math.max(0.2, GENE9_LOOP_AT));   /* 回环入口 */
            var dur = Math.min(0.7, Math.max(0.05, GENE9_LOOP_DUR));  /* 绕一圈用掉的比例 */
            if (at + dur > 0.95) dur = Math.max(0.05, 0.95 - at);
            var rest = 1 - (at + dur);                                /* 最后落位那一段 */

            /* 三个点（都相对落点，px）：进入点 E、回环入口 G、落点 (0,0) */
            var ex = GENE9_FROM_VW * iw / 100;
            var ey = -GENE9_FROM_VH * ih / 100;
            var gx = ex * (1 - at);
            var gy = ey * (1 - at);

            var x, y, rot, sc;

            if (u < at) {
                /* ① 俯冲：从右上角冲到半路的回环入口 */
                var e1 = 1 - Math.pow(1 - u / at, 3);              /* easeOutCubic：先冲后收 */
                x = ex + (gx - ex) * e1;
                y = ey + (gy - ey) * e1;
                rot = 0;
                sc = GENE9_GROW + (1 - GENE9_GROW) * e1;
            } else if (u < at + dur) {
                /* ② 回环：在半路空中绕完整一个圆（圆心在入口正上方一个半径处） */
                var t2 = (u - at) / dur;
                var s = t2 * t2 * (3 - 2 * t2);                    /* smoothstep */
                var th = 2 * Math.PI * GENE9_SPINS * s;            /* 回环角度（弧度） */
                var r = GENE9_LOOP_R_VH * ih / 100;                /* 半径折成 px = 正圆 */
                x = gx - r * Math.sin(th);
                y = gy + r * (Math.cos(th) - 1);
                rot = 360 * GENE9_SPINS * s;                       /* 边走边转，绕完正好回正 */
                sc = 1;
            } else {
                /* ③ 落位：从回环出口落到 where 正上方（smoothstep 慢慢收住） */
                var t3 = rest > 1e-6 ? Math.min(1, Math.max(0, (u - at - dur) / rest)) : 1;
                var e3 = t3 * t3 * (3 - 2 * t3);
                x = gx * (1 - e3);
                y = gy * (1 - e3);
                rot = 360 * GENE9_SPINS;
                sc = 1;
            }

            var op = Math.min(1, u / GENE9_FADE_U);                /* 边飞边淡入 */

            gene9Wrap.style.transform =
                "translate(" + x.toFixed(2) + "px, " + y.toFixed(2) + "px)" +
                " rotate(" + rot.toFixed(2) + "deg)" +
                " scale(" + sc.toFixed(3) + ")";
            gene9Wrap.style.opacity = op.toFixed(3);

            /* ★ 只有真正落位之后才挂 .is-landed ——
                 飞的过程中外壳不接鼠标（免得它在半空抢走鼠标 / 挡住下面的字），
                 落定之后才允许 hover 出名字（样式见 4.css）。 */
            gene9Wrap.classList.toggle("is-landed", u >= 0.999);
        }

        function frameGene9() {
            requestAnimationFrame(frameGene9);

            var home = window.__home;
            if (!home) return;
            if (home.cur === gene9Last) return;         /* 页面没动：不做事 */
            gene9Last = home.cur;

            var it = itemOf(gene9Host);                 /* resize 会重建 items，所以每帧找 */
            var rate = home.rate;
            if (!it || !(rate > 0)) { gene9Paint(0); return; }

            var p = home.cur;
            if (p <= it.H || p >= it.E) { gene9Paint(0); return; }   /* 淡入还没走完 / 已经淡出：藏着 */

            /* ① 起点 = H（整句淡入完全结束那一刻）：不再等 editing.webm 播完，
                 也不再读它的时长 —— 淡入一结束，滚轮就直接推动 gene 的出场。 */
            var startP = it.H;

            /* ② 飞多久：默认 GENE9_FLY_SEC 秒，并且自动压进「H → 开始淡出（B）」这段里 */
            var avail = (it.B - startP) / rate;
            var flySec = Math.min(GENE9_FLY_SEC, Math.max(GENE9_MIN_FLY, avail * GENE9_FIT));

            /* ③ 换算成 0→1 的行程（外面夹一下，窗口两端就是 0 / 1） */
            var u = (p - startP) / (flySec * rate);
            gene9Paint(u < 0 ? 0 : (u > 1 ? 1 : u));
        }

        window.addEventListener("resize", function () {
            gene9Last = null;          /* 下一帧按新的 H / B 重算一次 */
        });

        requestAnimationFrame(frameGene9);
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
           ③ BEGINNING 原地出现（视觉大小 PEAK_DESIGN_PX），淡入用 APPEAR_SEC 秒
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

    /* ★ 一出现时的视觉大小：写的是【设计基准 1440 宽下的 304px】，不是死 px。
       以前这里是 304 这个死数，等于“不管屏幕多窄，BEGINNING 出现时都占 304px 高的字”：
         · 1440 宽：basePx = 100px → scale 3.04，字宽约 1326px；
         ·  430 宽：basePx ≈ 30px → 要放大 10 倍才够 304px，那个被 transform 撑开的
            盒子【可滚动区域】还是 1326px 宽 —— 比手机屏宽出三倍多。
       整页的“横向可滚动区域”有一大半就是它撑出来的（右侧那条白缝 / 横向滚动条）。
       现在按 --u 同一个参照系走：peak = 304 × (页宽 ÷ 1440)，
       1440 宽时仍然是整整 304px（视觉一个像素都不变），窄屏 / 宽屏等比缩放。
       （想整体调大 / 调小就改这一个数；它和 4.css 的 --beginning-size 都是设计像素。） */
    var PEAK_DESIGN_PX = 304;
    var APPEAR_SEC = 0.35;  /* ← 出现（淡入）用多久 */
    var SHRINK_SEC = 1.15;  /* ← 从 peak 缩回本来的大小用多久 */
    var MIN_FIT    = 0.35;  /* 万一这句在画面上停留得太短，最短压到原来的 35% */

    var host = document.querySelector(HOST);
    var word = host && host.querySelector(".beginning");
    if (!host || !word || !window.__home) return;

    /* 设计基准宽度：直接读 1.css :root 里的 --design-w（改那一个数这里自动跟着变） */
    function designWidth() {
        var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--design-w"));
        return v > 0 ? v : 1440;
    }

    /* 当前页宽下的 peak 字号（px）= 304 × 页宽 ÷ 1440 —— 和 CSS 的 --u 完全同一个参照系 */
    function peakPx() {
        var de = document.documentElement;
        var vw = de.clientWidth || window.innerWidth || 0;
        return PEAK_DESIGN_PX * (vw / designWidth());
    }

    /* 基准字号取自 4.css（改 --beginning-size，这里自动跟着变） */
    var basePx = parseFloat(getComputedStyle(word).fontSize) || 152;
    /* peak 相对基准字号的倍数（1440 宽下 304 / 100 → 3.04 倍，任何宽度都一样） */
    var peakScale = Math.max(1, peakPx() / basePx);

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
            paint(t / a, peakScale);                  /* 原地按 peak 大小淡入 */
        } else if (t < a + s) {
            var u = easeOut((t - a) / s);             /* peak → 本来的字号 */
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
        peakScale = Math.max(1, peakPx() / basePx);
        lastCur = null;          /* 下一帧重新算一次 */
    });

    requestAnimationFrame(frame);
})();
