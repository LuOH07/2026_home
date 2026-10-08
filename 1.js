/* 滚轮 delta → 进度 的换算系数：越大，同样的滚轮输入页面“播”得越快 */
const WHEEL_SPEED = 0.1;

/* 时间轴总长超过页面可滚动范围时，自动下调播放速度，保证 3s 之类的时长不被压缩变形。
   自动值会打印到控制台；想自己写死就把这里改成 false，再手调 WHEEL_SPEED。 */
const AUTO_FIT = true;

/* 自适应最多把播放速度降到 1/MAX_SLOWDOWN（也就是滚轮最多需要多滚这么多倍）。
   调大 = 每个组件之间的“间隔”保留得更多、整页更慢；调小 = 更接近原速、间隔被压掉。 */
const MAX_SLOWDOWN = 2;

const TOUCH_SPEED = 0.20;
const KEY_STEP = 30;          /* 键盘单步（名义进度，会跟随播放速度缩放） */
const SMOOTHING = 0.08;
const REF_WHEEL_RATE = 1000;  /* “1 秒”的定义：以每秒 1000 的滚轮 delta 为名义速度 */
const INTRO_SECONDS = 0;      /* 开场静止时长（秒）。新动效不需要，保持 0 */
const TAIL_SECONDS = 1.5;     /* 最后一个组件消失后，页面还留多少滚动（秒） */

/* ---- 默认动效时长（秒）---- */
const FADE_IN_SECONDS = 0.6;   /* 原地淡入时长 */
const HOLD_SECONDS = 3.0;      /* 钉在竖直视觉中心的停留时长 ← 需求里的 3s */
const FADE_OUT_SECONDS = 0.6;  /* 原地淡出时长 */
const GAP_SECONDS = 0;         /* 相邻组件之间的额外留白（秒）；0 = 上一个消失完下一个立刻淡入 */

/* ---- 单个组件单独拎出来可改：从上往下匹配，命中的规则覆盖默认值 ----
   例：
   const COMPONENT_TIMING = [
       { sel: ".text-15", hold: 4.0, fadeIn: 0.8, fadeOut: 0.8 },
       { sel: ".text-1",  hold: 2.0 },
       { sel: ".img-13",  fadeIn: 1.2 }
   ];                                                                */
const COMPONENT_TIMING = [];

/* ============================ 2. 底图 ============================ */
const bgImg = new Image();
bgImg.src = "./map.png";

function updateBodyHeight() {
    const displayWidth = document.documentElement.clientWidth;
    const displayHeight = displayWidth * bgImg.naturalHeight / bgImg.naturalWidth;
    document.body.style.height = `${displayHeight}px`;
}

/* ============================ 3. 元素与绑定关系（保持原样） ============================ */

/* 参与动画的元素：文字 + 图片。色块单独处理（跟随宿主） */
const texts = Array.from(document.querySelectorAll(".text-box, .img-box"));
const rectEls = Array.from(document.querySelectorAll(".rect-box"));

/* 组内绑定：文字带动图片一起出现 / 一起消失，相对位置与现在静态完全一致 */
const GROUP_PAIRS = [
    [".text-3", ".img-2"],
    [".text-4", ".img-3"],
    [".text-5", ".img-4"],
    [".text-7", ".img-6"],
    [".text-8", ".img-7"],
    [".text-9", ".img-8"]
];

const followerMap = new Map();   // 图片元素 -> 所属文字元素
const followerEls = new Set();   // 所有被绑定的图片元素（不单独占时间轴）

GROUP_PAIRS.forEach(([hostSel, followSel]) => {
    const host = document.querySelector(hostSel);
    const follow = document.querySelector(followSel);
    if (host && follow) {
        followerMap.set(follow, host);
        followerEls.add(follow);
    }
});

/* 出场顺序微调：把某个元素挪到另一个元素之后（只改先后，不改位置） */
const ORDER_AFTER = [];

/* 滚轮速度分区微调：[区间起点, 区间终点, 区间内速度倍率, 区间外过渡长度(名义进度)]
   现在每个组件自己就有 3s 停留，这两段如果想和别处一样快，直接清空本数组即可。 */
const SLOW_ZONES = [
    [".text-11", ".text-14", 0.5, 400],
    [".text-15", ".text-16", 0.5, 400]
];

/* 色块组：4 个色块绑在宿主组件上，和宿主一起淡入 / 一起淡出，共享宿主那段停留时间 */
const RECT_HOST = ".text-15";

/* ============================ 4. 工具 & 状态 ============================ */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);

function matches(el, sel) {
    try {
        return el.matches(sel);
    } catch (err) {
        console.warn("[home] 选择器无效：", sel, err);
        return false;
    }
}

let items = [];        // 时间轴：每个组件一段 [A, H, B, E]
let cur = 0;
let target = 0;
let rafId = null;
let lastTime = 0;
let fitScale = 1;      // 自适应播放速度倍率（1 = 不降速）

const playbackRate = () => REF_WHEEL_RATE * WHEEL_SPEED * fitScale;  // 每秒 ≈ 多少进度
const wheelFactor = () => WHEEL_SPEED * fitScale;                    // 滚轮 delta → 进度
const introLen = () => INTRO_SECONDS * playbackRate();

const pageMaxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const pageScrollOf = p => {
    const realPageMax = pageMaxScroll();
    const L = introLen();
    if (p <= L) return 0;
    if (p >= L + realPageMax) return realPageMax;
    return p - L;
};

/* 页面滚到底时对应的进度值：进度不可能超过它 */
const progressLimit = () => introLen() + pageMaxScroll();

function maxProgress() {
    const lim = progressLimit();
    if (items.length === 0) return lim;
    return Math.min(items[items.length - 1].E + TAIL_SECONDS * playbackRate(), lim);
}

/* 单个组件的时长配置（秒） */
function timingOf(el) {
    const t = { fadeIn: FADE_IN_SECONDS, hold: HOLD_SECONDS, fadeOut: FADE_OUT_SECONDS };
    COMPONENT_TIMING.forEach(rule => {
        if (!rule || !rule.sel || !matches(el, rule.sel)) return;
        if (rule.fadeIn != null) t.fadeIn = Math.max(0, rule.fadeIn);
        if (rule.hold != null) t.hold = Math.max(0, rule.hold);
        if (rule.fadeOut != null) t.fadeOut = Math.max(0, rule.fadeOut);
    });
    return t;
}

/* ============================ 5. 色块随机参数 ============================ */
/* 每个色块一套独立的错落淡入参数 + 无限循环的漂浮参数。
   注意：这些“毫秒”只在 layout() 里换算成进度，实际淡入淡出由进度驱动，
   所以上滑回退时和下滑完全对称，可以完整倒放。 */
const rectRand = (a, b) => a + Math.random() * (b - a);

function randomizeRectMotion(el) {
    el.style.setProperty("--rscale", rectRand(1.12, 1.34).toFixed(3));
    el.style.setProperty("--rtx", rectRand(-36, 36).toFixed(1) + "px");
    el.style.setProperty("--rty", rectRand(-26, 26).toFixed(1) + "px");
}

rectEls.forEach(el => {
    el.__rfade = Math.round(rectRand(600, 1100));   // 淡入时长
    el.__rdelay = Math.round(rectRand(0, 450));     // 淡入延迟（错落感）
    el.style.setProperty("--rdur", rectRand(2.4, 4.0).toFixed(2) + "s");
    randomizeRectMotion(el);

    // 每转完一圈换一组新的随机漂浮参数（周期不变，避免打乱相位）
    el.addEventListener("animationiteration", () => randomizeRectMotion(el));
});

/* ============================ 6. 时间轴 ============================ */
function layout() {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;

    // 每次测量前清空 JS 写入的内联状态，否则会被上次动画状态影响
    texts.forEach(el => {
        el.style.transform = "none";
        el.style.opacity = "";
        el.style.visibility = "";
    });
    rectEls.forEach(el => {
        el.style.marginTop = "0px";
        el.style.opacity = "0";
    });

    /* ---- 测量 + 按页面上下位置排序（被绑定的图片不单独占时间轴） ---- */
    const measured = texts
        .filter(el => !followerEls.has(el))
        .map(el => ({
            el,
            w: el.offsetWidth,
            h: el.offsetHeight,
            left: el.offsetLeft,
            top: el.offsetTop
        }))
        .sort((a, b) => a.top - b.top);

    ORDER_AFTER.forEach(([moveSel, afterSel]) => {
        const from = measured.findIndex(m => matches(m.el, moveSel));
        if (from < 0) return;
        const [moved] = measured.splice(from, 1);
        const to = measured.findIndex(m => matches(m.el, afterSel));
        if (to < 0) { measured.push(moved); return; }
        measured.splice(to + 1, 0, moved);
    });

    /* ---- 每个组件“自然到达竖直视觉中心”的进度 ----
       页面滚动到 scrollY 时，元素在屏幕上的中心 = top + h/2 - scrollY，
       让它等于 vh/2 即 scrollY = top + h/2 - vh/2，也就是下面的 arrival。
       INTRO_SECONDS 用名义速度估算，避免和下面的自适应互相依赖。 */
    const introNominal = INTRO_SECONDS * REF_WHEEL_RATE * WHEEL_SPEED;
    const limit = pageMaxScroll() + introNominal;

    const arrivals = measured.map(m => introNominal + m.top + m.h / 2 - vh / 2);
    const secs = measured.map(m => {
        const t = timingOf(m.el);
        return t.fadeIn + t.hold + t.fadeOut;
    });

    const nominalRate = REF_WHEEL_RATE * WHEEL_SPEED;
    const n = measured.length;

    /* 串行时间轴：A = max(自然到达点, 上一个组件结束点 + 间隔)
       —— 这条 max 就是需求里的“上一个完全消失下一个才淡入”：
          有间隔时自然到达点更大 → 保留间隔；会撞车时上一个的结束点更大 → 后面的等。 */
    function chainEnd(arr, rate) {
        let prevEnd = 0;
        let end = 0;
        for (let i = 0; i < arr.length; i++) {
            const A = i === 0
                ? Math.max(arr[0], 0)
                : Math.max(arr[i], prevEnd + GAP_SECONDS * rate);
            end = A + secs[i] * rate;
            prevEnd = end;
        }
        return end;
    }

    /* 所有窗口（含固定间隔）加起来就要占掉的进度：
       它必须 ≤ limit，否则“每个组件各播一遍”本身就放不下，只能靠降低播放速度解决 */
    const fixedGapSeconds = GAP_SECONDS * Math.max(0, n - 1);
    const sumSeconds = secs.reduce((a, b) => a + b, 0) + fixedGapSeconds;
    const rMax = Math.min(nominalRate, limit / Math.max(1e-6, sumSeconds));

    let rate = nominalRate;
    if (n > 0) {
        if (AUTO_FIT) {
            /* 1) rIdeal = 不需要把任何组件“提前拉入”的最大速度：
                  这个速度下，每个组件都在它自然滑到竖直中心的那一刻开始淡入。 */
            let lo = 0;
            let hi = rMax;
            for (let i = 0; i < 32; i++) {
                const mid = (lo + hi) / 2;
                if (chainEnd(arrivals, mid) <= limit) lo = mid; else hi = mid;
            }
            const rIdeal = lo;

            /* 2) 有界下调：滚轮→进度的换算与“秒→进度”的换算同步缩小，
                  所以每个组件的 3s 真实时长不变，只是滚轮要多滚一点；
                  换来的好处是组件之间原本的间隔能尽量保留下来。 */
            const rMin = nominalRate / MAX_SLOWDOWN;
            rate = clamp(rIdeal, Math.min(rMin, rMax), rMax);
        }
        if (sumSeconds * rate > limit + 1e-6) {
            console.warn("[home] 时间轴放不下：请调小 HOLD_SECONDS / 调大 MAX_SLOWDOWN / 打开 AUTO_FIT");
        }
    }

    fitScale = nominalRate > 0 ? rate / nominalRate : 1;

    /* ---- 到达点上限：cap_i = limit - 自己与后面所有组件（含间隔）需要占用的进度。
       有了它，无论布局多密、最后一个元素多靠下，
       都一定能在页面滚到底之前播完，而且永远是“上一个完全消失，下一个才淡入”。 ---- */
    const caps = new Array(n);
    let tail = 0;
    for (let i = n - 1; i >= 0; i--) {
        caps[i] = limit - secs[i] * rate - tail;
        tail += secs[i] * rate + GAP_SECONDS * rate;
    }

    /* ---- 生成最终时间轴 ---- */
    let prevEnd = 0;
    let pulledCount = 0;
    items = measured.map((m, i) => {
        const t = timingOf(m.el);
        const natural = Math.min(arrivals[i], caps[i]);   // 到达点只在“装不下”时局部前移
        if (arrivals[i] > caps[i] + 1e-6) pulledCount++;
        const A = i === 0
            ? Math.max(natural, 0)
            : Math.max(natural, prevEnd + GAP_SECONDS * rate);
        const H = A + t.fadeIn * rate;                      // 淡入结束
        const B = H + t.hold * rate;                        // 停留结束，开始淡出
        const E = B + t.fadeOut * rate;                     // 完全消失
        prevEnd = E;

        /* 组内绑定：被绑定的图片不单独出场，跟随宿主做同一套位移与透明度 */
        const followers = [];
        followerMap.forEach((hostEl, followEl) => {
            if (hostEl === m.el) followers.push({ el: followEl });
        });

        /* 色块组：跟随宿主（透明度另有错落延迟） */
        const rects = [];
        if (rectEls.length && matches(m.el, RECT_HOST)) {
            rectEls.forEach(el => rects.push({
                el,
                delay: (el.__rdelay || 0) / 1000 * rate,
                fadeIn: (el.__rfade || 0) / 1000 * rate
            }));
        }

        return { ...m, A, H, B, E, followers, rects };
    });

    /* ---- 图层顺序：后出场的压在先出场的之上（含已落位的组内图片） ---- */
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

    const endP = items.length ? items[items.length - 1].E : 0;
    console.info(
        `[home] 组件 ${items.length} 个 | 播放速度 ${WHEEL_SPEED} → ${(WHEEL_SPEED * fitScale).toFixed(4)}` +
        `（自适应 ×${fitScale.toFixed(3)}，滚轮需多滚 ${(1 / fitScale).toFixed(2)} 倍）| ` +
        `时间轴 ${Math.round(endP)} / 可用 ${Math.round(limit)} | 整页约 ${rate > 0 ? (limit / rate).toFixed(0) : "∞"}s | ` +
        `到达点前移 ${pulledCount} 个`
    );
}

/* ============================ 7. 渲染 ============================ */
/* 任何一个进度 p 下，可见组件都在竖直视觉中心：屏幕上 = vh/2 - h/2。
   相对静态位置需要的位移 = (vh - h)/2 + scrollY - top（scrollY 每帧补偿掉了页面滚动）。 */
function render() {
    const vh = window.innerHeight;
    const p = cur;
    const sa = window.scrollY;

    items.forEach(it => {
        if (followerEls.has(it.el)) return;   // 被绑定的图片由宿主带动（正常不会走到这里）

        const { el, h, top, A, H, B, E, followers, rects } = it;

        /* 还没轮到 / 已经消失：完全藏起来，静态位置保持不动 */
        if (p <= A || p >= E) {
            el.style.visibility = "hidden";
            el.style.opacity = "";
            el.style.transform = "none";
            applyFollowers(followers, null);
            if (rects && rects.length) {
                rects.forEach(r => { r.el.style.opacity = "0"; });
            }
            return;
        }

        const dy = (vh - h) / 2 + sa - top;   // 钉在竖直视觉中心

        let op;
        if (p < H) {
            op = easeOut((p - A) / Math.max(1e-6, H - A));                     // 原地淡入
        } else if (p < B) {
            op = 1;                                                            // 原地停留
        } else {
            op = 1 - easeOut(clamp((p - B) / Math.max(1e-6, E - B)));           // 原地淡出
        }

        el.style.visibility = "visible";
        el.style.opacity = String(op);
        el.style.transform = `translate(0px, ${dy}px)`;

        // 组内绑定：图片跟着文字做同一套位移（无缩放，相对位置分毫不差）
        applyFollowers(followers, { dy, op });

        // 色块组：跟着宿主钉在中心；透明度按各自随机延迟错落淡入、和宿主一起淡出
        if (rects && rects.length) {
            rects.forEach(r => {
                r.el.style.opacity = String(rectOpacityAt(r, p, it));
                r.el.style.marginTop = `${dy}px`;
            });
        }
    });
}

/* 让绑定在文字上的图片跟随宿主：
   state = null -> 隐藏；state = {dy, op} -> 位移 / 透明度和宿主完全一致 */
function applyFollowers(followers, state) {
    if (!followers || followers.length === 0) return;

    followers.forEach(f => {
        if (state === null) {
            f.el.style.visibility = "hidden";
            f.el.style.opacity = "";
            f.el.style.transform = "none";
            return;
        }
        f.el.style.visibility = "visible";
        f.el.style.opacity = String(state.op);
        f.el.style.transform = `translate(0px, ${state.dy}px)`;
    });
}

/* 色块的透明度包络：宿主淡入区间内按各自随机延迟错落拉起，
   淡出区间与宿主同步（同一个包络，因此上滑可以完整倒放）。 */
function rectOpacityAt(r, p, host) {
    if (p <= host.A || p >= host.E) return 0;

    const t1 = host.A + r.delay;
    const t2 = t1 + r.fadeIn;

    if (p < t1) return 0;
    if (p < t2) return easeOut((p - t1) / Math.max(1e-6, t2 - t1));
    if (p < host.B) return 1;
    return 1 - easeOut(clamp((p - host.B) / Math.max(1e-6, host.E - host.B)));
}

/* ============================ 8. 滚动驱动 ============================ */
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

/* 当前进度处的滚动速度倍率：区间内取设定倍率，进出区间时在过渡长度内平滑回到 1 */
function zoneSpeedFactor(p) {
    let f = 1;
    if (SLOW_ZONES.length === 0 || items.length === 0) return f;

    SLOW_ZONES.forEach(zone => {
        const [fromSel, toSel, k, fade = 400] = zone;
        const a = items.find(i => matches(i.el, fromSel));
        const b = items.find(i => matches(i.el, toSel));
        if (!a || !b) return;

        // 过渡长度同样跟着播放速度缩放，保证换算成“秒”后和以前一致
        const fadeLen = fade * fitScale;
        if (fadeLen <= 0) return;

        const t = p < a.A ? clamp((a.A - p) / fadeLen)
                : p > b.E ? clamp((p - b.E) / fadeLen)
                : 0;

        f = Math.min(f, k + (1 - k) * t);
    });

    return f;
}

function addTarget(delta) {
    target = clamp(target + delta * zoneSpeedFactor(target), 0, maxProgress());
    startLoop();
}

window.addEventListener("wheel", e => {
    e.preventDefault();

    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= window.innerHeight;

    addTarget(d * wheelFactor());
}, { passive: false });

let touchY = null;

window.addEventListener("touchstart", e => {
    touchY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchmove", e => {
    e.preventDefault();

    const y = e.touches[0].clientY;
    if (touchY !== null) {
        addTarget((touchY - y) * TOUCH_SPEED * fitScale);
    }
    touchY = y;
}, { passive: false });

window.addEventListener("touchend", () => {
    touchY = null;
});

window.addEventListener("keydown", e => {
    const vh = window.innerHeight;
    const page = vh * wheelFactor() * 2;
    const step = KEY_STEP * fitScale;

    const map = {
        ArrowDown: step,
        ArrowUp: -step,
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
    const computedPageP = window.scrollY > 0 ? introLen() + window.scrollY : 0;
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

/* ============================ 9. 初始化 ============================ */
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
            el.style.visibility = "";
        });

        layout();

        cur = target = clamp(window.scrollY > 0 ? introLen() + window.scrollY : 0, 0, maxProgress());
        render();

        window.addEventListener("resize", onResize);

        // 图片若比 map.png 晚加载完，第一次测量会得到 0 宽高，
        // 因此每张图加载完成后重新测量一次，避免动效比例出错
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

/* 调试用：控制台里 __home.items 可以看到每个组件的时间轴 */
window.__home = {
    get items() { return items; },
    get fitScale() { return fitScale; },
    get rate() { return playbackRate(); },
    get limit() { return progressLimit(); },
    layout,
    render
};
