
/* ==========================================================================
   一、视频清单（要加/减少视频改这里）
   ========================================================================== */

var VIDEO_GROUPS = {
    "CRISPR": [
        "./assets/CRISPR_1.webm",
        "./assets/CRISPR_2.webm",
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
   二、★★★ 移动（TnpB_1）—— 所有“移动”的代码都在这一节里 ★★★

   分工：
     · 【位置 / 段数】全部写在 2.css 里：
         - 段数看 .tnpb-points { --tnpb-points: 42; }（42 个点 = 21 段）
         - 每个点用和视频本体一样的 top / right 写位置
       点的占位 div 由下面的引擎自动创建（挂在 body 下），index.html 不用手写，
       这个文件也不用改 —— 2.css 里加几个点就自动多几段。
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
   ========================================================================== */

/* 点的类名前缀：2.css 里写 .tnpb-points > .tnpb-move-N 的就是第 N 个点 */
var POINT_PREFIX = "tnpb-move-";

/* 段数由 2.css 说了算：那里写了
       .tnpb-points { --tnpb-points: 42; }
   就表示有 42 个点 = 21 段。这里只是兜底默认值（CSS 里没写时用）。 */
var DEFAULT_POINT_COUNT = 8;

/* ★ 段数完全跟着 2.css 走，这里不用再列一遍。
   规则：把 2.css 里所有的 .tnpb-move-N 按编号从小到大排好，两两成一段 ——
       点 1/2 = 第 1 段起点/终点    点 3/4 = 第 2 段起点/终点
       点 5/6 = 第 3 段起点/终点    点 7/8 = 第 4 段起点/终点   ……
   所以在 2.css 里想加多少段就加多少段（.tnpb-move-9 / -10 / -11 / -12 …），
   JS 会自动认出来，不需要改这个文件。 */
var MOVE_GROUPS = {
    "tnpb-1": {}     /* 段列表自动从 CSS 生成，见 autoSegments() */
    /* 想给别的视频也加移动（比如让 TnpB_2 也动起来）：
       1) 在它容器上写 data-tnpb-move="<组名>"（见下面 mount() 里的 moveGroupOf）
       2) 这里补一个键，比如  , "tnpb-2": {}
       3) 在 2.css 里给它的点写 .tnpb-points > .tnpb-move-1 / -2 …（共用同一套点即可） */
};

/* 名字结尾的编号：tnpb-move-12 → 12；不是这个格式就返回 0 */
function pointNumber(name) {
    var tail = String(name).replace(POINT_PREFIX, "");
    var n = parseInt(tail, 10);
    return isFinite(n) && n > 0 ? n : 0;
}

/* 按编号取出所有点，严格按【编号】两两成段：
       奇数号 = 起点（点 1、3、5、7 …），偶数号 = 终点（点 2、4、6、8 …）
   也就是：点 1 → 点 2、点 3 → 点 4、点 5 → 点 6 …
   ★ 是不是终点严格看编号的奇偶，跟"数组里排第几个"无关，
     所以中间缺号（比如只写了 1,2,5,6）也不会错位。 */
function autoSegments() {
    var byNumber = {};

    document.querySelectorAll("[data-tnpb-point]").forEach(function (el) {
        var name = el.dataset.tnpbPoint || "";
        if (name.indexOf(POINT_PREFIX) !== 0) return;
        var n = pointNumber(name);
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

    return { x: x, y: y === null ? 0 : y };
}

/* 一个点 → px 坐标。y 就是它在底图上的纵坐标，
   人物的纵坐标跟视口中心线对齐时，比较的就是各个点的 y。 */
function pointOf(name) {
    return readPoint(name);
}

/* 2.css 里声明了几个点：读 .tnpb-points 上的 --tnpb-points。
   段数就跟着它走 —— CSS 里写 8 就是 4 段，写 20 就是 10 段。 */
function declaredPointCount() {
    var box = document.getElementById("tnpbPoints");
    if (!box) return 0;

    var raw = window.getComputedStyle(box).getPropertyValue("--tnpb-points");
    var n = parseInt(String(raw).trim(), 10);
    return isFinite(n) && n > 0 ? n : 0;
}

/* 把“点”的占位 div 建到 body 下面（它们只是给 JS 读 top / right 用的）。
   注意必须挂在 body 上、不能挂在视频容器里：视频容器是 position:absolute，
   点写进它里面的话 top / right 就变成相对容器算，和视频本体不是一个参照系了。

   个数按 2.css 的 --tnpb-points 来；CSS 里没写就用 DEFAULT_POINT_COUNT。 */
function ensurePoints() {
    var box = document.getElementById("tnpbPoints");
    if (!box) {
        box = document.createElement("div");
        box.id = "tnpbPoints";
        box.className = "tnpb-points";
        box.setAttribute("aria-hidden", "true");
        document.body.appendChild(box);
    }

    var want = declaredPointCount() || DEFAULT_POINT_COUNT;
    var have = box.children.length;

    if (want === have) return box;

    var i;
    if (want > have) {
        for (i = have + 1; i <= want; i++) addPoint(box, i);
    } else {
        for (i = have; i > want; i--) box.removeChild(box.lastChild);
    }

    return box;
}

function addPoint(box, n) {
    var name = POINT_PREFIX + n;
    var el = document.createElement("div");
    el.className = name;
    el.dataset.tnpbPoint = name;
    box.appendChild(el);
}

function makeMotionState(el) {
    return {
        el: el,
        group: el.dataset.tnpbMove || "",
        segments: [],                   /* 每一段：起点 from / 终点 to（都是文档坐标 px） */
        cur: { x: 0, y: 0 },            /* 当前实际位置（文档坐标） */
        segIndex: -1,                   /* 现在贴着中心线走在第几段；-1 = 还没到第 1 段起点 */
        t: 0,                           /* 在这一段里的纵向比例：0 = 起点，1 = 终点 */
        parked: true,                   /* true = 现在停在某个点上等着（中心线在轨迹之外） */
        overflow: 0,                    /* “额外滑动”：页面到底之后攒下来的滑动（px），用来走完最后一段 */
        lastScrollY: null,              /* 上一帧的滚动位置：用来把页面自己往回滚的距离还给 overflow */
        visible: null,                  /* 当前显示状态（null = 还没设置过） */
        built: false,
        docX: 0,                        /* 视频在文档里的静态位置：换算 transform 位移用 */
        docY: 0
    };
}

/* 把 2.css 里每一段的起点 / 终点读成 px（窗口大小、底图尺寸变了要重读） */
function buildMotionPath(state) {
    var spec = MOVE_GROUPS[state.group] || null;
    if (!spec) return;

    var segments = [];
    autoSegments().forEach(function (seg) {     /* 段数由 2.css 决定 */
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
        showMotion(state);
        return;
    }

    /* 额外滑动：页面到底之后继续滑的那部分（用来走完最后一段） */
    syncOverflow(state);

    /* ★ 就这一句：中心线在哪儿，人就在哪儿
       （额外滑动直接加在中心线上，等于把中心线临时往下降一点） */
    var centerY = viewportCenterY() + state.overflow;
    var pos = motionPositionAt(state.segments, centerY);
    if (!pos) return;

    state.cur.x = pos.x;
    state.cur.y = pos.y;
    state.segIndex = pos.segIndex;   /* 控制台调试用：现在贴着第几段 */
    state.t = pos.t;                 /* 控制台调试用：在这一段里的纵向比例 */
    state.parked = pos.parked;       /* 控制台调试用：true = 停在某个点上等着 */

    commitMotion(state);
    showMotion(state);
}

/* 启动：接管所有 data-tnpb-move 的视频，让它们跟着滚动位置走 */
function initMovement() {
    /* 先把“点”建到 body 上，再读它们的位置 */
    ensurePoints();

    var roots = Array.prototype.slice.call(document.querySelectorAll("[data-tnpb-move]"));
    if (!roots.length) return;

    var states = roots.map(makeMotionState);
    states.forEach(buildMotionPath);

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
       顺便也盯着 2.css 的 --tnpb-points：改了段数就立刻跟着加/减点。 */
    var layoutKey = "";
    function layoutSignature() {
        var box = document.getElementById("tnpbPoints");
        var points = box ? box.children.length : 0;
        return mapHeight() + "x" + (document.documentElement.clientWidth || window.innerWidth) +
               "p" + points;
    }

    function syncPointCount() {
        var before = document.getElementById("tnpbPoints").children.length;
        ensurePoints();
        return document.getElementById("tnpbPoints").children.length !== before;
    }

    /* 每帧看三件事：点的个数对不对、底图尺寸变没变、人该站在哪儿。
       ★ 位置只跟当前滚动位置有关，这里不做任何计时，也没有“走到一半”的状态。 */
    function frame() {
        /* 段数变了（改了 2.css 的 --tnpb-points）→ 先把点补齐/减掉再重新量 */
        var wanted = declaredPointCount() || DEFAULT_POINT_COUNT;
        var box = document.getElementById("tnpbPoints");
        if (box && box.children.length !== wanted) {
            syncPointCount();
            layoutKey = "";
        }

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

    /* 控制台查看用：homeVideos.tnpb1Motion / homeVideos.feedMotion */
    window.homeVideos = window.homeVideos || {};
    window.homeVideos.tnpb1Motion = states;
    window.homeVideos.renderMotion = renderAll;
    window.homeVideos.feedMotion = feedMotion;
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

    /* 某个容器对应哪一组移动配置；不需要移动就返回 null */
    function moveGroupOf(group, index) {
        if (videoGroupSlug(group) + "-" + index === "tnpb-1") return "tnpb-1";
        return null;
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

        /* 这个视频要不要跟着滚轮移动？要的话在这里标好组名，
           各个“点”由 initMovement() 里的 ensurePoints() 统一建到 body 上 */
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
