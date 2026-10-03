/* ================= 可调参数 ================= */
const WHEEL_SPEED   = 0.1;
const TOUCH_SPEED   = 0.20;
const KEY_STEP      = 30;
const SMOOTHING     = 0.08;
const INTRO_SECONDS = 3;
const REF_WHEEL_RATE = 1000;
const CENTER_X_LEFT  = 0.35;  
const CENTER_X_RIGHT = 0.70;  
const FIT_WIDTH     = 0.56;
const MAX_SCALE     = 2;
const END_MARGIN    = 0.12;
const FULL_LEN      = 0.9;
const MIN_LEN       = 4;     /* 单个元素动画区间的最小值（越小越不容易在窄窗口卡住） */
const GAP_LEN       = 20;
const ENTER_RATIO   = 0.5;

/* 仅作用于"组内绑定"的组（text-3/4/5、text-7/8/9）：
   出场/放大过程中整组允许占据的横向范围，避免放大时左边跑出画面 */
const GROUP_BAND_LEFT  = 0.05;   /* 画面从左数 5% */
const GROUP_BAND_RIGHT = 0.65;   /* 画面从左数 65% */

const INTRO_LEN = INTRO_SECONDS * REF_WHEEL_RATE * WHEEL_SPEED;

/* ================= 底图 ================= */
const bgImg = new Image();
bgImg.src = "./map.png";

function updateBodyHeight() {
    const displayWidth = document.documentElement.clientWidth;
    const displayHeight = displayWidth * bgImg.naturalHeight / bgImg.naturalWidth;
    document.body.style.height = `${displayHeight}px`;
}

/* ================= 工具 ================= */
/* 文字 + 图片一起纳入动画体系（图片需带 .img-box 类） */
const texts = Array.from(document.querySelectorAll(".text-box, .img-box"));

/* ================= 组内绑定：文字带动图片一起出场 ================= */
/* 每一组：[文字, 图片]。图片与文字保持 CSS 里现在这样的静态相对位置，
   出场动效完全跟随该文字（位移 / 缩放 / 透明度都用文字那一套） */
const GROUP_PAIRS = [
    [".text-3", ".img-2"],
    [".text-4", ".img-3"],
    [".text-5", ".img-4"],
    [".text-7", ".img-6"],
    [".text-8", ".img-7"],
    [".text-9", ".img-8"]
];

const followerMap = new Map();   // 图片元素 -> 所属文字元素
const followerEls = new Set();   // 所有被绑定的图片元素（不再单独出场）

GROUP_PAIRS.forEach(([hostSel, followSel]) => {
    const host = document.querySelector(hostSel);
    const follow = document.querySelector(followSel);
    if (host && follow) {
        followerMap.set(follow, host);
        followerEls.add(follow);
    }
});

/* ================= 出场顺序微调 ================= */
/* 默认按元素在页面里的 top 从上到下依次出场。
   这里可以显式把某个元素挪到另一个元素之后，用来单独改出场顺序，其余元素顺序不受影响。
   例：下面这条表示 …text-12 → text-13 → img-9 → text-14… */
const ORDER_AFTER = [
    [".img-9", ".text-13"]
];

/* ================= 滚轮速度分区微调 ================= */
/* 在指定区间内把滚动（滚轮 / 触摸 / 键盘翻页）速度放慢，避免一滑而过看不清。
   格式：[区间起点元素, 区间终点元素, 区间内速度倍率, 区间外过渡长度(进度单位)]
   0.5 = 一半速度；过渡长度用来让进出区间时速度平滑变化，不会突然一顿。
   下面这条：text-11 → text-14 这一段（含 text-12 / text-13 / img-9）用一半速度 */
const SLOW_ZONES = [
    [".text-11", ".text-14", 0.5, 400]
];

/* ================= 与文字同样出场的图片 ================= */
/* 这几张图片完全按"文字的方式"出场：
   - 左右侧按 CSS 里的 right / left 判断（和同区域文字从同一侧进场）
   - 缩放规则与文字一致（不再被限制在 1.5 倍） */
const TEXT_LIKE_IMAGES = [".img-10", ".img-11", ".img-12", ".img-14"];

/* 上面这些图里，需要严格依次出场的一组：
   前一张落到静态位置之后，下一张才开始出现 */
const SEQUENTIAL_IMAGES = [".img-10", ".img-11", ".img-12"];

const textLikeEls = new Set();
TEXT_LIKE_IMAGES.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => textLikeEls.add(el));
});

const sequentialEls = new Set();
SEQUENTIAL_IMAGES.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => sequentialEls.add(el));
});
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let items = [];
let cur = 0;
let target = 0;
let rafId = null;
let lastTime = 0;

const pageMaxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const pageScrollOf = p => {
    const realPageMax = pageMaxScroll();
    const threshold = INTRO_LEN + realPageMax;
    if (p <= INTRO_LEN) return 0;
    if (p >= threshold) return realPageMax;
    return p - INTRO_LEN;
};

/* 页面滚到底时对应的进度值：进度不可能超过它 */
const progressLimit = () => INTRO_LEN + pageMaxScroll();

function maxProgress() {
    if (items.length === 0) return INTRO_LEN;
    const lastItemEnd = items[items.length - 1].E;
    // 不能写成 lastItemEnd + 1000：那会超过 progressLimit()，
    // target 永远到不了，元素就卡在屏幕中间下不来
    return Math.min(lastItemEnd + 1000, progressLimit());
}

/* ================= 核心修改：按编号区分左右入场 ================= */

// 判断单个元素是否从右侧入场（图片默认走左侧，与 text-1~14 一致）
function isRightSideText(el) {
    // 配置为"按文字方式出场"的图片：直接按 CSS 的 right 判断，和右侧文字一致
    if (textLikeEls.has(el)) {
        const style = getComputedStyle(el);
        return style.right !== "auto" && style.right !== "";
    }

    const names = (el.className || "").split(/\s+/);

    // 提取 text-1、text-15 或 img-1、img-15 这样的编号
    const numMatch = names
        .map(cls => cls.match(/^(?:text|img)-(\d+)$/))
        .find(Boolean);

    if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        return num >= 15 && num <= 20;
    }

    // 如果没有编号，再回退到 CSS right 判断
    const computed = getComputedStyle(el);
    return computed.right !== "auto" && computed.right !== "";
}

/* ================= 计算每段文字/图片的动画区间 ================= */
function layout() {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;

    // 每次测量前清空 JS 写入的内联状态，否则会被上次动画状态影响
    texts.forEach(el => {
        el.style.transform = "none";
        el.style.opacity = "";
    });

    const measured = texts.map(el => {
        const rect = el.getBoundingClientRect();
        return {
            el,
            kind: el.classList.contains("img-box") ? "img" : "text",
            w: el.offsetWidth,
            h: el.offsetHeight,
            left: el.offsetLeft,
            top: el.offsetTop,
            isRightSide: isRightSideText(el)
        };
    }).sort((a, b) => a.top - b.top);

    /* 出场顺序微调：把 ORDER_AFTER 里指定的元素挪到目标元素之后，
       只是调整先后次序，不改变元素的位置和动效本身 */
    ORDER_AFTER.forEach(([moveSel, afterSel]) => {
        const from = measured.findIndex(m => m.el.matches(moveSel));
        if (from < 0) return;
        const [moved] = measured.splice(from, 1);
        const to = measured.findIndex(m => m.el.matches(afterSel));
        if (to < 0) { measured.push(moved); return; }
        measured.splice(to + 1, 0, moved);
    });

    const measuredByEl = new Map(measured.map(m => [m.el, m]));

    let prevEnd = 0;
    const items0 = measured.map(m => {

        // 动画窗口长度（与窗口高度挂钩）
        const seg = vh * FULL_LEN;

        // 该元素按自身页面位置"本来"应该结束的时刻
        const idealEnd = m.top + INTRO_LEN - vh * END_MARGIN;

        // 图片还没加载完时 offsetWidth/Height 为 0，会导致 big 算成 Infinity，
        // 这里用回退尺寸保证首次测量也是合法值
        const w0 = m.w > 0 ? m.w : vw * 0.35;
        const h0 = m.h > 0 ? m.h : w0 * 0.5;

        const big = (m.kind === "img" && !textLikeEls.has(m.el))
            ? Math.max(1, Math.min(1.5, (vw * FIT_WIDTH) / w0, (vh * 0.8) / h0))
            : Math.min(
                MAX_SCALE,
                (vw * FIT_WIDTH) / w0,
                (vh * 0.8) / h0
            );

        return { ...m, idealEnd, seg, big };
    });

    /* ---- 关键修复 ----
       进度上限 = INTRO_LEN + 页面实际可滚动高度（由 body 高度决定）。
       如果时间轴总长超过这个上限，排在后面的元素永远走不完动画，
       就会僵在屏幕中间不动 —— 也就是"卡住"。
       这里按可用距离等比压缩整条时间轴，保证滚到底时所有元素都已落位。 */
    const targetEnd = Math.max(INTRO_LEN + 1, INTRO_LEN + pageMaxScroll());
    const scale = Math.min(1, targetEnd / Math.max(1, items0[items0.length - 1].idealEnd));

    items = items0.map(m => {
        const rawE = m.idealEnd * scale;
        const A0 = prevEnd === 0 ? 0 : prevEnd + GAP_LEN;
        const E = Math.max(rawE, A0 + MIN_LEN);
        const A = Math.max(A0, E - m.seg);
        const L1 = (E - A) * ENTER_RATIO;
        const L2 = (E - A) - L1;
        prevEnd = E;

        /* 该元素若绑定了图片，记录图片的静态位置（left/top），
           渲染时按刚体跟随，保证组内相对位置与现在静态一致 */
        const followers = [];
        followerMap.forEach((hostEl, followEl) => {
            if (hostEl !== m.el) return;
            const fm = measuredByEl.get(followEl);
            if (fm) followers.push({ el: followEl, left: fm.left, top: fm.top, w: fm.w, h: fm.h });
        });

        /* 组内绑定的元素：算出整组（文字 + 图片）相对文字左上角的横向包围盒，
           用来把"中间放大"的过程收在 GROUP_BAND_LEFT ~ GROUP_BAND_RIGHT 之间 */
        let gx0 = 0;                                   // 相对文字左边
        let gx1 = m.w > 0 ? m.w : vw * FIT_WIDTH;      // 相对文字右边
        followers.forEach(f => {
            const offL = f.left - m.left;
            const offR = offL + (f.w > 0 ? f.w : 0);
            if (offL < gx0) gx0 = offL;
            if (offR > gx1) gx1 = offR;
        });

        const gw  = Math.max(1, gx1 - gx0);            // 整组宽度
        const gcx = (gx0 + gx1) / 2;                   // 整组中心（相对文字左边）

        // 放大倍率上限：整组最大宽度不超过允许范围，否则会横向跑出画面
        const bandW = vw * (GROUP_BAND_RIGHT - GROUP_BAND_LEFT);
        const sFit = bandW / gw;
        // 整组本身就比允许范围宽时，连起始缩放一起收，否则一出现就超范围
        const scBase = followers.length > 0 ? Math.min(1, sFit) : 1;
        const bigGroup = followers.length > 0
            ? Math.max(scBase, Math.min(m.big, sFit))
            : m.big;

        return { ...m, big: bigGroup, scBase, A, H: A + L1, E, L1, L2, followers, gw, gcx };
    });

    /* ---- 依次出场的图片组：严格排队 ----
       前一张落到静态位置之后，下一张才开始出现。
       做法：把这一组的可用时间（组内第一张的起点 → 最后一张的落位时刻）平均切开，
       每张各占一段、首尾相接。整组起点和最后一张的落位时刻都保持原样，
       所以这一组之后的元素时间点完全不变。 */
    const seqGroup = items.filter(it => sequentialEls.has(it.el));
    const groupIdx = seqGroup.map(it => items.indexOf(it));
    const groupContiguous = groupIdx.every((v, k) => k === 0 || v === groupIdx[k - 1] + 1);

    if (seqGroup.length > 1 && groupContiguous) {
        const gStart = seqGroup[0].A;
        const gEnd = seqGroup[seqGroup.length - 1].E;
        const step = (gEnd - gStart) / seqGroup.length;

        seqGroup.forEach((it, k) => {
            it.A = gStart + step * k;
            it.E = gStart + step * (k + 1);
            it.L1 = (it.E - it.A) * ENTER_RATIO;
            it.L2 = (it.E - it.A) - it.L1;
            it.H = it.A + it.L1;
        });
    }

    /* ---- 图层顺序：后出场的压在先出场的（含已落位）之上 ----
       items 本身就是出场先后顺序，直接按次序给 z-index。
       被绑定跟随的图片与它的宿主文字算同一层（DOM 里图片在后面，
       所以组内仍然是图片压住文字，和现在一致）。 */
    const zOrder = new Map();
    items.forEach((it, i) => {
        if (!zOrder.has(it.el)) zOrder.set(it.el, i);
    });
    followerMap.forEach((hostEl, followEl) => {
        if (zOrder.has(hostEl)) zOrder.set(followEl, zOrder.get(hostEl));
    });
    zOrder.forEach((idx, el) => {
        el.style.zIndex = String(idx + 1);
    });
}

/* ================= 渲染文字与图片 ================= */
function render() {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const p = cur;
    const sa = window.scrollY;

    const cxLeft  = vw * CENTER_X_LEFT;
    const cxRight = vw * CENTER_X_RIGHT;

    items.forEach(it => {
        // 被绑定的图片不单独出场，统一由它所属的文字带动
        if (followerEls.has(it.el)) return;

        const { el, w, h, left, top, A, H, E, L1, L2, big, isRightSide, followers, gw, gcx, scBase } = it;

        const cx = isRightSide ? cxRight : cxLeft;
        const centerTop = vh / 2 - (h * big) / 2;

        /* 组内绑定：以"整组"而不是"文字"为基准做水平定位，
           并把整组收在 5% ~ 65% 之间（只有绑定元素走这套） */
        const isGroup = followers && followers.length > 0;
        const bandL = vw * GROUP_BAND_LEFT;
        const bandR = vw * GROUP_BAND_RIGHT;
        const groupX = sc => {
            const half = (sc * gw) / 2;
            const lo = bandL + half;
            const hi = bandR - half;
            const c = lo <= hi ? clamp(cx, lo, hi) : (bandL + bandR) / 2;
            return c - sc * gcx;           // 换成"文字左上角"的屏幕 x
        };

        let x, y, sc, op = 1;

        if (p <= A) {
            el.style.visibility = "hidden";
            applyFollowers(followers, null, left, top);
            return;
        } else if (p < H) {
            const t = easeOut(clamp((p - A) / L1));
            sc = lerp(scBase, big, t);
            x = isGroup ? groupX(sc) : cx - (w * sc) / 2;
            y = lerp(vh, centerTop, t);
            op = clamp(t * 2);
        } else if (p < E) {
            const t = easeInOut(clamp((p - H) / L2));
            sc = lerp(big, 1, t);
            const fromX = isGroup ? groupX(big) : cx - (w * big) / 2;
            x = lerp(fromX, left, t);
            y = lerp(centerTop, top - sa, t);
        } else {
            // 动画结束：回到 CSS 里的原始位置与大小
            el.style.visibility = "visible";
            el.style.transform = "none";
            el.style.opacity = "";
            applyFollowers(followers, "done", left, top);
            return;
        }

        el.style.visibility = "visible";
        el.style.opacity = op;

        const dx = x - left;
        const dy = y + sa - top;
        el.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;

        // 组内绑定：图片跟着文字做同一套位移与缩放，相对位置保持静态不变
        applyFollowers(followers, { dx, dy, sc, op }, left, top);
    });
}

/* 让绑定在文字上的图片跟随出场。
   state = null   -> 隐藏；
   state = "done" -> 已落位，回到 CSS 静态位置；
   state = {dx, dy, sc, op} -> 以文字左上角为原点做刚体跟随：
   缩放 sc 时，图片相对文字的偏移也同步放大 sc 倍，所以组内相对位置始终不变。 */
function applyFollowers(followers, state, hostLeft, hostTop) {
    if (!followers || followers.length === 0) return;

    followers.forEach(f => {
        if (state === null) {
            f.el.style.visibility = "hidden";
            return;
        }
        if (state === "done") {
            f.el.style.visibility = "visible";
            f.el.style.transform = "none";
            f.el.style.opacity = "";
            return;
        }
        const dx = state.dx + (state.sc - 1) * (f.left - hostLeft);
        const dy = state.dy + (state.sc - 1) * (f.top - hostTop);
        f.el.style.visibility = "visible";
        f.el.style.opacity = state.op;
        f.el.style.transform = `translate(${dx}px, ${dy}px) scale(${state.sc})`;
    });
}

/* ================= 滚动驱动 ================= */
function tick(now) {
    const dt = Math.min(50, now - lastTime || 16.67);
    lastTime = now;

    const k = 1 - Math.pow(1 - SMOOTHING, dt / 16.67);
    cur += (target - cur) * k;

    if (Math.abs(target - cur) < 0.1) cur = target;

    window.scrollTo({ top: pageScrollOf(cur), behavior: "instant" });
    render();

    if (cur !== target) {
        rafId = requestAnimationFrame(tick);
    } else {
        rafId = null;
        lastTime = 0;
    }
}

function startLoop() {
    if (rafId === null) {
        lastTime = 0;
        rafId = requestAnimationFrame(tick);
    }
}

/* 当前进度处的滚动速度倍率：区间内取设定倍率，进出区间时在 fade 距离内平滑过渡回 1 */
function zoneSpeedFactor(p) {
    let f = 1;
    if (SLOW_ZONES.length === 0 || items.length === 0) return f;

    SLOW_ZONES.forEach(([fromSel, toSel, k, fade = 400]) => {
        const a = items.find(i => i.el.matches(fromSel));
        const b = items.find(i => i.el.matches(toSel));
        if (!a || !b || fade <= 0) return;

        // t = 0 表示正处在区间内，t = 1 表示已完全离开区间
        const t = p < a.A ? clamp((a.A - p) / fade)
                : p > b.E ? clamp((p - b.E) / fade)
                : 0;

        f = Math.min(f, lerp(k, 1, t));
    });

    return f;
}

function addTarget(delta) {
    // 当前所在区域若配置了减速，滚轮位移按倍率缩小
    target = clamp(target + delta * zoneSpeedFactor(target), 0, maxProgress());
    startLoop();
}

window.addEventListener("wheel", e => {
    e.preventDefault();

    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= window.innerHeight;

    addTarget(d * WHEEL_SPEED);
}, { passive: false });

let touchY = null;

window.addEventListener("touchstart", e => {
    touchY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchmove", e => {
    e.preventDefault();

    const y = e.touches[0].clientY;
    if (touchY !== null) {
        addTarget((touchY - y) * TOUCH_SPEED);
    }
    touchY = y;
}, { passive: false });

window.addEventListener("touchend", () => {
    touchY = null;
});

window.addEventListener("keydown", e => {
    const vh = window.innerHeight;
    const page = vh * WHEEL_SPEED * 2;

    const map = {
        ArrowDown: KEY_STEP,
        ArrowUp: -KEY_STEP,
        PageDown: page,
        PageUp: -page,
        " ": e.shiftKey ? -page : page
    };

    if (e.key in map) {
        e.preventDefault();
        addTarget(map[e.key]);
    } else if (e.key === "Home") {
        e.preventDefault();
        target = 0;
        startLoop();
    } else if (e.key === "End") {
        e.preventDefault();
        target = maxProgress();
        startLoop();
    }
});

window.addEventListener("scroll", () => {
    const computedPageP = window.scrollY > 0 ? INTRO_LEN + window.scrollY : 0;
    const pageThreshold = progressLimit();

    if (window.scrollY >= pageMaxScroll()) {
        if (cur < pageThreshold) {
            cur = target = pageThreshold;
        }
    } else {
        if (Math.abs(window.scrollY - pageScrollOf(cur)) > 2) {
            cur = target = Math.min(computedPageP, pageThreshold);
        }
    }

    render();
}, { passive: true });

function onResize() {
    updateBodyHeight();
    layout();
    cur = target = clamp(cur, 0, maxProgress());
    render();
}

/* ================= 初始化 ================= */
bgImg.onload = function () {
    document.body.style.backgroundImage = `url("./map.png")`;
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundSize = "100% auto";
    document.body.style.minHeight = "unset";

    updateBodyHeight();

    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
        // 先清掉可能残留的内联动画状态，再测量
        texts.forEach(el => {
            el.style.transform = "none";
            el.style.opacity = "";
        });

        layout();

        cur = target = window.scrollY > 0 ? INTRO_LEN + window.scrollY : 0;
        render();

        window.addEventListener("resize", onResize);

        // 图片若比 map.png 晚加载完，第一次测量会得到 0 宽高，
        // 因此每张图加载完成后重新测量一次，避免动画比例出错
        texts.forEach(el => {
            if (el.tagName === "IMG" && !el.complete) {
                el.addEventListener("load", onResize);
                el.addEventListener("error", () => {
                    console.error("图片加载失败，请检查文件路径：", el.getAttribute("src"));
                });
            }
        });

        // 兜底：所有资源就绪后再量一次
        window.addEventListener("load", onResize);
    });
};

bgImg.onerror = function () {
    console.error("map.png 图片加载失败，请检查文件路径");
};
