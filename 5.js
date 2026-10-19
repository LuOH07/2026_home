/* ==========================================================================
   5.js —【移动端（窄屏 / 手机）专用】脚本，全部移动端逻辑都写在这一个文件里
   --------------------------------------------------------------------------
   桌面版的 1.js ~ 4.js 一个字节都不动。这个文件只干三件事，而且都只在手机断点里生效：

     1. 页尾接续的一段【纯白】（对应 5.css 第 6 节）
        手机上 1.js 写死的 body 高度只有 1900px 上下，整页可滚动行程太短，
        1.js 把 22 段文字依次演一遍的时间轴塞进去，只能把每段压到几十像素 ——
        表现就是"滚一点点进度就到底了，字还一段段没看完"。
        这里按屏幕把"还要在下面再接多长"算出来写进 --m5-blank（5.css 的 body::after
        读它，只留一段纯白、不铺任何图），把【文档可滚动行程】补到
        TARGET_SCROLL 这么长。
        ★ 移动端没有底图了（5.css 第 1 节把 body 的底图整块关掉，
          2.css / 2.js 的背景层也一起下场），所以这里只算长度、不再传图。

     2. 把 22 段文字"摊开"到这段行程上（第 4 节，本文件最核心的一段）
        光接空白还不够：1.js 的规则是"滚到这段文字 CSS top 那一屏它就出场"，
        而 top 是 body 高度的百分比 —— 手机上 body 只有 1943px，
        22 个百分比全挤在 0~1950px 里，于是三四句话同时压在同一条锚线上，
        后面接的那段空白反而滚不到（最远进度只到最后一句话的结尾）。
        所以这里按整页行程给每段文字重算一个 top，让它们从头到尾排开：
        一段文字一段行程，滚到底 = 最后一句演完 = 接的空白正好走完。

     3. 宝剑进度条（对应 5.css 第 2 节）
        PC 上那把剑（= 滚动进度）在手机上也保留：位置由 1.js 按 scrollY 自己算，
        尺寸/行程在 1.css 第 11 节写成了"剑长的倍数"（起点 0.5 个剑长、
        行程 3.5 个剑长），手机直接沿用同一套数，所以和调试好的 PC 一致。
        本文件不碰它。

   ★ 断点必须和 5.css 顶部那条媒体查询一模一样（改要一起改）。
   ★ 想调"整页多长 / 再留多长白"：只改下面的 TARGET_SCROLL。
   ========================================================================== */

(function () {
    "use strict";

    /* ======================= 0. 可调参数 ======================= */

    /* 目标"文档可滚动行程"（px）= 滚轮从页面顶部滚到最底部要走的距离。
       为什么按它算要接多长，而不是写死一个高度：
         · 22 段文字、每段 4.2 秒的窗口，要摊开得能看清，整页行程需要 6000px 上下
           （桌面 1440 宽时正好是 ~6400px，这一页在桌面上就是这么走的）；
         · 手机上 1.js 写死的 body 本身只有 ~1900px，只够 1/3 —— 差的这部分
           用"页尾再接一段纯白"补上（5.css 的 body::after）。
       所以"行程"在任何屏幕尺寸下都差不多，而 body 该多高就多高。
       想更慢 / 更长：调大（8000 更从容）；想更短：调小（5000 更紧凑）。 */
    var TARGET_SCROLL = 6200;

    /* body 尺寸比例（和 1.js 的 updateBodyHeight / 2.css 的 --map-w 一致：
       map-5.avif 是 803 × 4000，1.js 照这个比例写死 body 高度）。
       ★ 移动端已经不显示底图了，但 body 高度仍然是 1.js 按这个比例写的，
         所以文字 / 图标的百分比参照系不变，这里只是拿它算 body 有多高。 */
    var MAP_W = 803;
    var MAP_H = 4000;

    /* 顶部标题视频 title.mp4 是 1280 × 720 → 高度 = 屏宽 × 9/16。
       正文被这段视频的高度（2.css 的 --lead-in）往下推了这么多，
       所以"整页真正的下沿" = 视频高 + body 高。 */
    var VIDEO_RATIO = 9 / 16;

    /* 断点：必须和 5.css 顶部那条 @media 完全一致 */
    var MOBILE_MQ = "(max-width: 820px), (max-width: 1024px) and (max-height: 520px)";

    /* ======================= 1. 工具 ======================= */

    var root = document.documentElement;
    var mq = window.matchMedia(MOBILE_MQ);
    var rafId = 0;
    var layoutCount = 0;      /* 请 1.js 重排过多少次（只给 __m5 调试用） */

    function isMobile() {
        return mq.matches;
    }

    /* 当前屏宽（用 clientWidth：和 1.js 量 body 高度用的是同一个值；
       本页隐藏了系统滚动条，所以它等于窗口宽度） */
    function viewWidth() {
        return root.clientWidth || window.innerWidth || 0;
    }

    /* 1.js 按底图比例写进 body 的那个高度（= 页宽 × 4000 ÷ 803）。
       ★ 底图在移动端已经不画了，但这个高度还在、也还要用：
         它是所有按 % 定位的东西的参照系，也是算"还要接多长白"的基数。 */
    function mapHeight() {
        return viewWidth() * MAP_H / MAP_W;
    }

    /* 顶部视频的高度（= 1.js 写进 --lead-in 的那个值） */
    function leadInHeight() {
        return Math.round(viewWidth() * VIDEO_RATIO);
    }

    /* ---- 保险：5.css 没被引入时自己补一个 ----
       移动端效果一半在 5.css（字号 / 居中 / 图标中线 / 页尾白段的高度）、
       一半在本文件（白段长度 / 文字摊开），两个都要 index.html 引入。
       万一只引了 5.js（或者顺序写错、路径写错），这里补一个 <link> 指向同目录的
       5.css，免得出现"字放大了但没居中"这种半截状态。
       ★ 已经引过 5.css 就什么都不做，不会重复加载。 */
    function ensureStylesheet() {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute("href") || "";
            if (/(^|\/)5\.css(\?|#|$)/.test(href)) return;
        }
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "./5.css";
        link.setAttribute("data-m5", "auto");
        document.head.appendChild(link);
    }

    /* ======================= 2. 页尾接续的一段纯白 =======================
       ★ 移动端没有底图了（5.css 第 1 节把 1.js 写在 body 上的底图整块关掉，
         2.css 的 structure 层和 2.js 的背景视频也一起 display: none），
         所以这段只接"高度"、不接任何图：5.css 的 body::after 拿 --m5-blank
         留一段和 body 同色的纯白。这里也不再往 CSS 传图片地址 / 铺图周期。 */

    /* 接续长度 = 目标行程 + 视口高 − body 高 − 视频高。
       （文档可滚动行程 = 文档总高 − 视口高 = 视频高 + body 高 + 接续长 − 视口高，
         让它等于 TARGET_SCROLL 就解出下面这个式子。）
       ★ 算出来是负数（屏幕特别高）就不接：0 = 不需要再接。 */
    function blankLength() {
        var vh = window.innerHeight || root.clientHeight || 0;
        return Math.max(0, TARGET_SCROLL + vh - mapHeight() - leadInHeight());
    }

    /* 写进 --m5-blank（5.css 的 body::after 用它当"再接多长"）。
       桌面宽度下把这个变量删掉，让 5.css 的媒体查询整段失效。 */
    function applyBlank() {
        if (!isMobile()) {
            if (root.style.getPropertyValue("--m5-blank")) {
                root.style.removeProperty("--m5-blank");
                return true;
            }
            return false;
        }

        var px = Math.round(blankLength()) + "px";
        if (root.style.getPropertyValue("--m5-blank") === px) return false;
        root.style.setProperty("--m5-blank", px);
        return true;
    }

    /* ======================= 4. 把 22 段文字"摊开"到整页行程上 =======================
       为什么必须做这一步（本文件最核心的一段）：
         1.js 的规则是"每段文字在滚到它 CSS top 那一屏时出场"（top 是相对 body 高度的 %）。
         桌面上 body 有 7173px 高，22 句话的 top 摊在 0~6400px 里，正好一段一段来；
         手机上 body 只有 1943px，这 22 个 % 全挤在 0~1950px 里，
         而每段文字的窗口（淡入 0.6s + 停留 3s + 淡出 0.6s）却要占 250px 上下 ——
         于是相邻三、四句同时出现在同一条锚线上（字压字），
         而页面下面接的那段空白根本滚不到（1.js 的最远进度只到最后一句话的结尾）。
       做法：
         手机断点里，按【当前屏宽下的总行程】重新给每段文字算一个 top，
         让它们从头到尾均匀排开（第一段在顶部视频下面，最后一段正好在页面底部收尾），
         再请 1.js 重排一次。这样：
           · 每句话单独占一段行程，不会互相压在一起；
           · 可滚动行程被完整用满 —— 滚到底 = 最后一句演完，进度正好走完；
           · 那 4000 多 px 的"页尾白段"就变成了段与段之间的呼吸，而不是滚不到的死区。
       ★ 只改 .text-box 的 inline top（等于"它什么时候出场"），
         屏幕上文字的竖直位置仍然由 1.js 钉在锚线上，一个字都没挪。 */

    /* 页面上所有随滚动出场的文字，按 DOM 顺序 = 作者写的先后顺序 */
    function textEls() {
        return Array.prototype.slice.call(document.querySelectorAll(".text-box"));
    }

    /* 当前屏宽下，"整页最多能滚多少像素"（= 1.js 的 pageMaxScroll()）：
       顶部视频 + body 高度 + 页尾白段 − 视口高。
       ★ 空白是按 TARGET_SCROLL 反推的，所以正常情况下它就等于 TARGET_SCROLL。 */
    function currentLimit() {
        var vh = window.innerHeight || root.clientHeight || 0;
        return Math.max(0, leadInHeight() + mapHeight() + blankLength() - vh);
    }

    /* 每段文字"该在第几像素开始淡入"（进度 / 页面像素，两者在这个页面里是 1:1）：
         第一段：顶部视频刚滚过去一点（lead-in + 40）
         最后一段：整页行程末端再往回让出一个窗口（保证它演完正好贴到页底）
         中间：均匀插值
       ★ 一个窗口 ≈ 4.2 秒 × 播放速度；播放速度 ≈ 行程 ÷ 总秒数，
         总秒数 ≈ 段数 × (4.2 + 0.4 间隔)，所以窗口 ≈ 0.92 × 行程 ÷ 段数。 */
    function desiredArrivals(n) {
        var L = currentLimit();
        var win = 0.92 * L / Math.max(1, n);
        var first = Math.max(0, leadInHeight() + 40);
        var last = Math.max(first + win, L - win);
        var step = n > 1 ? (last - first) / (n - 1) : 0;
        var out = [];
        for (var i = 0; i < n; i++) out.push(first + i * step);
        return out;
    }

    /* 先按目标值给一版 top（还没量过也能用：1.js 第一遍 layout 就会按它排） */
    function applyTextTops() {
        var els = textEls();
        if (!els.length) return false;

        if (!isMobile()) {
            /* 桌面宽度：把我们写过的内联 top 全部摘掉，交还给 1.css 的百分比 */
            var cleared = false;
            els.forEach(function (el) {
                if (el.style.top) { el.style.top = ""; cleared = true; }
            });
            return cleared;
        }

        var want = desiredArrivals(els.length);
        var changed = false;
        els.forEach(function (el, i) {
            var px = Math.round(want[i]) + "px";
            if (el.style.top !== px) { el.style.top = px; changed = true; }
        });
        return changed;
    }

    /* 用 1.js 真正量到的 A（这段开始淡入的进度）反过来校正 top。
       为什么需要校正：1.js 的到达点 = top + h/2 − 锚线高度，
       有的句子命中 ANCHOR_OVERRIDES、有的用 ANCHOR_RATIO 0.4，
       偏移量每句都不一样（几十到三百像素），一次校正就能对上（关系是线性的）。
       ★ 最多两轮：第一轮把误差补掉，第二轮只做验证。 */
    function refineTextTops() {
        if (!isMobile()) return;                                  /* 桌面：一个字都不碰 */
        var home = window.__home;
        if (!home || !home.items || !home.items.length) return;    /* 1.js 还没量过 */
        var els = textEls();
        if (!els.length) return;

        var want = desiredArrivals(els.length);

        for (var pass = 0; pass < 2; pass++) {
            home.layout();
            layoutCount++;
            var worst = 0;
            var items = home.items;
            els.forEach(function (el, i) {
                var it = null;
                for (var k = 0; k < items.length; k++) {
                    if (items[k].el === el) { it = items[k]; break; }
                }
                if (!it) return;
                var err = want[i] - it.A;
                if (Math.abs(err) > worst) worst = Math.abs(err);
                var cur = parseFloat(el.style.top);
                if (!isFinite(cur)) cur = 0;
                el.style.top = Math.round(Math.max(0, cur + err)) + "px";
            });
            if (worst < 4) break;
        }

        home.layout();
        layoutCount++;
        if (typeof home.render === "function") home.render();
    }

    /* ======================= 5. 应用 / 监听 ======================= */

    /* 一次性应用（needRelayout：这一轮要不要请 1.js 重排）
       ★ 顺序很重要：先把白段长度 / 文字的 top 全部写好，最后再让 1.js 量一次，
         它量到的就是新布局（1.js 的 layout 只读当前 DOM，不会反过来改 top）。
       ★ 移动端没有底图，所以这里不再有"把图片地址交给 CSS"那一步。 */
    function apply(needRelayout) {
        applyBlank();
        applyTextTops();
        if (needRelayout) refineTextTops();
    }

    /* 同一帧里多次调用只跑一次（resize 会连着触发好几次） */
    function scheduleApply() {
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
            rafId = 0;
            apply(true);
        });
    }

    /* ---- 等 1.js 真正量过一次 ----
       1.js 是"底图 onload + 字体就绪"之后才 layout() 的，时机比 window.load 晚
       （底图是它自己 new Image() 加载的，不会拖住 window.load；
          ★ 移动端虽然不画这张图了，1.js 仍旧会加载它来量尺寸，所以这一步照旧要等）。
       所以拿它量到的数据校正 top 这件事，得等它出现：
         有 items 了 → 校一次；还没有 → 200ms 后再看（最多 ~30 秒，之后交给 resize）。
       ★ 那张图在远端的 CDN 上，网络慢的时候十几秒都有可能，所以这里给的时间比较宽；
         校一次就停（不重复跑），平时完全感觉不到。 */
    var waitTries = 0;
    function waitForHome() {
        var home = window.__home;
        if (home && home.items && home.items.length) {
            apply(true);          /* 校正 top + 让 1.js 按新布局重排 */
            return;
        }
        if (waitTries++ < 150) setTimeout(waitForHome, 200);
    }

    /* 初始化：脚本在 body 末尾执行，body / 宝剑容器（1.js 建的）都已经在了。
       这一轮只写"第一版"（页尾白段的长度 + 文字 top 的目标值），
       1.js 第一遍 layout 就会按它排；真正的校正交给 waitForHome / load。 */
    ensureStylesheet();
    apply(false);

    /* 窗口尺寸变了（含手机横竖屏切换）：重算接续长度 + 重排 */
    window.addEventListener("resize", scheduleApply, { passive: true });

    /* 断点跨越（桌面 ↔ 手机）：只靠 resize 有时候赶不上（比如某些 devicePixelRatio
       变化不会触发 resize），媒体查询自己还有 change 事件，两个都听。 */
    if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", scheduleApply);
    } else if (typeof mq.addListener === "function") {
        mq.addListener(scheduleApply);
    }

    /* 页面完全就绪（图片 / 字体 / 视频首帧都到齐）后再校一次 */
    if (document.readyState === "complete") {
        scheduleApply();
    } else {
        window.addEventListener("load", scheduleApply, { once: true });
    }

    /* 再挂一个"等 1.js 量完"的轮询（见上面 waitForHome 的说明） */
    waitForHome();

    /* ======================= 6. 调试接口（只读） ======================= */

    /* 控制台里 __m5 可以看当前算出来的白段长度 / 行程，方便对着调 TARGET_SCROLL：
         __m5.blank       现在页尾白段有多长（px）
         __m5.scroll      当前文档的可滚动行程（px）
         __m5.target      目标行程（px）
         __m5.layouts     5.js 请 1.js 重排过几次
         __m5.reapply()   手动重算一次（改完参数后不用刷新） */
    window.__m5 = {
        get blank() { return Math.round(parseFloat(root.style.getPropertyValue("--m5-blank")) || 0); },
        get scroll() { return Math.max(0, root.scrollHeight - window.innerHeight); },
        get target() { return TARGET_SCROLL; },
        get mobile() { return isMobile(); },
        get layouts() { return layoutCount; },
        reapply: function () { waitTries = 0; apply(true); }
    };
})();
