
/* ==========================================================================
   一、视频清单（要加/减少视频改这里）
   ========================================================================== */

var VIDEO_GROUPS = {
    /* ★ 数组位置 = 序号，对应 2.css 里的 .bg-video-wrap-crispr-<序号>：
       第 1 格 → crispr-1（出场动画）、第 2 格 → crispr-2、第 3 格 → crispr-3（走路）、
       第 4 格 → crispr-4（终点动画）。
       某格写成 null = “这一格不放视频”（但不能整行删掉，否则后面的序号会整体前移、位置全错）。
       crispr-2 已经去掉了，所以第 2 格是 null。 */
    "CRISPR": [
        "./assets/CRISPR_1.webm",
        null,
        "./assets/CRISPR_3.webm",
        "./assets/CRISPR_4.webm"
        // "./Preset-3.webm"
    ],
    "gene": [
        "./assets/gene_1.webm",
        { src: "./assets/gene_1.webm", startAt: 1.05 },
        "./assets/gene_2.webm",
        "./assets/gene_2.webm"
    ],
    "TnpB": [
        "./assets/TnpB_1.webm",
        "./assets/TnpB_2.webm"
    ]
};

/* 公共类名（一般不用改）：容器 .bg-video-wrap-<类名小写>-<序号>，视频 .bg-video */
var VIDEO_WRAP_CLASS = "bg-video-wrap";
var VIDEO_CLASS = "bg-video";


/* ==========================================================================
   二、★★★ 移动（跟着滚动位置走的那些视频）—— 所有“移动”的代码都在这一节里 ★★★

   ★ 哪些视频要这么走，看下面的 MOVE_GROUPS：现在有
       · tnpb-1    → TnpB_1
       · crispr-3  → CRISPR 的第 3 个（走路那个）
     每一组各用一套点（也可以“借用”别组的点，见 MOVE_GROUPS 里的 use）；
     每一组还能挂动画视频（出场 / 终点），看下面的 MOVE_FX。

   分工：
     · 【位置 / 段数】全部写在 2.css 里：
         - 段数看 .tnpb-points { --tnpb-points: 42; }（42 个点 = 21 段）
         - 每个点用和视频本体一样的 top / right 写位置
       点的占位 div 由下面的引擎自动创建（挂在 body 下），index.html 不用手写，
       这个文件也不用改 —— 2.css 里加几个点就自动多几段。
       ★ 注意：视频容器自己那条 top / right（静态位置）对走动【没有影响】——
         走动时位置完全由轨迹点决定，那条只是它“没被移动时”的位置。
     · 【怎么动】写在这一节：点是成对的，一对就是一段 ——
           点 1 / 点 2 = 第 1 段的起点 / 终点
           点 3 / 点 4 = 第 2 段的起点 / 终点
           点 5 / 点 6 = 第 3 段的起点 / 终点      …… 以此类推
       每一段的终点不是下一段的起点，两段之间可以隔着任意距离。

   ★ 规则：位置完全由滚动位置决定，没有任何“自动播放 / 自动走路”：

     · 视口竖直中心线的文档纵坐标 = 人物的纵坐标 ——
       滚轮滚到哪儿，人就站在哪儿，人物的竖直高度始终落在画面中心；
     · 中心线落在某一段【起点 → 终点】的纵向范围里 → 人就在这一段上：
       按中心线在这段里占的纵向比例 t，在起点和终点之间线性取一个点
       （横向 x 也跟着 t 走，所以人始终踩在这条轨迹线上）；
     · 中心线落在两段之间（例如第 3 段终点和第 4 段起点中间）→
       这段纵向范围里没有轨迹，人就【停在下一段的起点等着】，
       中心线扫到这个起点，才开始跟着中心线往这一段终点走；
     · 中心线在第 1 段起点之上 → 停在第 1 段起点；
       中心线在最后一段终点之下 → 停在最后一段终点；
     · 往回滚完全对称：滚回哪里，人就退回哪里。

   ★ 额外滑动（页面滚到头之后，把最后一段走完）：
     · 视口中心线最多只能降到“页面能滚到的最远处 + 视口高/2”，
       比这更靠下的轨迹，光靠滚页面永远走不到 —— 最后一段常常就停在中途；
     · 所以页面已经到最远处、而轨迹还没走完时，继续【往下滚】不再滚页面，
       这段滑动直接喂给人物，让它顺着轨迹把最后一段走完（页面保持不动）；
     · 【往上滚】时先原路退回这段额外滑动，退完了页面才重新开始往上滚；
     · 轨迹走完以后，多余的下滚什么也不做（页面本来也到底了）。

   ★ 每组的动画视频（配置见下面的 MOVE_FX；容器在 2.css 里已经去掉 top / right，
     位置由这里算）：

     · 出场动画（appear）：第一次【往下滑到这一组第一个轨迹点】时播一遍
       —— 每次刷新只播一次；播之前这一组的人物藏着，播完才出现并一直留在页面上；
       页面一打开就已经在它下面了（不是滑过来的）就不补播，直接常驻；
     · 终点动画（end）：人物【往下滑】走完配置里某几段（段号从 1 数）的终点时，
       把动画视频挪到那个终点上从头播一遍（播放期间人物先藏起来）；
       播完（视频 ended）人物再按当前滚动位置出现 —— 如果那段就是轨迹的最后一段，
       看起来就是：走到终点 → 播一遍动画 → 人物常驻在那里；
       【往上滑】经过不播；再滑下来会再播一次（可以反复）。
   ========================================================================== */

/* ★★ 哪些视频要“跟着滚动位置走”，每一组的轨迹点写在 2.css 的哪里。

   键（组名）= 容器上的 data-tnpb-move，由下面 mount() 里的 moveGroupOf() 自动匹配：
               “<视频类名小写>-<序号>”，例如 CRISPR 的第 3 个 = "crispr-3"。
   prefix    = 这一组点的类名前缀：2.css 里写 .<box> > .<prefix>N { top / right }
   box       = 装这些点的小盒子类名（每组一个；要 position:absolute + 100% 高，
               这样点里的 top:% 才是按底图高度算的 —— 照抄 .tnpb-points 那份即可）
   countVar  = 这个盒子上声明“一共几个点”的自定义属性
   use       = 可选：2.css 里还没写这一组自己的点（没写 countVar）时，
               先借这一组的点用 —— 先能跑；等你在 2.css 补上自己的点，
               2.js 会自动改用你自己的那套，这个文件不用改。 */
var MOVE_GROUPS = {
    "tnpb-1": {
        prefix: "tnpb-move-",
        box: "tnpb-points",
        countVar: "--tnpb-points"
    },
    /* CRISPR 的第 3 个（2.css 里注释写着“走路”的那个）：
       现在先借用 tnpb-1 那套点，所以走的是和 TnpB_1 完全一样的路线；
       想让它走自己的路线，把 2.css 里那段 .crispr3-points 模板取消注释并填数字即可。 */
    "crispr-3": {
        prefix: "crispr3-move-",
        box: "crispr3-points",
        countVar: "--crispr3-points",
        use: "tnpb-1"
    }
};

/* ★★ 每一组用哪些“动画视频”（键 = MOVE_GROUPS 里的组名）

   appear = 出场动画：每次刷新只播一次 —— 这一组的【第一个轨迹点一进入画面】就播
            （不是等中心线扫到它；页面一打开那个点就已经在画面里，那就立刻播）。
            播之前这一组的人物是藏着的，播完才出现并一直留在页面上；
            如果页面一打开那个点已经在画面之上（滚着刷新进来的），不补播，直接常驻。
   end    = 终点动画：人物【往下滑】正好走完 segments 里那几段（段号从 1 数）的终点时播；
            播的时候人物藏着，播完再按当前滚动位置出现 —— 如果那段就是轨迹最后一段，
            看起来就是“常驻在最后那个终点”；再滑下来会再播一次（可以反复）。

   key      = 视频键，= VIDEO_GROUPS 里的 “<类名>_<序号>”，
              容器 id 就是 bgVideoWrap_<key>（例如 CRISPR_1 → bgVideoWrap_CRISPR_1）
   rate     = 播放倍速（1 = 原速；2 = 两倍速）
   up       = 位置微调：相对轨迹点【往上】挪多少（单位 = 底图高度的百分比，负数是往下）
   left     = 位置微调：相对轨迹点【往左】挪多少（单位 = 底图宽度的百分比，负数是往右）
              （和点在 2.css 里写的 right / left 百分比是同一套参照系）
   also     = 可选：这个动画【触发的同时】顺带一起播的其它动画（数组），每一项：
                key          = 播哪个视频（VIDEO_GROUPS 里的键）
                at           = 摆到哪个视频【当下的位置】上播（写那个视频的键，例如 "gene_1"）
                hide         = 播的时候把哪个视频藏起来（例如 "gene_1"）
                restoreAfter = 播完过几秒再把藏起来的那个放出来（秒；0 = 不管）
                rate / up / left 同上
   ★ 这些动画容器的 top / right 在 2.css 里已经去掉了 —— 位置完全由这里决定。

   ★ 出场动画【钉在这一组第一个轨迹点（第 1 段起点）上】播 —— 不跟着人物跑；
     播完 crispr-3 才出现（位置按当前滚动算，紧接着就是那一段的起点附近）。
     它的宽度在 2.css 里和 crispr-3 保持一致（现在都是 6vw），所以出现前后大小不变。 */
var MOVE_FX = {
    "tnpb-1": {
        end: { key: "TnpB_2", segments: [3, 4, 8, 14, 16, 18, 20], rate: 1, up: 0.4, left: 0 }
    },
    "crispr-3": {
        appear: { key: "CRISPR_1", rate: 1, up: 0.05, left: -1.5 },
        end: {
            key: "CRISPR_4", segments: [2], rate: 1, up: 0.01, left: 0.9,
            /* ★ 这个终点动画一触发，gene-3 / gene-4 就分别摆到 gene-1 / gene-2 的位置上
               一起播（也就是在这一刻替代了它们的画面），同时把 gene-1 / gene-2 藏起来；
               它们播完再过 2 秒，gene-1 / gene-2 重新出现。
               （原来静态摆着的 gene-3 / gene-4 已经不要了，它们只负责这个同步动画。） */
            also: [
                { key: "gene_3", at: "gene_1", hide: "gene_1", restoreAfter: 2, rate: 1, up: 0, left: 0 },
                { key: "gene_4", at: "gene_2", hide: "gene_2", restoreAfter: 2, rate: 1, up: 0, left: 0 }
            ]
        }
    }
};

/* 段数由 2.css 说了算：那里写了
       .tnpb-points { --tnpb-points: 42; }
   就表示有 42 个点 = 21 段。这里只是兜底默认值（CSS 里没写时用）。 */
var DEFAULT_POINT_COUNT = 8;

/* 名字结尾的编号：<前缀>12 → 12；不是这个格式就返回 0 */
function pointNumber(name, prefix) {
    var tail = String(name).replace(prefix, "");
    var n = parseInt(tail, 10);
    return isFinite(n) && n > 0 ? n : 0;
}

/* 取某一组实际要用的那套点：
   优先用它自己的（2.css 里在它的盒子上写了 countVar 就算写了自己的）；
   没写自己的就按 use 借别组的（链式借，防成环）。 */
function groupSpec(name) {
    var seen = {};
    var cur = name;

    while (cur && !seen[cur]) {
        seen[cur] = 1;
        var spec = MOVE_GROUPS[cur];
        if (!spec) return null;
        if (declaredPointCount(spec) > 0 || !spec.use) return spec;
        cur = spec.use;
    }
    return MOVE_GROUPS[name] || null;
}

/* 按编号取出某一组的所有点，严格按【编号】两两成段：
       奇数号 = 起点（点 1、3、5、7 …），偶数号 = 终点（点 2、4、6、8 …）
   也就是：点 1 → 点 2、点 3 → 点 4、点 5 → 点 6 …
   ★ 是不是终点严格看编号的奇偶，跟"数组里排第几个"无关，
     所以中间缺号（比如只写了 1,2,5,6）也不会错位。
   ★ 只认这一组前缀的点 —— 页面上有别组的点也不会混进来。 */
function autoSegments(spec) {
    var byNumber = {};

    document.querySelectorAll("[data-tnpb-point]").forEach(function (el) {
        var name = el.dataset.tnpbPoint || "";
        if (name.indexOf(spec.prefix) !== 0) return;
        var n = pointNumber(name, spec.prefix);
        if (n <= 0) return;
        if (!pointOf(name)) return;        /* CSS 里没写这个点，跳过 */
        byNumber[n] = name;
    });

    var nums = Object.keys(byNumber).map(Number).sort(function (a, b) { return a - b; });
    var segs = [];

    nums.forEach(function (n) {
        if (n % 2 !== 1) return;           /* 只有奇数号当起点 */
        var toName = byNumber[n + 1];
        if (!toName) return;               /* 配对的偶数号没写，这一段不算 */
        segs.push({ from: byNumber[n], to: toName });
    });

    return segs;
}


/* ---- 2-2 引擎（把上面这些点连成路线，再按滚动位置把人摆上去） ---- */

/* 底图显示高度 = body 高度（1.js 的 updateBodyHeight() 就是按底图比例设的） */
function mapHeight() {
    var body = document.body;
    var h = body ? body.offsetHeight : 0;
    return h > 0 ? h : window.innerHeight;
}

/* 单位换算：css 里写着 top: 23.7% / right: 20% 这种值，这里算成 px。
   % 按“底图尺寸”算（宽 = 视口宽，高 = 底图显示高度），
   和视频本体的 top / right 是同一套参照系。
   不写单位就当 px，vw / vh 也支持。 */
function measureLength(raw, axis) {
    if (raw == null) return null;
    var text = String(raw).trim();
    if (!text || text === "auto") return null;
    var n = parseFloat(text);
    if (!isFinite(n)) return null;

    var vw = document.documentElement.clientWidth || window.innerWidth;
    var vh = window.innerHeight;

    if (/vw$/i.test(text)) return n * vw / 100;
    if (/vh$/i.test(text)) return n * vh / 100;
    if (/%$/.test(text)) return n * (axis === "y" ? mapHeight() : vw) / 100;
    return n;
}

/* 读第 N 个点的位置：直接读它 css 里写的 top / right（和视频本体一个写法）。
   这里不依赖元素的盒模型（它的祖先盒子高度是 0，靠 getComputedStyle
   读 top 会把百分比解析成 0），而是自己按底图尺寸把 % 换算成 px，
   所以改 2.css 里的数值能立刻生效。 */
function readPoint(className) {
    var el = document.querySelector('[data-tnpb-point="' + className + '"]');
    if (!el) return null;

    var cs = window.getComputedStyle(el);
    var y = measureLength(cs.top, "y");
    var right = measureLength(cs.right, "x");

    /* 这条规则没写 top / right 时，用元素自己的行内值兜底 */
    if (y === null) y = measureLength(el.style.top, "y");
    if (right === null) right = measureLength(el.style.right, "x");

    if (y === null && right === null) return null;

    var vw = document.documentElement.clientWidth || window.innerWidth;
    var x = right === null ? 0 : vw - right;   /* right 换算成“离左边缘” */

    /* ★ 点盒子自己也可能被挪过（2.css 的“引导段” --lead-in：盒子 top 会往下推）：
       cs.top / cs.right 是相对盒子算的，要再加上盒子自己的位置，
       这样读出来的坐标才和视频容器自己的 offsetTop 是同一个参照系。 */
    var box = el.parentNode;
    var boxTop = (box && box.offsetTop) ? box.offsetTop : 0;
    var boxLeft = (box && box.offsetLeft) ? box.offsetLeft : 0;

    return { x: x + boxLeft, y: (y === null ? 0 : y) + boxTop };
}

/* 一个点 → px 坐标。y 就是它在底图上的纵坐标，
   人物的纵坐标跟视口中心线对齐时，比较的就是各个点的 y。 */
function pointOf(name) {
    return readPoint(name);
}

/* 某一组的“点盒子”：给它一个 <div class="<box>">，挂在 body 下。
   注意必须挂在 body 上、不能挂在视频容器里：视频容器是 position:absolute，
   点写进它里面的话 top / right 就变成相对容器算，和视频本体不是一个参照系了。
   盒子本身不可见、只给 JS 读 top / right 用（样式由 2.css 的 .<box> 提供）。 */
function ensurePointBox(spec) {
    var box = document.querySelector("." + spec.box);
    if (box) return box;

    box = document.createElement("div");
    box.id = spec.box + "Box";
    box.className = spec.box;
    box.setAttribute("aria-hidden", "true");
    document.body.appendChild(box);
    return box;
}

/* 某一组的盒子上声明了几个点（读 .<box> 上的 countVar；没写就返回 0）。
   2.css 里没写这一组的盒子时也会建一个空盒子，读不到值 → 0 → 走 groupSpec() 的借用逻辑。 */
function declaredPointCount(spec) {
    var box = ensurePointBox(spec);
    if (!box) return 0;

    var raw = window.getComputedStyle(box).getPropertyValue(spec.countVar);
    var n = parseInt(String(raw).trim(), 10);
    return isFinite(n) && n > 0 ? n : 0;
}

/* 把这一组的点补齐 / 减到 2.css 声明的个数；CSS 里没写就用 DEFAULT_POINT_COUNT。 */
function ensurePoints(spec) {
    var box = ensurePointBox(spec);
    var want = declaredPointCount(spec) || DEFAULT_POINT_COUNT;
    var have = box.children.length;

    if (want === have) return box;

    var i;
    if (want > have) {
        for (i = have + 1; i <= want; i++) addPoint(box, spec, i);
    } else {
        for (i = have; i > want; i--) box.removeChild(box.lastChild);
    }

    return box;
}

function addPoint(box, spec, n) {
    var name = spec.prefix + n;
    var el = document.createElement("div");
    el.className = name;
    el.dataset.tnpbPoint = name;
    box.appendChild(el);
}

/* 每一组的点都补齐 / 减到位（改了 2.css 的 --xxx-points 就跟着变）；返回有没有变化 */
function syncPointCounts() {
    var changed = false;

    Object.keys(MOVE_GROUPS).forEach(function (name) {
        var spec = groupSpec(name);
        if (!spec) return;

        var box = ensurePointBox(spec);
        var want = declaredPointCount(spec) || DEFAULT_POINT_COUNT;
        if (box.children.length !== want) {
            ensurePoints(spec);
            changed = true;
        }
    });

    return changed;
}

function makeMotionState(el) {
    return {
        el: el,
        group: el.dataset.tnpbMove || "",
        spec: null,                     /* 这一组实际用的那套点（见 groupSpec） */
        segments: [],                   /* 每一段：起点 from / 终点 to（都是文档坐标 px） */
        cur: { x: 0, y: 0 },            /* 当前实际位置（文档坐标） */
        segIndex: -1,                   /* 现在贴着中心线走在第几段；-1 = 还没到第 1 段起点 */
        t: 0,                           /* 在这一段里的纵向比例：0 = 起点，1 = 终点 */
        parked: true,                   /* true = 现在停在某个点上等着（中心线在轨迹之外） */
        overflow: 0,                    /* “额外滑动”：页面到底之后攒下来的滑动（px），用来走完最后一段 */
        lastScrollY: null,              /* 上一帧的滚动位置：用来把页面自己往回滚的距离还给 overflow */
        lastCenterY: null,              /* 上一帧的中心线纵坐标：用来判断“这一帧是不是刚走完某段终点” */
        appearFx: null,                 /* 出场动画播放器（配置里有 appear 才建） */
        endFx: null,                    /* 终点动画播放器（配置里有 end 才建） */
        appeared: false,                /* 出场动画是不是已经过了（每次刷新只播一次） */
        lastScreenY: null,              /* 上一帧第一个轨迹点在屏幕上的纵坐标（判断“刚进画面”） */
        visible: null,                  /* 当前显示状态（null = 还没设置过） */
        built: false,
        docX: 0,                        /* 视频在文档里的静态位置：换算 transform 位移用 */
        docY: 0
    };
}

/* 把 2.css 里每一段的起点 / 终点读成 px（窗口大小、底图尺寸变了要重读） */
function buildMotionPath(state) {
    var spec = groupSpec(state.group);
    if (!spec) return;

    state.spec = spec;                          /* 这一组实际用的是哪套点（控制台调试用） */

    var segments = [];
    autoSegments(spec).forEach(function (seg) {  /* 段数由 2.css 决定 */
        var from = pointOf(seg.from);
        var to = pointOf(seg.to);
        if (!from || !to) return;      /* 少了起点或终点，这一段跳过 */

        segments.push({ from: from, to: to });
    });
    state.segments = segments;

    /* 记下视频自己（没被移动时）在文档里的位置（offsetLeft/Top 是布局位置，
       不会被 transform 影响，所以只在重建路线时量一次即可） */
    state.docX = state.el.offsetLeft;
    state.docY = state.el.offsetTop;

    if (!segments.length) return;

    if (!state.built) {
        /* 第一次：先站在第 1 段起点，紧接着 stepMotion() 会按当前滚动位置摆好 */
        state.cur = { x: segments[0].from.x, y: segments[0].from.y };
        state.built = true;
    }

    /* 尺寸 / 点变了：这一帧只记录位置，不做“刚走完某段终点 / 刚进画面”的判断，
       否则改窗口大小、切换 --tnpb-points 都可能误触发动画。 */
    state.lastCenterY = null;
    state.lastScreenY = null;

    /* 尺寸变了（底图高度、窗口宽度）：立刻按新尺寸重算一次当前位置 */
    stepMotion(state);
}

/* ★★ 核心：视口竖直中心线在 centerY 时，人应该站在哪儿（纯计算，不碰 DOM）。
   返回 { x, y, segIndex, t, parked }：
     · centerY 落在某一段的纵向范围里 → 人就在这一段上：
       t = 中心线在这段里占的纵向比例，x / y 都按 t 在起点和终点之间线性取值
       （y 正好等于 centerY，所以人的竖直高度始终贴着画面中心），parked = false；
     · centerY 落在两段之间（轨迹在这一段纵向上是空的）→
       人停在【下一段的起点】等着，parked = true；
     · centerY 在第 1 段起点之上 → 停在第 1 段起点；
       在最后一段终点之下 → 停在最后一段终点。

   “这一段”的纵向范围用 min/max 包住起点和终点，
   所以即使某一段是从下往上走的（终点比起点高），判断一样成立。 */
function motionPositionAt(segments, centerY) {
    if (!segments || !segments.length) return null;

    for (var i = 0; i < segments.length; i++) {
        var seg = segments[i];
        var y0 = seg.from.y;                /* 这一段起点的纵坐标 */
        var y1 = seg.to.y;                  /* 这一段终点的纵坐标 */
        var lo = Math.min(y0, y1);
        var hi = Math.max(y0, y1);

        /* 中心线还没到这一段的纵向范围：
           前面的段都已经过去了，说明中心线正落在“上一段终点 → 这一段起点”
           的空档里 —— 人就停在【这一段的起点】等着，中心线扫到它才跟着走。 */
        if (centerY < lo) {
            return { x: seg.from.x, y: seg.from.y, segIndex: i, t: 0, parked: true };
        }

        /* 中心线在这一段的纵向范围里：按纵向比例在这段上取点 */
        if (centerY <= hi) {
            var span = y1 - y0;
            /* 起点和终点一样高（横向的一段）时没有比例可算，直接算作这一段走完 */
            var t = Math.abs(span) > 0.5 ? (centerY - y0) / span : 1;
            if (t < 0) t = 0;
            if (t > 1) t = 1;

            return {
                x: seg.from.x + (seg.to.x - seg.from.x) * t,
                y: seg.from.y + span * t,    /* 段内时正好等于 centerY */
                segIndex: i,
                t: t,
                parked: false
            };
        }
    }

    /* 中心线在最后一段终点之下：停在最后一段的终点 */
    var last = segments[segments.length - 1];
    return {
        x: last.to.x,
        y: last.to.y,
        segIndex: segments.length - 1,
        t: 1,
        parked: true
    };
}

/* 把 transform 写上去 */
function commitMotion(state) {
    state.el.style.transform = "translate3d(" +
        (state.cur.x - state.docX).toFixed(2) + "px," +
        (state.cur.y - state.docY).toFixed(2) + "px,0)";
}

/* 底图显示高度是否已经就绪。
   1.js 是等 map.png 加载完才把高度写进 body 的，在那之前 body 高度是 0，
   百分比 top 全会算成 0px —— 那时量出来的轨迹是错的（所有点都挤到页面顶部），
   所以尺寸没就绪之前先把人放回第 1 段起点，等底图高度写进 body 再按滚动位置摆。 */
function layoutReady() {
    return mapHeight() > window.innerHeight;
}

/* 视口竖直中心线在文档里的纵坐标。
   ★ 这就是人物的目标纵坐标：中心线在哪儿，人的竖直高度就在哪儿。 */
function viewportCenterY() {
    var scrollY = window.scrollY || window.pageYOffset || 0;
    return scrollY + window.innerHeight / 2;
}

/* ==========================================================================
   ★ 额外滑动：页面滚到头之后，继续滑的那部分滑动（用来把最后一段走完）
   ========================================================================== */

/* 当前滚动位置 */
function currentScrollY() {
    return window.scrollY || window.pageYOffset || 0;
}

/* 文档最多能滚多少像素（和 1.js 的 pageMaxScroll() 一个算法） */
function maxScrollY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

/* ★ 1.js 是自己驱动滚动的，它能滚到的最远处不一定等于“文档最底部”
   （时间轴提前播完时，后面那段文档根本滚不到），
   所以这里优先问 1.js：maxProgress() 减去 INTRO 那一段就是最大滚动像素。
   问不到（1.js 没加载 / 改了名字）就用文档底部兜底。 */
function pageScrollLimit() {
    var maxS = maxScrollY();

    try {
        if (typeof maxProgress === "function") {
            var intro = (typeof introLen === "function") ? introLen() : 0;
            var p = maxProgress();
            if (isFinite(p)) {
                if (p >= intro + maxS) return maxS;
                return Math.max(0, Math.min(maxS, p - intro));
            }
        }
    } catch (err) { /* 读不到就用兜底 */ }

    return maxS;
}

/* 页面是否已经滚到它能到的最远处 —— 只有到这儿了，才把滑动交给人物 */
function atPageBottom() {
    return currentScrollY() >= pageScrollLimit() - 0.5;
}

/* 滚到头时，视口竖直中心线能降到的最低文档纵坐标 */
function maxCenterY() {
    return pageScrollLimit() + window.innerHeight / 2;
}

/* 轨迹还差多少纵向距离才能走完 = 需要多少“额外滑动”。
   0 = 滚到底就能走完，不需要额外滑动。 */
function overflowNeeded(segments) {
    if (!segments.length) return 0;
    var endY = segments[segments.length - 1].to.y;
    return Math.max(0, endY - maxCenterY());
}

/* 滚轮 delta → 文档像素：和 1.js 的 wheelFactor()（= WHEEL_SPEED × fitScale）同一套换算，
   这样“额外滑动”的手感和页面正常滚动完全一致。
   系数是 1.js 顶层的 const / let，这里只读不改；读不到就用兜底值。 */
function wheelDeltaToPx(delta) {
    var factor = 0.1;                                   /* 兜底 = 1.js 的 WHEEL_SPEED */
    try {
        if (typeof WHEEL_SPEED === "number" && WHEEL_SPEED > 0) factor = WHEEL_SPEED;
        if (typeof fitScale === "number" && fitScale > 0) factor *= fitScale;
    } catch (err) { /* 读不到就用兜底 */ }
    return delta * factor;
}

/* 触摸拖动 → 文档像素：和 1.js 的 TOUCH_SPEED 同源 */
function touchDeltaToPx(dy) {
    var factor = 0.2;                                   /* 兜底 = 1.js 的 TOUCH_SPEED */
    try {
        if (typeof TOUCH_SPEED === "number" && TOUCH_SPEED > 0) factor = TOUCH_SPEED;
        if (typeof fitScale === "number" && fitScale > 0) factor *= fitScale;
    } catch (err) { /* 读不到就用兜底 */ }
    return dy * factor;
}

/* 每帧维护 state.overflow：
     · 只在“页面已经到最远处”时才有意义，上限刚好是走完最后一段所需的距离；
     · 页面被别的方式往回滚（键盘 / 拖动滚动条 / 浏览器恢复滚动位置）时，
       先把这段上移从额外滑动里扣掉 —— 人物的位置就不会突然跳。 */
function syncOverflow(state) {
    var scrollY = currentScrollY();
    var prev = state.lastScrollY;

    if (prev !== null && scrollY < prev && !atPageBottom()) {
        state.overflow = Math.max(0, state.overflow - (prev - scrollY));
    }
    state.lastScrollY = scrollY;

    var need = overflowNeeded(state.segments);
    if (state.overflow > need) state.overflow = need;
    if (state.overflow < 0) state.overflow = 0;
}

/* 让人物出现（只在状态真的变化时写样式） */
function showMotion(state) {
    if (state.visible === true) return;
    state.visible = true;
    state.el.style.visibility = "visible";
}

/* 让人物藏起来（只在状态真的变化时写样式） */
function hideMotion(state) {
    if (state.visible === false) return;
    state.visible = false;
    state.el.style.visibility = "hidden";
}

/* ==========================================================================
   ★ 每一组的“动画视频”：出场动画（appear）+ 终点动画（end）+ 联动动画（also）
   --------------------------------------------------------------------------
   都是“平时完全不出现、需要时摆到某个位置上播一遍”：
     · 出场：这一组第一个轨迹点【进入画面】时播（每次刷新只播一次）。
             播之前这一组的人物藏着，播完才出现并一直留在页面上。
     · 终点：往下滑正好走完配置里那几段的终点时播；人物先藏起来，
             播完再按当前滚动位置出现（最后一段的终点 = 轨迹终点 → 常驻在那儿）。
             再滑下来会再播一次。
     · 联动：某个动画【触发的同时】顺带播的别的视频（MOVE_FX 里的 also）——
             比如 crispr-4 一触发，gene-2 就在 gene-1 的位置上一起播，
             同时把 gene-1 藏起来；gene-2 播完再过 2 秒把 gene-1 放出来。
             它不碰人物显示，只负责那个视频的藏 / 播 / 恢复。
   2.css 里这些动画容器的 top / right 已经去掉，位置完全由这里算。
   ========================================================================== */

/* 一个动画播放器：包住“找元素 / 摆位置 / 播一次 / 收尾”这一套 */
function makeFxPlayer(cfg, kind) {
    return {
        kind: kind,                                  /* "appear" / "end" / "linked" */
        cfg: cfg || null,
        key: cfg ? cfg.key : "",
        rate: (cfg && cfg.rate > 0) ? cfg.rate : 1,
        up: (cfg && cfg.up) ? cfg.up : 0,            /* 相对轨迹点往上挪（底图高度的 %） */
        left: (cfg && cfg.left) ? cfg.left : 0,      /* 相对轨迹点往左挪（底图宽度的 %） */
        wrap: null,
        video: null,
        ready: false,                                /* 找过元素了没（找不到就当没有这个动画） */
        active: false,                               /* 正在播 */
        state: null,                                 /* 播完要把哪个人物露出来（联动动画没有） */
        timer: 0,                                    /* 兜底计时器：视频放不出来也能收尾 */
        also: [],                                    /* 这个动画触发时顺带播的联动动画（播放器数组） */
        refKey: "",                                  /* 联动动画：摆到哪个视频的位置上 */
        hideKey: "",                                 /* 联动动画：播的时候藏起哪个视频 */
        restoreAfter: 0,                             /* 联动动画：播完几秒把它放出来 */
        restoreTimer: 0
    };
}

/* 键名 → 容器（动画视频的容器 id 都是 bgVideoWrap_<键名>） */
function wrapByKey(key) {
    return key ? document.getElementById("bgVideoWrap_" + key) : null;
}

/* 找一个联动动画的配置做成播放器（at = 摆到谁的位置上，hide = 藏谁，restoreAfter = 几秒后放出来） */
function makeLinkedFx(cfg) {
    var pl = makeFxPlayer(cfg, "linked");
    pl.refKey = cfg && cfg.at ? cfg.at : "";
    pl.hideKey = cfg && cfg.hide ? cfg.hide : "";
    pl.restoreAfter = (cfg && cfg.restoreAfter > 0) ? cfg.restoreAfter : 0;
    return pl;
}

/* 找到这个动画的容器 / 视频，并把它变成“平时不出现、只播一次” */
function setupFx(pl) {
    if (!pl || pl.ready || !pl.key) return;
    pl.ready = true;                                 /* 只找一次，找不到就算了 */

    var wrap = document.getElementById("bgVideoWrap_" + pl.key);
    var video = wrap ? wrap.querySelector("video") : null;
    if (!wrap || !video) return;

    pl.wrap = wrap;
    pl.video = video;

    video.loop = false;
    video.removeAttribute("loop");
    video.pause();
    /* 有的视频配了“从第几秒开始播”（VIDEO_GROUPS 里的 startAt），回到那个点 */
    try { video.currentTime = video.__startAt || 0; } catch (err) { /* 忽略 */ }

    wrap.style.visibility = "hidden";

    video.addEventListener("ended", function () { finishFx(pl); });
    video.addEventListener("error", function () { finishFx(pl); });
}

/* 这次要播多久：视频自己的时长（减去 startAt）÷ 倍速，多留一点点；拿不到时长就按 1 秒算 */
function fxDurationMs(pl) {
    var rate = pl.rate > 0 ? pl.rate : 1;
    var d = pl.video && isFinite(pl.video.duration) ? pl.video.duration : 0;
    var from = (pl.video && pl.video.__startAt) ? pl.video.__startAt : 0;

    if (d > 0) d = Math.max(0.1, d - from);
    else d = rate;

    return Math.round(d / rate * 1000) + 120;
}

/* 把动画挪到 point 上播一遍（只管这个视频，不动人物显示）。
   返回 true = 播起来了；false = 没有这个视频 / 正在播。 */
function playFxAt(pl, point) {
    if (!pl || !pl.cfg) return false;

    setupFx(pl);
    if (!pl.ready || pl.active || !pl.wrap) return false;

    var wrap = pl.wrap;
    var video = pl.video;
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var up = mapHeight() * pl.up / 100;        /* 往上挪（底图高度的 %） */
    var left = vw * pl.left / 100;             /* 往左挪（底图宽度的 %） */

    /* 和人物一样的对齐方式：盒子的左上角 = 目标点（再按 up / left 微调一点） */
    wrap.style.transform = "translate3d(" +
        (point.x - wrap.offsetLeft - left).toFixed(2) + "px," +
        (point.y - wrap.offsetTop - up).toFixed(2) + "px,0)";
    wrap.style.visibility = "visible";

    var from = video.__startAt || 0;           /* 配了 startAt 的就从那一秒开始播 */
    try { video.currentTime = from; } catch (err) { /* 忽略 */ }
    try { video.playbackRate = pl.rate; } catch (err) { /* 忽略 */ }
    var p = video.play();
    if (p && typeof p.catch === "function") {
        p.catch(function () { /* 放不出来也没关系：下面的计时器会收尾 */ });
    }

    pl.active = true;

    clearTimeout(pl.timer);
    pl.timer = setTimeout(function () { finishFx(pl); }, fxDurationMs(pl));
    return true;
}

/* 在某个轨迹点上播一个动画，并且【播放期间把这一组的人物藏起来】。
   返回 true = 播起来了。 */
function playFx(pl, state, point) {
    if (!playFxAt(pl, point)) return false;

    pl.state = state;
    hideMotion(state);                         /* 播放期间人物先藏起来 */

    /* 这个动画如果配了“顺带一起播”的联动动画（MOVE_FX 里的 also），一起播 */
    (pl.also || []).forEach(function (link) { playLinkedFx(link); });
    return true;
}

/* 播一个联动动画：摆到参照视频（比如 gene-1）当下的位置上，
   同时把要藏的那个藏起来；播完按 restoreAfter 再放出来。 */
function playLinkedFx(pl) {
    if (!pl || !pl.cfg) return false;

    var ref = wrapByKey(pl.refKey);
    if (!ref) return false;

    setupFx(pl);
    if (!pl.wrap) return false;

    /* 压在参照视频那一层之上（不然可能被同一位置上的别的视频盖住） */
    var refZ = parseInt(window.getComputedStyle(ref).zIndex, 10);
    if (isFinite(refZ)) pl.wrap.style.zIndex = String(refZ + 1);

    /* 上一次还没到点的“恢复”作废，重新计时 */
    clearTimeout(pl.restoreTimer);
    pl.restoreTimer = 0;

    var hidden = wrapByKey(pl.hideKey);
    if (hidden) hidden.style.visibility = "hidden";     /* 参照视频先消失 */

    var ok = playFxAt(pl, { x: ref.offsetLeft, y: ref.offsetTop });
    if (!ok && hidden) hidden.style.visibility = "";    /* 播不起来就直接放回去 */

    return ok;
}

/* 收尾：藏起动画；如果有人物归它管就让人物按当前滚动位置出现；
   联动动画还会按 restoreAfter 把当初藏起来的那个视频再放出来。 */
function finishFx(pl) {
    if (!pl || !pl.active) return;

    clearTimeout(pl.timer);
    pl.timer = 0;
    pl.active = false;

    if (pl.video) { try { pl.video.pause(); } catch (err) { /* 忽略 */ } }
    if (pl.wrap) pl.wrap.style.visibility = "hidden";

    var s = pl.state;
    pl.state = null;
    if (s) {
        s.visible = null;    /* 让 showMotion() 重新写一次 visibility */
        stepMotion(s);       /* 立刻按当前滚动位置摆好并露出来 */
    }

    /* ★ 联动动画：播完过 restoreAfter 秒，把当初藏起来的那个（比如 gene-1）放出来 */
    if (pl.restoreAfter && pl.hideKey) {
        var back = wrapByKey(pl.hideKey);
        clearTimeout(pl.restoreTimer);
        pl.restoreTimer = setTimeout(function () {
            pl.restoreTimer = 0;
            if (back) back.style.visibility = "";   /* 回到它自己的正常状态（默认可见） */
        }, pl.restoreAfter * 1000);
    }
}

/* 第 i 段（从 0 数）的终点要不要播这一组的终点动画？（配置里段号从 1 写起） */
function needEndFx(pl, i) {
    return !!(pl && pl.cfg && pl.cfg.segments && pl.cfg.segments.indexOf(i + 1) >= 0);
}

/* 这一帧的中心线从 prevCenter 滑到 centerY，是不是【往下滑】正好走完配置里某一段的终点？
   是就返回那一段。往上滑不算；一下子跳过去（上一帧人还不在这一段上）也不算；
   终点已经跑到画面外（End 键 / 拖滚动条那种大跳）也不算 —— 看不见就不播。 */
function endFxTriggerSeg(pl, segments, prevCenter, centerY) {
    var found = null;
    var scrollY = currentScrollY();

    for (var i = 0; i < segments.length; i++) {
        if (!needEndFx(pl, i)) continue;

        var seg = segments[i];
        if (seg.to.y <= seg.from.y) continue;      /* 只管往下走的段 */

        if (prevCenter >= seg.from.y - 1 &&        /* 上一帧人还在这一段上 */
            prevCenter < seg.to.y &&               /* 上一帧还没到终点 */
            centerY >= seg.to.y) {                 /* 这一帧到了 / 过了终点 */

            var screenY = seg.to.y - scrollY;      /* 终点现在在屏幕上的位置 */
            if (screenY >= -1 && screenY <= window.innerHeight + 1) found = seg;
        }
    }
    return found;
}

/* 这个人物现在能不能露出来：
     · 有出场动画、而且还没轮到播（在等“第一次滑到第一个轨迹点”）→ 先藏着；
     · 出场 / 终点动画正在播 → 藏着；
   其余情况正常显示。 */
function canShowMotion(state) {
    if (state.appearFx && state.appearFx.cfg && !state.appeared) return false;
    if (state.appearFx && state.appearFx.active && state.appearFx.state === state) return false;
    if (state.endFx && state.endFx.active && state.endFx.state === state) return false;
    return true;
}

/* 人物该显示还是该藏着（位置照常更新，等动画播完再露出来） */
function showMotionNow(state) {
    if (canShowMotion(state)) showMotion(state);
    else hideMotion(state);
}

/* 给这一组建好它的动画播放器（每组的 appear / end 各一个；
   end 上如果配了 also（联动动画），也一并建好，挂在 end.also 上） */
function makeStateFx(state) {
    var fx = MOVE_FX[state.group] || null;
    if (!fx) return;

    if (fx.appear) state.appearFx = makeFxPlayer(fx.appear, "appear");

    if (fx.end) {
        state.endFx = makeFxPlayer(fx.end, "end");
        state.endFx.also = (fx.end.also || []).map(makeLinkedFx);
    }
}

/* 启动时把每一组的动画都收起来（不循环、不自动播、不可见） */
function setupStateFx(state) {
    if (state.appearFx) setupFx(state.appearFx);
    if (state.endFx) setupFx(state.endFx);
    (state.endFx && state.endFx.also ? state.endFx.also : []).forEach(setupFx);
}

/* 推进一帧 —— 其实并没有动画在“推进”：
   这里只做一件事，就是按【当前滚动位置】把人摆到该在的地方。
   位置完全跟着滚动走，所以滚到哪儿人就停在哪儿，不做任何自动播放。

   算位置的是 motionPositionAt()：
     · 中心线落在轨迹上 → 人的竖直高度 = 中心线（始终贴着画面竖直中心）；
     · 中心线落在两段之间 / 轨迹之外 → 人停在下一段起点（或首、末点）等着。 */
function stepMotion(state) {
    if (!state.segments.length) return;

    /* 布局还没就绪（底图高度还是 0）时位置还没量准：先站回第 1 段起点，不判断 */
    if (!layoutReady()) {
        var startP = state.segments[0].from;
        state.cur.x = startP.x;
        state.cur.y = startP.y;
        state.segIndex = -1;
        state.t = 0;
        state.parked = true;
        commitMotion(state);
        showMotionNow(state);
        return;
    }

    /* 额外滑动：页面到底之后继续滑的那部分（用来走完最后一段） */
    syncOverflow(state);

    /* ★ 就这一句：中心线在哪儿，人就在哪儿
       （额外滑动直接加在中心线上，等于把中心线临时往下降一点） */
    var centerY = viewportCenterY() + state.overflow;
    var pos = motionPositionAt(state.segments, centerY);
    if (!pos) return;

    /* ★ 两种动画都在这里判断（上一帧的中心线记在 state.lastCenterY 里，
       所以往上滑、跳着滑都不会误触发）：
         · 出场动画：第一次【往下滑到这一组第一个轨迹点】→ 播一次，一刷新只播一次；
         · 终点动画：往下滑正好走完配置里那几段的终点 → 播一遍（可以反复）。 */
    var prevCenter = state.lastCenterY;
    state.lastCenterY = centerY;

    /* ★ 出场动画：这一组的第一个轨迹点【进入画面】就开始播（不再等中心线扫到它）。
         · 第一帧：点已经在画面里 → 立刻播；已经在画面之上（滚着刷新进来的）→ 不补播；
         · 之后：它从画面下方进入画面 → 播。
       只播一次；播放期间人物藏着（canShowMotion），播完才露出来。 */
    if (state.appearFx && state.appearFx.cfg && !state.appeared && state.segments.length) {
        var startY = state.segments[0].from.y;              /* 第 1 个点（文档坐标） */
        var vh = window.innerHeight;
        var screenY = startY - currentScrollY();            /* 它在屏幕上的纵坐标 */
        var prevScreenY = state.lastScreenY;

        if (prevScreenY === null) {
            if (screenY >= 0 && screenY <= vh) {            /* 一打开就已经在画面里 */
                state.appeared = true;
                playFx(state.appearFx, state, state.segments[0].from);
            } else if (screenY < 0) {                       /* 已经在画面之上：不补播 */
                state.appeared = true;
            }
            /* screenY > vh：还在画面下方，等它进来 */
        } else if (prevScreenY > vh && screenY <= vh) {     /* 从画面下方进入画面 */
            state.appeared = true;
            playFx(state.appearFx, state, state.segments[0].from);
        }

        state.lastScreenY = screenY;
    }

    /* 终点动画：出场动画还在播的时候不抢（一次只播一个），
       这一趟跳过头了就等下次再滑到终点时补上 */
    if (state.endFx && state.endFx.cfg && !state.endFx.active &&
        !(state.appearFx && state.appearFx.active) && prevCenter !== null) {
        var fxSeg = endFxTriggerSeg(state.endFx, state.segments, prevCenter, centerY);
        if (fxSeg) playFx(state.endFx, state, fxSeg.to);
    }

    state.cur.x = pos.x;
    state.cur.y = pos.y;
    state.segIndex = pos.segIndex;   /* 控制台调试用：现在贴着第几段 */
    state.t = pos.t;                 /* 控制台调试用：在这一段里的纵向比例 */
    state.parked = pos.parked;       /* 控制台调试用：true = 停在某个点上等着 */

    commitMotion(state);
    showMotionNow(state);
}

/* 启动：接管所有 data-tnpb-move 的视频（tnpb-1、crispr-3 …），让它们跟着滚动位置走 */
function initMovement() {
    /* 先把每一组的“点”都建到 body 上，再读它们的位置 */
    syncPointCounts();

    var roots = Array.prototype.slice.call(document.querySelectorAll("[data-tnpb-move]"));
    if (!roots.length) return;

    var states = roots.map(makeMotionState);
    states.forEach(makeStateFx);            /* 建好每组的出场 / 终点动画播放器 */
    states.forEach(buildMotionPath);
    states.forEach(setupStateFx);           /* 把动画都收起来：不循环、不自动播、不可见 */

    function renderAll() {
        states.forEach(stepMotion);
    }

    /* 重建路线里已经会按当前滚动位置摆好一次，所以不用再 render 一遍 */
    function rebuildAll() {
        states.forEach(buildMotionPath);
    }

    /* 底图高度是 1.js 加载完 map.png 之后才写进 body 的，
       在那之前 body 高度是 0，百分比 top 全会算成 0px。
       所以这里盯着 body 高度：一变就重新量一遍所有定位点。
       这样无论脚本谁先谁后，量到的都是最终尺寸。
       顺便也盯着 2.css 里每一组的 --xxx-points：改了段数就立刻跟着加 / 减点。 */
    /* 布局指纹：底图尺寸 + 每一组实际用的那套点（盒子 + 点的个数）。
       任何一项变了就重新量一遍路线。 */
    var layoutKey = "";
    function layoutSignature() {
        var parts = [String(mapHeight()),
                     String(document.documentElement.clientWidth || window.innerWidth)];

        Object.keys(MOVE_GROUPS).forEach(function (name) {
            var spec = groupSpec(name);
            if (!spec) { parts.push(name + ":-"); return; }
            var box = ensurePointBox(spec);
            parts.push(name + ":" + spec.box + ":" + box.children.length);
        });

        return parts.join("|");
    }

    /* 每帧看三件事：点的个数对不对、底图尺寸 / 点集变没变、人该站在哪儿。
       ★ 位置只跟当前滚动位置有关，这里不做任何计时，也没有“走到一半”的状态。 */
    function frame() {
        /* 段数变了（改了 2.css 的 --xxx-points）、或者某组从“借用别组的点”
           变成“有了自己的点” → 先把点补齐 / 减掉再重新量 */
        if (syncPointCounts()) layoutKey = "";

        var key = layoutSignature();
        if (key !== layoutKey) {
            layoutKey = key;
            rebuildAll();
        } else {
            renderAll();
        }

        requestAnimationFrame(frame);
    }

    window.addEventListener("scroll", renderAll, { passive: true });
    window.addEventListener("resize", rebuildAll);
    /* 图片/字体/视频都就绪后再量一次，避免第一次量到的是没布局完的尺寸 */
    window.addEventListener("load", rebuildAll);

    /* ---------------------------------------------------------------------
       ★ 页面滚到头之后：继续往下滑 = 让 TnpB 把最后一段走完，页面不动
       --------------------------------------------------------------------- */

    /* 把这次滑动（文档像素，正 = 往下）喂给人物。
       返回 true = 这次滑动被人吃掉了，调用方要把事件拦下来，别让页面跟着滚。 */
    function feedMotion(px) {
        if (!px) return false;

        var eaten = false;

        states.forEach(function (s) {
            if (!s.segments.length || !layoutReady()) return;

            var need = overflowNeeded(s.segments);

            if (px > 0) {
                /* 往下滑：只有“页面已经到最远处”而且“轨迹还没走完”才由人物接管 */
                if (!atPageBottom() || need <= 0 || s.overflow >= need - 0.01) return;
                s.overflow = Math.min(need, s.overflow + px);
                eaten = true;
            } else {
                /* 往上滑：先原路退回这段额外滑动，退完了页面才重新开始往上滚 */
                if (s.overflow <= 0.01) return;
                s.overflow = Math.max(0, s.overflow + px);
                eaten = true;
            }
        });

        if (eaten) renderAll();
        return eaten;
    }

    /* 滚轮：在【捕获阶段】先看要不要喂给人物。
       ★ 吃掉了就 stopPropagation —— 1.js 的滚轮监听挂在冒泡阶段，
         拦下来它就收不到这个事件，页面才不会跟着一起滚。 */
    window.addEventListener("wheel", function (e) {
        var d = e.deltaY;
        if (e.deltaMode === 1) d *= 16;                        /* 行 → px */
        else if (e.deltaMode === 2) d *= window.innerHeight;   /* 页 → px */
        if (!feedMotion(wheelDeltaToPx(d))) return;

        e.preventDefault();
        e.stopPropagation();
    }, { capture: true, passive: false });

    /* 触摸：往下拖时页面本来就已经到底（滚不动了），只管把滑动喂给人物；
       往上拖交给页面自己滚 —— syncOverflow() 会把这段上移从额外滑动里扣掉，
       所以人物不会和页面对不上。 */
    var lastTouchY = null;

    window.addEventListener("touchstart", function (e) {
        lastTouchY = e.touches.length ? e.touches[0].clientY : null;
    }, { passive: true });

    window.addEventListener("touchmove", function (e) {
        if (!e.touches.length) return;
        var y = e.touches[0].clientY;
        var prev = lastTouchY;
        lastTouchY = y;
        if (prev === null || prev === y) return;

        if (prev - y > 0) feedMotion(touchDeltaToPx(prev - y));   /* 只接管往下拖 */
    }, { passive: true });

    layoutKey = layoutSignature();
    renderAll();
    requestAnimationFrame(frame);

    /* 控制台查看用：homeVideos.motionStates / motionStateOf("crispr-3") / feedMotion */
    window.homeVideos = window.homeVideos || {};
    window.homeVideos.motionStates = states;
    window.homeVideos.tnpb1Motion = states;          /* 旧名字，留着兼容 */
    window.homeVideos.renderMotion = renderAll;
    window.homeVideos.feedMotion = feedMotion;
    window.homeVideos.motionStateOf = function (group) {
        for (var i = 0; i < states.length; i++) {
            if (states[i].group === group) return states[i];
        }
        return null;
    };
    /* 控制台 / 调试用：改完 2.css 的点想立刻重新量一遍，可以在控制台执行
       homeVideos.rebuildMotion()（正常情况每帧会自动发现变化） */
    window.homeVideos.rebuildMotion = function () {
        syncPointCounts();
        rebuildAll();
    };

    /* 控制台查看用：homeVideos.fxOf("crispr-3") → { appear, end } 两个动画播放器 */
    function stateOf(group) {
        for (var i = 0; i < states.length; i++) {
            if (states[i].group === group) return states[i];
        }
        return null;
    }

    window.homeVideos.fxOf = function (group) {
        var s = stateOf(group);
        return s ? { appear: s.appearFx, end: s.endFx, state: s } : null;
    };

    /* 旧名字，留着兼容（= tnpb-1 的终点动画） */
    var tnpbState = stateOf("tnpb-1");
    var tnpbEnd = tnpbState ? tnpbState.endFx : null;
    window.homeVideos.tnpbEndFx = {
        active: function () { return !!(tnpbEnd && tnpbEnd.active); },
        wrap: function () { return tnpbEnd ? tnpbEnd.wrap : null; },
        video: function () { return tnpbEnd ? tnpbEnd.video : null; },
        finish: function () { finishFx(tnpbEnd); }     /* 调试 / 测试：手动让它收尾 */
    };
}


/* ==========================================================================
   三、视频渲染逻辑（通常不需要动）
   ========================================================================== */

/* 把类名转成类名后缀：CRISPR -> crispr，TnpB -> tnpb */
function videoGroupSlug(group) {
    return String(group).toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

/* 单条导入项 → { src, startAt }；兼容只写路径字符串的写法 */
function videoEntryOptions(entry) {
    if (entry && typeof entry === "object") {
        return { src: entry.src || "", startAt: Number(entry.startAt) || 0 };
    }
    return { src: entry || "", startAt: 0 };
}

/* 让视频从 startAt 秒开始播；每次循环也回到 startAt 反复播。
   通过 video.__startAt 记录时间点，改时间点后重新调用即可生效。 */
function applyStartAt(video) {
    var startAt = video.__startAt || 0;
    if (startAt <= 0) return;

    function seekToStart() {
        try {
            video.currentTime = startAt;
        } catch (err) {
            console.warn("[home] 起始时间设置失败：", err);
        }
    }

    /* 首次：元数据就绪后再 seek，否则个别浏览器不允许直接改 currentTime */
    if (video.readyState >= 1) {
        seekToStart();
    } else {
        video.addEventListener("loadedmetadata", function onMeta() {
            video.removeEventListener("loadedmetadata", onMeta);
            seekToStart();
        });
    }

    /* 循环回到开头时重新跳到 startAt（只绑一次，靠标志位去重） */
    if (!video.__startAtBound) {
        video.__startAtBound = true;

        /* 最后一次已知播放位置：用来识别“循环回绕” */
        video.addEventListener("timeupdate", function () {
            video.__lastTime = video.currentTime;
        });

        /* 通过 seek 跳出 [0, startAt) 这一段，形成 [startAt, 片尾] 的循环。
           用 seeked（而非 timeupdate 轮询）判断，回绕后能立刻纠正，几乎看不到片头。 */
        video.addEventListener("seeked", function () {
            var at = video.__startAt || 0;
            if (at <= 0) return;
            if (video.currentTime < at - 0.05 && (video.__lastTime || 0) > at) {
                video.__lastTime = at;
                seekToStart();
            }
        });

        video.addEventListener("play", function () {
            if (video.__startAt > 0 && video.currentTime < video.__startAt - 0.05) seekToStart();
        });

        /* loop 属性通常接管循环，这里作为兜底 */
        video.addEventListener("ended", function () {
            if (video.__startAt > 0) { seekToStart(); video.play(); }
        });
    }
}

/* ========================================================================== */

(function () {
    "use strict";

    /* key -> 容器 DOM，需要单独控制某个视频时用 */
    var mountedVideos = {};
    /* 固定的 DOM 插入位置：所有视频层都插在它前面，保持一致顺序 */
    var anchor = document.body ? document.body.firstChild : null;

    /* 某个容器对应哪一组移动配置；不需要移动就返回 null。
       ★ 直接看上面 MOVE_GROUPS 里有没有这个组名（"<类名小写>-<序号>"），
         所以想让哪个视频也走起来，只在 MOVE_GROUPS 里加一个键就够了。 */
    function moveGroupOf(group, index) {
        var key = videoGroupSlug(group) + "-" + index;
        return Object.prototype.hasOwnProperty.call(MOVE_GROUPS, key) ? key : null;
    }

    function mount(key, group, src, index, startAt) {
        var wrapId = "bgVideoWrap_" + key;

        /* 防止重复插入（例如脚本被引入两次） */
        if (document.getElementById(wrapId)) return;

        var wrapClass = VIDEO_WRAP_CLASS + "-" + videoGroupSlug(group) + "-" + index;

        /* 容器：位置和大小由 2.css 里对应的 .bg-video-wrap-<类名>-<序号> 控制 */
        var wrap = document.createElement("div");
        wrap.id = wrapId;
        wrap.className = VIDEO_WRAP_CLASS + " " + wrapClass;
        wrap.dataset.videoKey = key;
        wrap.dataset.videoGroup = group;
        wrap.setAttribute("aria-hidden", "true");

        /* 这个视频要不要跟着滚动移动？要的话在这里标好组名，
           各个“点”由 initMovement() 里的 syncPointCounts() 统一建到 body 上 */
        var moveGroup = moveGroupOf(group, index);
        if (moveGroup) wrap.dataset.tnpbMove = moveGroup;

        /* 视频本体：静音 + 循环 + 自动播放，才能被浏览器允许无声自动播放 */
        var video = document.createElement("video");
        video.className = VIDEO_CLASS;
        video.dataset.videoKey = key;
        video.dataset.videoGroup = group;
        video.dataset.startAt = String(startAt || 0);
        video.__startAt = startAt || 0;
        video.src = src;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.setAttribute("preload", "auto");
        video.setAttribute("disablepictureinpicture", "");

        video.addEventListener("error", function () {
            console.error("[home] 视频加载失败（" + key + "），请检查路径：" + src);
        });

        /* 起始播放时间（只对设了 startAt 的视频生效） */
        applyStartAt(video);

        wrap.appendChild(video);

        /* 插到 body 最前面，保证它在所有正文元素之下 */
        if (anchor) {
            document.body.insertBefore(wrap, anchor);
        } else {
            document.body.appendChild(wrap);
            anchor = wrap;
        }

        mountedVideos[key] = wrap;

        /* 个别浏览器（低电量模式等）会拒绝自动播放，这里再手动拉一次 */
        var p = video.play();
        if (p && typeof p.catch === "function") {
            p.catch(function (err) {
                console.warn("[home] 视频自动播放被拦截（" + key + "）：", err);
            });
        }
    }

    function initVideos() {
        Object.keys(VIDEO_GROUPS).forEach(function (group) {
            var list = VIDEO_GROUPS[group];
            if (!list || !list.length) return;
            list.forEach(function (entry, i) {
                var opt = videoEntryOptions(entry);
                if (!opt.src) return;
                mount(group + "_" + (i + 1), group, opt.src, i + 1, opt.startAt);
            });
        });
    }

    /* 挂到 window 上，方便查看/单独控制某一类某一个视频 */
    window.homeVideos = {
        wrapOf: function (key) { return mountedVideos[key] || null; },
        videoOf: function (key) {
            var wrap = mountedVideos[key];
            return wrap ? wrap.querySelector("video") : null;
        },
        /* 运行时改起始时间：homeVideos.setStartAt("gene_2", 2.5) */
        setStartAt: function (key, seconds) {
            var wrap = mountedVideos[key];
            if (!wrap) return false;
            var video = wrap.querySelector("video");
            if (!video) return false;
            video.__startAt = Number(seconds) || 0;
            video.dataset.startAt = String(video.__startAt);
            applyStartAt(video);
            if (video.__startAt > 0) {
                try { video.currentTime = video.__startAt; } catch (err) { /* 忽略 */ }
            }
            return true;
        },
        all: function () { return mountedVideos; }
    };

    /* 脚本放在 </body> 前，正常情况 DOM 已就绪；这里再做一次兜底 */
    function boot() {
        initVideos();
        initMovement();   /* 视频挂好之后再接管 TnpB_1 的跟随滚动移动 */
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
