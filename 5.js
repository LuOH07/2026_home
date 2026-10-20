/* ==========================================================================
   5.js —【移动端（窄屏 / 手机）专用】脚本，全部移动端逻辑都写在这一个文件里
   --------------------------------------------------------------------------
   桌面版的 1.js ~ 4.js 一个字节都不动。这个文件只干五件事，而且都只在窄屏断点里生效
   （窄屏 = 屏幕宽 ≤ 高，见下面 ★ 断点那一条）：

     1 & 2. 页尾接续的底图 + 把 22 段文字排开（对应 5.css 第 6 节 / 本文件第 4 节，
            这是本文件最核心的一段）
        手机上底图只有 1900px 上下，1.js 的 22 段文字 top 又都是底图高度的百分比，
        全挤在 0~1950px 里 → 三四句同时压在同一条锚线上，接续的底图也滚不到。
        所以窄屏上把每段文字的 top 改成【按时间轴算出来的像素】：
          · 先量出每段自己的窗口（1.js 的 E − A = 它自己的秒数 × 速度）；
          · 按【窗口 + MIN_GAP_PX】一段段往后排，谁也不压谁（这是硬要求）；
          · 页长（= 可滚动行程）= 最后一段演完 + 收尾行程，
            再由页长反推"页尾再接多长底图"，写进 --m5-blank
            （5.css 的 body::after 读它，用 repeat-y 一张接一张铺满）——
            也就是说【底图长度跟着动效的滚轮长度走】，而不是把动效压进一个固定长度；
          · 顺便把底图地址交给 CSS（--m5-map），接续段和正片用同一张图、同一套缩放。

     3. 宝剑进度条（对应 5.css 第 2 节）
        PC 上那把剑（= 滚动进度）在手机上也保留：位置由 1.js 按 scrollY 自己算，
        尺寸/行程在 1.css 第 11 节写成了"剑长的倍数"（起点 0.5 个剑长、
        行程 3.5 个剑长），手机直接沿用同一套数，所以和调试好的 PC 一致。
        本文件不碰它。

     4. 标题视频（title.mp4）竖直居中（样式在 5.css 第 0/7 节，本文件只负责"量"）
        PC 上它贴在文档最顶端；窄屏上让它上下留白、中心线正对屏幕竖直中线。
        摆位置的是纯 CSS：--m5-title-pad = (100vh − 视频高) ÷ 2（视频 top），
        --lead-in = 空白 + 视频高（!important 压过 1.js 写的内联值）——
        于是底图 / 文字 / 图标 / 人物视频跟着整体下移，视频下沿仍然是底图起点，
        后面的顺序一点没变，首屏只是"上面多了一块白、视频落在正中间"。
        本文件只读不写：量出视频上面那块留白（titlePad），
        用来算页尾还要接多长（titlePad 已经含在 --lead-in 里，行程不变）。

     5. 滚动快 5 倍（第 3 节②）
        同样的手指滑动 / 滚轮距离，页面走 5 倍远（滚到底的滑动次数变成 1/5）。
        只改 1.js 的"输入 → 进度"倍率，时间轴（每段文字的时长、视频播放）不动；
        断点切回桌面时自动设回 1，PC 手感一个像素都不变。

     6. 滚动位置取整（第 3 节③，修"标题视频滚动时上下抖 / 露黑底"）
        1.js 每帧 scrollTo 的是平滑插值出来的【小数】位置。手机上带着一整页底图，
        小数偏移会让浏览器每帧按新的亚像素位置重新栅格化；标题视频又是单独一层，
        于是它和页面差半像素 —— 滚动时看起来在抖，边上还会露出黑底。
        这里把 top 四舍五入成整像素（配合 5.css 第 7 节③ 给视频容器提层），
        只抹掉小数（最多 0.5px），滚动映射 / 时间轴 / 冻结区一点都不动；
        宽屏（PC）原样转给浏览器，一个像素都不改。

   ★ 断点必须和 5.css 顶部那条媒体查询一模一样（改要一起改）：
     分界线是【屏幕宽 : 高 = 1 : 1】—— 宽 ≤ 高 = 窄屏走移动端，宽 > 高 = 宽屏走 PC 端。
     所以这里用 (max-aspect-ratio: 1/1)，和像素宽度无关。
   ★ 想调"每两段之间空多长 / 再接几张底图"：只改下面的 MIN_GAP_PX（页长会跟着变）。
   ★ 想调手机上的滚动快慢：改下面的 MOBILE_INPUT_SPEED（1 = 和 PC 一样快）。
   ★ 手机滚动还有"抖 / 黑底"想试试别的：把下面的 SNAP_SCROLL_TO_PX 改成 false
     （只关掉取整，5.css 里给视频容器提层的那几行仍然有效）。
   ========================================================================== */

(function () {
    "use strict";

    /* ======================= 0. 可调参数 ======================= */

    /* 起始页长（px）：第一次 apply（还没量到任何文字）时先用它，等 1.js 量过一遍以后，
       真实页长由"一段窗口 + 一段空档"算出来（见第 4 节的 pageLen / planTimeline）。
       为什么不再写死：必须优先保证所有文字完整、不重叠地演完 —— 页长是结果，不是输入。
       想更紧凑 / 更从容：改下面的 MIN_GAP_PX（每两段之间至少留多少滚动距离）。 */
    var TARGET_SCROLL = 6200;

    /* ---- 手机上的"文字摊开"参数（页长会跟着这两项自动算，见第 4 节）----
       MIN_GAP_PX：相邻两段之间【至少】留多长的滚动距离（px）。
         1.js 里两段之间的设计间隔是 0.4 秒 ≈ 40px（名义速度 100px/s），
         这里给 48px，把 0.4 秒的余量也留出来，保证不会"前一段还没走完后一段就上来了"。
       TAIL_SECONDS：最后一段完全消失后，页面还要留多少秒的行程（和 1.js 的
         TAIL_SECONDS = 1.5 一致；它决定"滚到底"落点，写在这里只是为了让页长刚好收尾）。 */
    var MIN_GAP_PX = 48;
    var TAIL_SECONDS = 1.5;

    /* 当前页长（px，= 整页可滚动行程）。宽屏用不到；窄屏由 settleTextTimeline() 算出来。 */
    var pageLen = TARGET_SCROLL;

    /* 手机上的"输入倍率"：同样的手指滑动 / 滚轮距离，页面走 5 倍远。
       ★ 只乘在"输入 → 进度"那一层（1.js 的 __home.setInputScale），时间轴不动：
         每段文字的淡入淡出 / 视频播放还是原来那套，只是滑同样的距离走得更远。
       ★ 切回桌面断点时自动设回 1（见 applyInputSpeed），PC 手感一个像素都不变。 */
    var MOBILE_INPUT_SPEED = 5;

    /* 窄屏上把"页面滚动位置"取整到整像素（见第 3 节③）。
       1.js 每帧 scrollTo 的是小数，取整只抹掉小数（最多差 0.5px）；
       视频滚动时抖 / 露黑底就是"小数位置 + 视频单独一层"造成的。
       ★ 想回到原来的行为：改成 false（只关取整，5.css 里给视频容器提层的那几行仍然生效）。 */
    var SNAP_SCROLL_TO_PX = true;

    /* 底图原始尺寸（和 1.js 的 updateBodyHeight / 2.css 的 --map-w 一致：
       map-5.avif 是 803 × 4000）。用来算"底图在当前屏宽下有多高"。 */
    var MAP_W = 803;
    var MAP_H = 4000;

    /* 顶部标题视频 title.mp4 是 1280 × 720 → 高度 = 屏宽 × 9/16。
       底图被这段视频的高度（2.css 的 --lead-in）往下推了这么多，
       所以"整页真正的下沿" = 视频高 + 底图高。
       ★ 窄屏上视频上面还多一块居中留白（见下面 titlePad），它也算在 --lead-in 里。 */
    var VIDEO_RATIO = 9 / 16;

    /* 断点：必须和 5.css 顶部那条 @media 完全一致
       ——【屏幕宽 : 高 = 1 : 1】就是分界线：
          宽 ≤ 高（竖屏 / 方屏 / 竖着的窗口）→ 移动端；
          宽 > 高（横屏 / 平板横放 / 桌面窗口）→ PC 端。
       用比例而不是 px：以前"≤820px 或 矮于 520px"会把 844×390 算移动端、
       900×390 算 PC，同一台设备转屏就换一套排版；现在只有这一条规则。 */
    var MOBILE_MQ = "(max-aspect-ratio: 1/1)";

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

    /* 标题视频的高度（16:9 → 屏宽 × 9/16；1.js 的 sizeTopVideo 也是这么写的） */
    function titleHeight() {
        return Math.round(viewWidth() * VIDEO_RATIO);
    }

    /* ---- 标题视频上面那块居中留白（= 屏幕竖直居中用的空白）----
       位置本身由 5.css 写（第 0 节的 --m5-title-pad / --m5-title-top，
       --lead-in = 留白 + 视频高），本文件不往回写，只负责把它【量出来】：
       下面算页尾还要接多长、每段文字排在哪，都要知道"内容相对文档顶端下移了多少"。
       具体的量法见第 3 节① 的 titlePad()（直接读视频的实际位置）。 */

    /* 整页内容相对文档顶端的下移量 = 视频上留白 + 视频高（= 2.css 的 --lead-in）。
       ★ 5.css 的 body::after 用 --m5-blank 接着铺底图，而 blankLength() 用的是这个值，
         所以页长（pageLen）不受这块留白影响 —— 它只是把整段内容的起点往下推。 */
    function leadInHeight() {
        return titlePad() + titleHeight();
    }

    /* ---- 保险：5.css 没被引入时自己补一个 ----
       移动端效果一半在 5.css（字号 / 居中 / 图标中线 / 接续底图的高度）、
       一半在本文件（接续长度 / 底图地址 / 文字摊开），两个都要 index.html 引入。
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

    /* ======================= 2. 页尾接续的底图 ======================= */

    /* 接续长度 = 当前页长 + 视口高 − 底图高 − 视频高。
       （文档可滚动行程 = 文档总高 − 视口高 = 视频高 + 底图高 + 接续长 − 视口高，
         让它等于 pageLen 就解出下面这个式子。）
       ★ pageLen 在窄屏上是【算出来的】（一段窗口 + 一段空档，见第 4 节），
         所以"底图接多长"永远跟着文字动效的实际需要走；宽屏不写这个变量。
       ★ 5.css 的 body::after 把这段高度拿去 repeat-y 铺底图：一张、两张……
         最后一张不足一张就只露出上半截，页面末尾正好是它被切断的地方。
       ★ 算出来是负数（屏幕特别高、底图特别高）就不接：0 = 不需要再接。 */
    function blankLength() {
        var vh = window.innerHeight || root.clientHeight || 0;
        return Math.max(0, pageLen + vh - mapHeight() - leadInHeight());
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

    /* ---- 把底图地址交给 CSS（--m5-map）----
       1.js 顶上有一个 const BG_URL = "…/map-5.avif"，页面的底图就是它。
       接续段必须用【同一张图】，所以这里直接读它，读不到再用同一个地址兜底
       （这样以后 1.js 换底图，接续段自动跟着换，不用改两处）。
       ★ 顶层的 const 不是 window 的属性，而且它没初始化时 typeof 也会抛错，
         所以整段包在 try 里。 */
    var MAP_URL_FALLBACK = "https://static.igem.wiki/teams/6059/wiki/home/map-5.avif";

    function mapUrl() {
        try {
            if (typeof BG_URL === "string" && BG_URL) return BG_URL;
        } catch (err) { /* 1.js 还没跑 / 被改名：用兜底地址 */ }
        return MAP_URL_FALLBACK;
    }

    function applyMap() {
        if (!isMobile()) {
            var cleared = false;
            if (root.style.getPropertyValue("--m5-map")) {
                root.style.removeProperty("--m5-map");
                cleared = true;
            }
            if (root.style.getPropertyValue("--m5-tile")) {
                root.style.removeProperty("--m5-tile");
                cleared = true;
            }
            return cleared;
        }

        var changed = false;

        var val = 'url("' + mapUrl() + '")';
        if (root.style.getPropertyValue("--m5-map") !== val) {
            root.style.setProperty("--m5-map", val);
            changed = true;
        }

        /* --m5-tile = 一张底图铺开后的高度（= body 高度 = 屏宽 × 4000 ÷ 803）。
           5.css 用它给每张交接处画一条 2px 白线，盖掉底图自带的那条 1px 灰边；
           周期必须和实际铺出来的高度完全一致，否则白线会一张一张跑偏。 */
        var tile = Math.round(mapHeight()) + "px";
        if (root.style.getPropertyValue("--m5-tile") !== tile) {
            root.style.setProperty("--m5-tile", tile);
            changed = true;
        }

        return changed;
    }

    /* ======================= 3. 窄屏专属的两件事 =======================
       ① 标题视频竖直居中（样式全在 5.css 第 0/7 节，本文件只负责把这块留白量出来）
       ② 滚动快 5 倍（只改“输入 → 进度”，时间轴不动）
       ③ 滚动位置取整（只把小数抹掉，修"标题视频滚动时上下抖 / 露黑底"） */

    /* ---- ① 标题视频竖直居中：把上面那块留白量出来 ----
       5.css 第 0 / 7 节已经用纯 CSS 摆好位置了（不用等 JS，也不会和 1.js 抢）：
         · --m5-title-pad = (100vh − 100vw×9/16) ÷ 2   （视频上面那块白）
         · --m5-title-top = --m5-title-pad             （.top-video-wrap 的 top）
         · --lead-in      = --m5-title-pad + 视频高    （!important 压过 1.js 的内联值）
       于是视频中心线 = 屏幕竖直中线，视频下沿仍然是底图起点，下面一切照旧。
       本文件【不写这几个值】，只在算接续长度 / 文字出场点时把它们量出来：
       直接读视频自己的实际位置（滚动偏移补回去），量到的就是 CSS 摆出来的那个数。
       ★ 量不到（元素还没建好 / 5.css 没引入）就按同一个式子兜底，结果一样。 */
    function titlePad() {
        if (!isMobile()) return 0;

        var el = document.querySelector(".top-video-wrap");
        if (el) {
            var top = el.getBoundingClientRect().top + (window.pageYOffset || root.scrollTop || 0);
            if (isFinite(top) && top > 0) return Math.round(top);
        }

        var vh = window.innerHeight || root.clientHeight || 0;
        return Math.max(0, Math.round((vh - titleHeight()) / 2));
    }

    /* ---- ② 滚动快 5 倍 ----
       "滚轮 / 手指滑动 → 页面走多远"的那个倍率由 1.js 的 __home.setInputScale() 控制，
       这里在窄屏断点里设成 MOBILE_INPUT_SPEED（5），切回宽屏（PC）断点设回 1。
       ★ 每段文字的淡入淡出、视频播放这些"秒"一点都不动（倍率只乘在输入那一层）。 */
    function applyInputSpeed() {
        var home = window.__home;
        if (!home || typeof home.setInputScale !== "function") return false;
        var want = isMobile() ? MOBILE_INPUT_SPEED : 1;
        if (home.inputScale === want) return false;
        home.setInputScale(want);
        return true;
    }

    /* ---- ③ 滚动位置取整（只在窄屏）----
       1.js 的 tick 每帧写的是平滑插值出来的【小数】位置（例如 1234.37px），
       浏览器就按亚像素平移整页：底图 / 文字没事，但 <video> 是单独一层，
       它按设备像素吸附，于是和文档差半个像素 —— 滚动时就是"视频在抖"，
       抖动时它那一层没盖住的边露出黑底（原因详见 5.css 第 7 节③）。
       这里把 scrollTo 的 top 四舍五入到整像素：
         · 只抹掉小数（差 ≤ 0.5px），滚动映射 / 时间轴 / 冻结区 / 输入倍率都不动；
         · 整像素位置浏览器可以直接复用刚画好的那一帧，视频那一层不再每帧重吸附；
         · 宽屏（PC）直接把参数原样转给浏览器 —— PC 的滚动位置一个像素都不改。
       ★ 想关掉：把上面 SNAP_SCROLL_TO_PX 改成 false。 */
    function installScrollSnap() {
        var nativeScrollTo = window.scrollTo;
        if (!nativeScrollTo || nativeScrollTo.__m5snap) return;

        function snapPx(v) {
            var n = Number(v);
            return isFinite(n) ? Math.round(n) : v;
        }

        function snapped(a, b) {
            /* 宽屏 / 关掉开关：原样转给浏览器 */
            if (!isMobile() || !SNAP_SCROLL_TO_PX) return nativeScrollTo.apply(window, arguments);

            /* 1.js 用的是 scrollTo({ left, top, behavior }) 这种对象写法 */
            if (arguments.length === 1 && a && typeof a === "object") {
                var opt = { top: snapPx(a.top) };
                if (a.left !== undefined) opt.left = a.left;
                if (a.behavior) opt.behavior = a.behavior;
                return nativeScrollTo.call(window, opt);
            }

            /* 老写法 scrollTo(x, y) */
            if (arguments.length >= 2) return nativeScrollTo.call(window, a, snapPx(b));

            return nativeScrollTo.apply(window, arguments);
        }

        snapped.__m5snap = true;
        window.scrollTo = snapped;
    }

    /* ======================= 4. 把 22 段文字"摊开"到整页行程上 =======================
       为什么必须做这一步（本文件最核心的一段）：
         1.js 的规则是"每段文字在滚到它 CSS top 那一屏时出场"（top 是相对底图高度的 %）。
         桌面上底图有 7173px 高，22 句话的 top 摊在 0~6400px 里，正好一段一段来；
         手机上底图只有 1943px，这 22 个 % 全挤在 0~1950px 里，
         于是相邻三、四句同时出现在同一条锚线上（字压字），
         而页面下面接的那几张底图根本滚不到（1.js 的最远进度只到最后一句话的结尾）。

       ★ 现在必须优先保证：22 段全部完整演完、任意两段不同时出现在锚线上。
         做法是"页长跟着动效走"，而不是把动效压进一个固定页长：
           1. 量出每段自己的窗口 = 1.js 的 E − A（= 它自己的 淡入+停留+淡出 秒数 × 速度）；
           2. 按【窗口 + MIN_GAP_PX】一段一段往后排，得到每段该在第几像素出场；
           3. 页长 = 最后一段演完 + TAIL_SECONDS 的收尾行程；
              再由页长反推"页尾再接多长底图"（--m5-blank）——
              底图的长度就是跟着动效的滚轮长度走的；
           4. 写 top → 请 1.js 重排 → 再量一遍（改页长会微调速度 → 窗口变一点点），
              反复两三遍，直到"所有相邻空档 ≥ MIN_GAP_PX、最后一段不越过页底"。
       ★ 为什么不再"平均摊开"：1.js 的 AUTO_FIT 会把整页长度尽量换成速度，
         平均摊开留下的空档只有几像素，屏宽 / 字高 / 设备稍一变化就挤在一起
         （原来最后两段就是被末尾那条"必须在页底前演完"的夹取顶到同一时刻的）。
         现在空档是写死的像素，页长由它反推 —— 空档是硬保证。
       ★ 只改 .text-box 的 inline top（等于"它什么时候出场"），
         屏幕上文字的竖直位置仍然由 1.js 钉在锚线上，一个字都没挪。
       ★ 宽屏（PC）这一段一条都不跑：PC 的 top 是 1.css 里的百分比，5.js 不碰。 */

    /* 页面上所有随滚动出场的文字，按 DOM 顺序 = 作者写的先后顺序 */
    function textEls() {
        return Array.prototype.slice.call(document.querySelectorAll(".text-box"));
    }

    /* 当前屏宽下，"整页最多能滚多少像素"（= 1.js 的 pageMaxScroll()）：
       顶部视频 + 底图 + 页尾空白 − 视口高。
       ★ 空白是按 pageLen 反推的，所以正常情况下它就等于 pageLen。 */
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

    /* 页面此刻真实的"可滚动行程"（验证最后一段有没有越界用；和 1.js 的式子一致） */
    function pageMaxNow() {
        return Math.max(0, root.scrollHeight - (window.innerHeight || root.clientHeight || 0));
    }

    /* 名义播放速度（fitScale = 1 时的速度）。
       1.js 的 __home.rate = 名义速度 × fitScale，fitScale 会按整页长度自动下调，
       所以 rate ÷ fitScale 就是名义值（= REF_WHEEL_RATE × WHEEL_SPEED = 100px/s）。
       ★ 按名义速度排时间轴，AUTO_FIT 才会停在名义速度上：窗口长度才是"设计的那几秒"
         （4.2s × 100px/s = 420px），空档才是我们写死的像素；
         按被压过的速度排，AUTO_FIT 会把多出来的长度又变成速度，空档会被重新吃掉。 */
    function nominalRate() {
        var home = window.__home;
        if (!home) return 0;
        var r = Number(home.rate) || 0;
        var f = Number(home.fitScale) || 0;
        if (r > 0 && f > 0 && isFinite(f)) return r / f;
        return r;
    }

    /* 时间轴计划：tops[i] = 第 i 段该在第几像素开始淡入；len = 整页页长
         tops[i] = 第一段位置 + Σ(前面每段的窗口 + MIN_GAP_PX)
         len     = 最后一段窗口结束 + TAIL_SECONDS × 名义速度
       ★ 窗口用名义速度换算：secs = (E − A) ÷ 当前速度，再 × 名义速度。 */
    function planTimeline(items) {
        var nominal = nominalRate();
        var rate = Number(window.__home && window.__home.rate) || 0;
        if (!(nominal > 0) || !(rate > 0) || !items || !items.length) return null;

        var first = leadInHeight() + 40;
        var tops = [];
        var cur = first;
        for (var i = 0; i < items.length; i++) {
            tops.push(cur);
            var secs = Math.max(0.05, (items[i].E - items[i].A) / rate);
            cur += secs * nominal + MIN_GAP_PX;
        }
        return { tops: tops, len: cur - MIN_GAP_PX + TAIL_SECONDS * nominal };
    }

    /* 把计划写进 DOM：先写页长（--m5-blank），再写每段的 inline top。
       ★ inline top 用"量到的 offsetTop − 当前 inline top"换算偏移底数，
         不依赖 lead-in / 锚线的具体数值（1.js 里 A 就等于 top0）。 */
    function applyTimeline(plan) {
        var home = window.__home;
        if (!home || !plan || !home.items || !home.items.length) return false;
        var items = home.items;
        var changed = false;

        for (var i = 0; i < items.length && i < plan.tops.length; i++) {
            var el = items[i].el;
            var inlineTop = parseFloat(el.style.top);
            if (!isFinite(inlineTop)) inlineTop = 0;
            var base = items[i].top - inlineTop;      /* offsetTop = base + inline top */
            var px = Math.round(Math.max(0, plan.tops[i] - base)) + "px";
            if (el.style.top !== px) { el.style.top = px; changed = true; }
        }

        if (Math.abs(pageLen - plan.len) > 0.5) {
            pageLen = plan.len;
            applyBlank();
            changed = true;
        }
        return changed;
    }

    /* 排 → 量 → 再排，直到"所有相邻空档 ≥ MIN_GAP_PX、最后一段不越过页底"。
       为什么可能要两三遍：写页长会改速度（AUTO_FIT），窗口长度跟着变一点点。 */
    function settleTextTimeline() {
        if (!isMobile()) return false;                             /* 宽屏：一个字都不碰 */
        var home = window.__home;
        if (!home || !home.items || !home.items.length) return false;

        var ok = false;
        for (var pass = 0; pass < 4; pass++) {
            var plan = planTimeline(home.items);
            if (!plan) break;
            applyTimeline(plan);
            home.layout();
            layoutCount++;

            var items = home.items;
            var worst = Infinity;
            for (var i = 1; i < items.length; i++) {
                var gap = items[i].A - items[i - 1].E;
                if (gap < worst) worst = gap;
            }
            var lastE = items[items.length - 1].E;
            ok = (!isFinite(worst) || worst >= MIN_GAP_PX - 3) && lastE <= pageMaxNow() + 1;
            if (ok) break;
        }

        if (typeof home.render === "function") home.render();
        return ok;
    }

    /* ======================= 5. 应用 / 监听 ======================= */

    /* 一次性应用（needRelayout：这一轮要不要请 1.js 重排）
       ★ 顺序很重要：先把空白 / 底图地址 / 输入倍率 / 文字的 top 全部写好，
         最后再让 1.js 量一次 —— 它量到的就是新布局
         （1.js 的 layout 只读当前 DOM，不会反过来改 top）。
       ★ 标题留白不在这里写：那三个值全交给 5.css 第 0 节的纯 CSS（--lead-in 带 !important），
         本文件只读它（titlePad / leadInHeight），免得和 1.js 抢同一个变量。 */
    function apply(needRelayout) {
        applyBlank();
        applyMap();
        applyInputSpeed();
        applyTextTops();
        if (needRelayout) settleTextTimeline();
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
       （底图是它自己 new Image() 加载的，不会拖住 window.load）。
       所以拿它量到的数据校正 top 这件事，得等它出现：
         有 items 了 → 校一次；还没有 → 200ms 后再看（最多 ~30 秒，之后交给 resize）。
       ★ 底图是远端的 avif，网络慢的时候十几秒都有可能，所以这里给的时间比较宽；
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

    /* 初始化：脚本在 body 末尾执行，body / 宝剑容器（1.js 建的）、__home 都已经在了。
       ★ 先装"滚动位置取整"（第 3 节③）：1.js 的 tick 是 rAF 里才第一次 scrollTo，
         这里比它早，所以能把它之后每一帧的滚动都接管掉。
       这一轮只写"第一版"（标题留白 + 接续底图的长度 + 底图地址 + 5 倍速 + 文字 top），
       1.js 第一遍 layout 就会按它排；真正的校正交给 waitForHome / load。 */
    ensureStylesheet();
    installScrollSnap();
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

    /* 控制台里 __m5 可以看当前算出来的接续长度 / 行程 / 标题留白 / 倍率：
         __m5.blank       现在接在多后面（= 再接多长底图，px）
         __m5.map         交给 CSS 的底图地址（--m5-map）
         __m5.scroll      当前文档的可滚动行程（px）
         __m5.target      当前页长（px，= 可滚动行程，由文字时间轴算出）
         __m5.titlePad    标题视频上面的留白（px，= 首屏竖直居中那一段）
         __m5.speed       当前输入倍率（1 = 原速，手机是 5）
         __m5.layouts     5.js 请 1.js 重排过几次
         __m5.reapply()   手动重算一次（改完参数后不用刷新） */
    window.__m5 = {
        get blank() { return Math.round(parseFloat(root.style.getPropertyValue("--m5-blank")) || 0); },
        get scroll() { return Math.max(0, root.scrollHeight - window.innerHeight); },
        get target() { return Math.round(pageLen); },
        get map() { return root.style.getPropertyValue("--m5-map"); },
        get titlePad() { return titlePad(); },
        get speed() { return window.__home && window.__home.inputScale || 1; },
        get mobile() { return isMobile(); },
        get layouts() { return layoutCount; },
        reapply: function () { waitTries = 0; apply(true); }
    };
})();
