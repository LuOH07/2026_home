/* ==========================================================================
   3.js —— .text-3 / .text-4 / .text-5 下方那三个宿主图标
   --------------------------------------------------------------------------
   要做的事（出场顺序，一个比一个晚）：
     · 图标 1（b-subtilis）：text-3 一淡入就跟着淡入 —— 出场时间不变；
     · 图标 2（e-coli）    ：text-3【淡出结束】之后才开始淡入；
     · 图标 3（p-putida）  ：text-4【淡入结束】之后才开始淡入；
     · 四个图标各自的淡入时长都是同一条曲线、同一个长度；
     · 这四个图标【不在各自宿主淡出时消失】，而是等 text-6 开始淡出时一起淡出
       （text-6 完全消失时，它们也正好全没了）；
     · 图标亮着（＝出现在页面里）的那段时间，各自在【屏幕左侧 0%~60% 这块区域】里飘：
       沿当前直线匀速前进，图片边缘碰到这块区域的边界或另一个图标的边缘，
       就按光反射（镜面反射）弹回 —— 见下面 DRIFT 那一段（改 area 就能换活动范围）；
     · 图层夹在【背景】和【文字】之间（见 3.css 的 z-index）：
       盖得住底图和背景视频，和靠后的文字是有前有后的。
   分工（按需求）：
     · 3.js  ＝ 图片链接（src）+ 淡入 / 淡出 + 飘动（直线前进 / 反弹）；
     · 3.css ＝ 大小 / 图层 / 兜底落点（一个铺满视口的固定画框）。
   ★ 想再调出场次序，只改下面 ICONS 里的 start / end 两个字段（见那里的注释）；
     想调飘动速度 / 初始方向，只改下面 DRIFT 那一段。

   怎么和 1.js 对上（不要去改 1.js）：
     1.js 每画一帧都会调用它自己的全局 render()，3.js 把 window.render 包一层：
     文字画完立刻跟着画图标，用的还是同一帧的 cur / freezePos，
     所以图标和文字严丝合缝，也不用自己开定时器。
     1.js 把整条时间轴挂在 window.__home 上（items / cur / freezePos / freezeActive /
     frozenZone …），下面所有状态都从那里读，3.js 不复制 1.js 的任何算法。
   ========================================================================== */
(function () {
    "use strict";

    /* ======================= 1. 四个图标（图片链接 / 出场点在这里改） =======================
       cls  ：3.css 里对应的样式钩子（要单独调某个图标的大小就改那里）
       host ：图标“属于”哪一段文字 —— 找不到它时这个图标就整个不显示；
              它同时也是淡出包络的判断依据
       src  ：图片链接
       name ：仅用于控制台报错信息
       label：鼠标 hover 到图标上时显示的名字（移开就消失）；
              字体 / 颜色写在 3.css 的 .bug-label 里（正文字体 + #465E77）
       start：这个图标【什么时候开始淡入】—— 写“认哪一段文字的哪个时刻”：
                from : 用哪一段文字当时钟（用它的淡入区间 [A, H] 算曲线）
                mark : "A" = 这段文字刚开始淡入（出场时间不变的那个选项）
                       "H" = 这段文字淡入结束（完全看清了）
                       "E" = 这段文字完全消失（淡出结束）
                shift: 在 mark 之后再往后推多少（一般 0）
              —— 图标 1 写 ".text-3" + "A" 就等于原来的行为：text-3 一淡入它就淡入；
                 图标 2 / 4 写 ".text-3" + "E"：等 text-3 完全淡出之后它才出现；
                 图标 3 写 ".text-4" + "H"：等 text-4 完全淡入之后它才出现。
              ★ 图标 3 认的 text-4 属于冻结组（1.js 的 FREEZE_GROUPS），
                它的进度由滚轮驱动的 freezePos 给出，下面 resolveWindow() 会自动认对时钟，
                所以“text-4 淡入结束”这一刻是准的，不需要改 1.js。
              ★ 图标 4 和图标 2 的 start 完全一样（同一个 from + 同一个 mark），
                所以它们的出场时刻分毫不差；淡入时长也一样（同一条曲线、同一个长度）；
                淡出也都在 text-6 那一段里一起消失 —— 也就是“动效完全一样”，
                只是初始落点 / 飘动速度不同，所以看起来是两只各飘各的。
       end  ：淡入什么时候结束（可选）。
              写了：从 start 到 end 之间淡入，于是“出场时间不变”＝淡入时长都一样；
              不写：从 start 往后淡入 host.H - host.A 那么长（和图标 1 的时长一致）。
       pin  ：true = 【不飘动】。位置完全交给 3.css 里对应的 .bug-icon-N 决定
              （left / right / top / bottom 随便写），于是它钉在屏幕上，
              页面怎么滚都保持相对屏幕位置不变 —— 图标 5 / 6 就是这种。
              不写（或 false）= 参与飘动 / 碰撞（图标 1~4 是这种）。
       fadeOut：这个图标【跟着哪一段文字的淡出一起消失】。
              不写 = 默认 FADE_OUT_HOST（.text-6），也就是图标 1~4 的行为；
              写了 = 换成那一段（例如 ".text-2"）：那段文字开始淡出时图标跟着暗，
              那段文字完全消失时图标也正好没了 —— 图标 5 / 6 就是这种。
              往回滚动时自动反向恢复（和 1.js 的时间轴完全对称）。
       ========================================================================== */
    /* 图标 7（箭头）的淡入时长倍数：
       ico6 要等它【渐入完全结束】之后才出现，所以两处都引用这一个数，只改这里 */
    const ARROW_FADE_SCALE = 1.8;

    const ICONS = [
        {
            cls: "bug-icon-1",
            host: ".text-3",
            src: "https://static.igem.wiki/teams/6059/wiki/home/b-subtilis.avif",
            name: "Bacillus subtilis",
            label: "B.subtilis",
            /* 出场时间不变：text-3 一淡入就跟着淡入，时长 = text-3 的淡入区间 */
            start: { from: ".text-3", mark: "A" }
        },
        {
            cls: "bug-icon-2",
            host: ".text-4",
            src: "https://static.igem.wiki/teams/6059/wiki/home/e-coli.avif",
            name: "Escherichia coli",
            label: "E.coli",
            /* text-3【完全淡出】之后才开始淡入；时长仍然和图标 1 一样（见下面 resolveWindow） */
            start: { from: ".text-3", mark: "E" }
        },
        {
            cls: "bug-icon-3",
            host: ".text-5",
            src: "https://static.igem.wiki/teams/6059/wiki/home/p-putida.avif",
            name: "Pseudomonas putida",
            label: "P.putida",
            /* text-4【完全淡入】之后才开始淡入；时长仍然和图标 1 一样 */
            start: { from: ".text-4", mark: "H" }
        },
        {
            cls: "bug-icon-4",
            host: ".text-4",
            src: "https://static.igem.wiki/teams/6059/wiki/home/e-coli-1.avif",
            name: "Escherichia coli (2)",
            label: "E.coli",
            /* ★ 和图标 2 完全一样：同一个 from、同一个 mark
               → 出场时刻 / 淡入时长 / 淡出时机 都和图标 2 一致，只有初始落点不同 */
            start: { from: ".text-3", mark: "E" }
        },

        /* ---- 下面两只【不飘动】，钉在屏幕上（pin: true）----
           ★ 位置在 3.css 的 .bug-icon-5 / .bug-icon-6 里改（left / bottom）
           ★ 它们【只活到 text-2 淡出为止】：fadeOut 写的是 ".text-2"，
             text-2 开始淡出时它们跟着暗下去，text-2 完全消失时它们也正好没了。
             （图标 1~4 没有写 fadeOut，所以仍然跟着默认的 .text-6 一起消失。） */
        {
            cls: "bug-icon-5",
            host: ".text-1",
            src: "https://static.igem.wiki/teams/6059/wiki/home/crispr.avif",
            name: "CRISPR",
            pin: true,                      /* ★ 不飘动：位置由 3.css 决定 */
            fadeOut: ".text-2",             /* ★ text-2 淡出时一起消失 */
            /* text-1【一出现】就跟着出现 */
            start: { from: ".text-1", mark: "A" }
        },
        {
            cls: "bug-icon-6",
            host: ".text-1",
            src: "https://static.igem.wiki/teams/6059/wiki/home/tnpb.avif",
            name: "TnpB",
            pin: true,                      /* ★ 不飘动：位置由 3.css 决定 */
            fadeOut: ".text-2",             /* ★ text-2 淡出时一起消失 */
            /* ★ 等图标 7（箭头）【渐入完全结束】之后才出现 ——
               顺序变成：text-1 消失 → 箭头淡入 → ico6 淡入 */
            start: { from: ".text-1", mark: "E", shift: item => (item.H - item.A) * ARROW_FADE_SCALE }
        },
        {
            cls: "bug-icon-7",
            host: ".text-1",
            src: "https://static.igem.wiki/teams/6059/wiki/home/arrow.avif",
            name: "Arrow",
            pin: true,                      /* ★ 不飘动：位置默认由下面的 between 自动算 */
            fadeOut: ".text-2",             /* ★ 和图标 5 / 6 一起消失 */
            /* ★ text-1【完全消失】之后立刻出现（比 ico6 早）：
               ico6 要等这一段的渐入彻底走完才开始淡入（见 ico6 的 shift）。 */
            start: { from: ".text-1", mark: "E" },
            /* ★ 淡入时【左半边先出现、右半边后出现】：
               用一条从左往右扫开的柔性遮罩，实现见下面的 paintReveal()。 */
            reveal: { feather: 0.42 },
            /* ★ 淡入时长 = 自己那条默认时长 × 这个倍数（ico6 等的就是这一段）：
               调大 = 渐入更慢，ico6 的出场也会跟着一起往后推 */
            fadeScale: ARROW_FADE_SCALE,
            /* ★ 位置：默认对准图标 5 / 6 两只图标的【正中间】（见 placeBetween）；
               想手动钉死就删掉这一行，然后改 3.css 的 .bug-icon-7。 */
            between: [".bug-icon-5", ".bug-icon-6"]
        },
        {
            cls: "bug-icon-8",
            host: ".text-8",
            src: "https://static.igem.wiki/teams/6059/wiki/home/ctac.avif",
            name: "CTAC",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-8 决定 */
            /* ★ text-8【淡入区间】里跟着一起淡入 ——
               这两段在冻结组里，时钟会自动切到滚轮驱动的 freezePos（见 resolveWindow），
               所以“text-8 刚开始淡入”这一刻是准的。 */
            start: { from: ".text-8", mark: "A" },
            /* ★ text-9 淡出时一起消失；往上滑倒放时也会对称地亮回来 */
            fadeOut: ".text-9"
        }
    ];

    /* 没写 fadeOut 的图标统一在它的淡出区间里一起消失（默认 .text-6）；
       写了 fadeOut 的各自认自己的宿主：图标 5 / 6 / 7 跟 .text-2，图标 8 跟 .text-9 */
    const FADE_OUT_HOST = ".text-6";

    /* ======================= 飘动（图标“出现在页面里”的那段时间在飘） =======================
       现在的运动模型 = 台球 / 光反射：
         · 每个图标有一个【恒定速度】，沿当前直线一直往前（匀速，不加速不减速）；
         · 撞到【运动区域】的边框 → 按反射定律弹回：
           撞左右边框翻 vx，撞上下边框翻 vy，撞角落两个都翻；
         · 撞到另一个图标（按两个盒子的边缘算，不是中心点）→ 两个一起弹开，
           沿分离轴把速度分量按反射交换（等质量弹性碰撞），并把重叠推开，绝不卡在一起。
       ★ 运动区域由下面的 DRIFT.area 决定，现在是【左侧 0%~60%】：
         判定用的是【图片边缘】，所以图标的外沿最多到 60% 那条线，不会越过去。
       ★ 只在【这个图标可见的时候】才动：还没轮到 / 已经淡出时位置冻住不写 DOM，
         等它再亮起来接着往前飞。
       ★ 单位都是【视口百分比】，速度是“每秒走百分之几”：
         所以窗口大小变了不用换算，撞墙判定也不会因为缩放而失效。
       ========================================================================== */
    const DRIFT = {
        on: true,
        /* 运动区域（视口百分比）：图标在这一块里来回弹。
           left/right 是水平的两个边界，top/bottom 是竖直的两个边界。
           ★ 判定按【图片边缘】，所以图标外沿不会越过这几条线。 */
        area: { left: 0, right: 60, top: 0, bottom: 100 },
        speed: 11,           /* 基准速度：每秒走过视口宽/高的百分之几（想快就调大） */
        speedJitter: 0.4,    /* 速度随机浮动范围：±40%（每个图标速度不一样才好看） */
        minSpeed: 2,         /* 速度下限，防止极端情况下越弹越慢、最后停住 */
        /* 四个图标各自的初始落点（视口百分比）与初始方向（单位向量）。
           ★ 落点要挑得互不重叠（图标约 16.7% 宽 × 33.3% 高），
             而且必须落在 area 里 —— resetDrift() 会把超出的落点自动夹回来。 */
        seed: [
            { left: 16, top: 30, dir: [0.85, 0.53] },
            { left: 30, top: 60, dir: [-0.72, 0.69] },
            { left: 44, top: 45, dir: [0.60, -0.80] },
            { left: 36, top: 3,  dir: [-0.78, 0.63] }
        ]
    };

    /* 和 1.js 的 render() 用同一条缓动（easeOut cubic），所以图标和文字是一起“亮”起来的 */
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
    const rand = (a, b) => a + Math.random() * (b - a);
    const len = d => Math.sqrt(d.x * d.x + d.y * d.y);

    /* ======================= 2. 建 DOM：一个铺满屏幕的容器 + 六个“图标位” =======================
       每个图标是一个 .bug-icon-slot（定位用的盒子），里面放：
         · <img class="bug-icon">   —— 图片本身
         · <span class="bug-label">  —— hover 时才显示的名字（配了 label 才生成）
       位置 / 大小写在 3.css，这里只负责把节点挂上去、把链接塞进 src。
       为什么要有 slot 这一层：
         · 飘动引擎把 left / top 写在 slot 上（量尺寸也量 slot），
           这样“定位”和“图片”分开，label 可以直接用 CSS 相对 slot 摆位；
         · hover 用纯 CSS（.bug-icon-slot:hover .bug-label），不需要监听鼠标，
           鼠标移开就自动消失，也不会和每帧写样式的飘动打架。
       ★ 容器是 position: fixed、铺满整个视口、pointer-events: none：
         它就是一个“台球桌”，页面怎么滚都不动，所以位置＝屏幕上的位置；
         只有【图标亮着的时候】slot 才恢复 pointer-events（见 update()），
         这样暗着的图标不会挡住底下文字的鼠标 / 悬停。
       ★ 图层夹在【背景】和【文字】之间（见 3.css 的 z-index）：
         2.js 的底图 / 视频是 0~2，1.js 给文字写的是 1~33（按出场顺序递增），
         这里取 3：盖得住底图和那些视频，和靠后的文字是有前有后的。
       ★ 图标 1~4 各自独立定位、各自沿自己的方向飞（见下面飘动引擎）；
         图标 5 / 6 是 pin 的：不参与飘动，位置完全由 3.css 里那两条决定。 */
    const row = document.createElement("div");
    row.className = "bug-icons";
    row.setAttribute("aria-hidden", "true");     /* 纯装饰，读屏器跳过 */

    const nodes = ICONS.map(cfg => {
        const slot = document.createElement("div");
        slot.className = "bug-icon-slot " + cfg.cls + (cfg.pin ? " is-pinned" : "");

        const img = document.createElement("img");
        img.className = "bug-icon";
        img.src = cfg.src;
        img.alt = cfg.label || "";                     /* 名字也放 alt，读屏 / 图片挂了时也认得 */
        img.decoding = "async";
        img.draggable = false;
        img.addEventListener("error", () => {
            console.error("[home] 图标加载失败，请检查链接：", cfg.name, cfg.src);
        });
        slot.appendChild(img);

        /* hover 显示的名字：没有名字的图标（比如图标 5 / 6）就不生成这个 span */
        let label = null;
        if (cfg.label) {
            label = document.createElement("span");
            label.className = "bug-label";
            label.textContent = cfg.label;
            slot.appendChild(label);
        }

        row.appendChild(slot);

        return {
            cfg,
            el: img,
            slot,
            label,
            pinned: !!cfg.pin,      /* true = 钉在屏幕上，不飘动 */
            drift: null,
            lastX: null,
            lastY: null
        };
    });

    function mount() {
        if (!document.body) return false;
        if (!row.isConnected) document.body.appendChild(row);
        return true;
    }

    mount();
    if (!row.isConnected) document.addEventListener("DOMContentLoaded", mount, { once: true });

    /* 先把【会飘动的】那几个图标的初始落点和初始方向定好（视口百分比），
       免得第一帧之前它们全都堆在画框左上角闪一下。
       ★ pin 的图标不写内联位置：它们的位置由 3.css 的 .bug-icon-5 / -6 决定，
         写了内联样式反而会盖住 CSS，位置就改不动了。 */
    nodes.forEach(n => {
        if (n.pinned) return;
        resetDrift(n);
        n.slot.style.left = n.drift.pos.x + "%";
        n.slot.style.top = n.drift.pos.y + "%";
    });

    /* ======================= 3. 从 1.js 的时间轴里读状态 ======================= */
    const HOME = () => window.__home;

    /* 在 1.js 的 items 里找某个选择器命中的那一段。
       ★ 不缓存：1.js 的 layout() 在 resize 时会把整条时间轴重建一遍，
         缓存下来的对象会悄悄失效；一帧找 4 次便宜到可以忽略。 */
    function findItem(sel) {
        const h = HOME();
        const list = h && h.items;
        if (!list || !list.length) return null;
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (!it || !it.el || typeof it.el.matches !== "function") continue;
            try {
                if (it.el.matches(sel)) return it;
            } catch (err) {
                console.warn("[home] 图标选择器无效：", sel, err);
                return null;
            }
        }
        return null;
    }

    /* 这一帧该用哪个时钟 —— 和 1.js render() 里的写法完全一致：
       正在播的那一组冻结文字看 freezePos（滚轮驱动），其余看 cur。 */
    function clockOf(it) {
        const h = HOME();
        if (h.freezeActive && it.freezeZone && it.freezeZone === h.frozenZone) return h.freezePos;
        return h.cur;
    }

    /* ---- 把 ICONS 里的 start / end 翻译成时间轴上的绝对进度 ----
       一段文字的四个时刻（1.js 的时间轴里就这么叫）：
           A = 开始淡入     H = 淡入结束（完全看清）
           B = 开始淡出     E = 完全消失
       返回 { a, b, clock }
           a / b = 淡入窗口的两个端点（进度值，b > a）
           clock = 这段窗口该看哪个时钟（cur 或 freezePos）
       ★ 图标 3 认的 text-4 是冻结组：它的 A/H 只在冻结播放期间才被走到，
         而那时冻结组的时钟是 freezePos（1.js 的 render() 也是这么取），
         所以这里必须把时钟一起算出来，不能一律用 cur，
         否则 text-4 的 H 对应不到正确的时刻。 */
    function resolveWindow(cfg, host) {
        /* 这一段窗口认哪一段文字当时钟：默认 host 自己，也可用 start.from 指定 */
        const fromItem = (cfg.start && cfg.start.from) ? findItem(cfg.start.from) : host;
        if (!fromItem) return null;

        const clock = clockOf(fromItem);
        const mark = { A: fromItem.A, H: fromItem.H, E: fromItem.E };
        const at = (side, fallback) => {
            const spec = cfg[side];
            const key = (spec && spec.mark) || fallback;
            const v = mark[key];
            let shift = (spec && spec.shift) || 0;
            /* shift 也可以写成函数：拿到 fromItem 现算偏移量，
               这样“接在图标 6 淡入结束之后”就不用把时长抄成常数 */
            if (typeof shift === "function") shift = shift(fromItem) || 0;
            return (typeof v === "number" ? v : 0) + shift;
        };

        /* 淡入起点：图标 1 = text-3 的 A（时间不变）、图标 2 = text-3 的 E、图标 3 = text-4 的 H */
        const a = at("start", "A");

        /* 淡入终点：显式写了 end 就用它，否则默认“从起点往后淡入 host 的淡入时长”，
           于是图标 2 / 3 / 4 的淡入时长和图标 1 完全一样 —— 出场时间都不变。 */
        const span = Math.max(1e-6, (host.H - host.A) * (cfg.fadeScale || 1));
        let b = cfg.end ? at("end", "H") : a + span;
        if (b <= a + 1e-6) b = a + span;

        return { a, b, clock, fromItem };
    }

    /* ---- 淡出进度：0 = 还没淡出（图标全亮），1 = 已经全淡出 ----
       每个图标可以认【自己】的淡出宿主（ICONS 里的 fadeOut，默认 FADE_OUT_HOST =
       .text-6），所以这里给每个宿主各存一份“已经淡出完”的标记（以前的单个
       outDone 变量在两段文字各自淡出时会互相覆盖）。 */
    const outStates = new Map();          /* 选择器 → { done } */
    function outStateOf(sel) {
        let s = outStates.get(sel);
        if (!s) { s = { done: false }; outStates.set(sel, s); }
        return s;
    }

    /* ★ 不能只看 cur：
         冻结组播完的那一帧，1.js 会先解冻、并把 cur 拨回触发线（见 updateFreeze 的出口），
         那一瞬间 cur 反而小于那一段的 B，用 cur 算会得出“还没淡出”，
         于是已经淡出的图标会当场复活。
       ★ 所以对冻结组里的宿主，认 freezePos 停在哪一端（1.js 播到头时会把它正好停在两端之一）：
         正放结束 → freezePos 停在 z1（= 组内最后一个 E）→ 已淡出；
         倒放结束 → freezePos 倒回 hit → 还没淡出，于是图标跟着倒放一起亮回来。
       ★ 不在冻结组里的宿主（比如 text-2）没有这个麻烦，直接跟着 cur 走就行。 */
    function fadeOutT(outItem, st) {
        const h = HOME();
        const z = outItem.freezeZone;

        /* 兜底：这一段的宿主不在冻结组里（比如 text-2），
           就跟着它自己的淡出区间走，用当前时钟当进度。 */
        if (!z) {
            const p = clockOf(outItem);
            return clamp01((p - outItem.B) / Math.max(1e-6, outItem.E - outItem.B));
        }

        /* 正在播这一组（正放 / 倒放都走这里）：淡出进度直接由 freezePos 算，
           所以上滑倒放时图标也会对称地一起亮回来。 */
        if (h.freezeActive && h.frozenZone === z) {
            const t = clamp01((h.freezePos - outItem.B) / Math.max(1e-6, outItem.E - outItem.B));
            st.done = t >= 1;
            return t;
        }

        /* 不在这一组里：freezePos 停在这一组的尾端，或页面早就滚过去了 → 已经淡出 */
        if (h.freezePos >= outItem.E - 1e-6 || h.cur > z.z1) {
            st.done = true;
            return 1;
        }
        /* freezePos 还在这一组的起点（没轮到 / 倒放回来了）→ 交给各自的宿主文字决定 */
        if (h.freezePos <= z.hit + 1e-6 || h.cur < z.hit) {
            st.done = false;
            return 0;
        }
        /* 理论上到不了这里；真到了就保持上一帧的结论，绝不因为 cur 被拨回而复活 */
        return st.done ? 1 : 0;
    }

    /* ======================= 飘动引擎（台球 / 光反射） =======================
       每个图标的状态：
         · pos  ：左上角在屏幕上的位置（视口百分比 0~100）
         · vel  ：速度（每秒走百分之几）；两次碰撞之间方向、大小都不变（匀速直线）
         · half ：半宽 / 半高（视口百分比）—— 撞墙判定用的是【图片的边缘】，不是中心
         · vis  ：这个图标现在亮着吗（由 update() 每帧写，见 driftVisible）
       撞墙：撞左右框翻 vx（水平镜面反射）、撞上下框翻 vy（竖直镜面反射），
             撞角落两个都翻 —— 速度大小完全不变。
       撞图标：等质量弹性碰撞 —— 沿分离轴（重叠较小的那个轴）把两者的速度分量互换，
               再把重叠对半推开。这正是台球互撞的做法：总动能严格守恒，
               两个图标之间会“交换”速度，所以看起来就是互相弹开。
       ★ 位置只由 driftTick() 按真实时间推进；update() 只写可见性，不动位置。 */

    /* 现在这个图标在屏幕上占多大（半宽 / 半高，视口百分比）。
       ★ 量的是 slot（图片就贴在它里面，尺寸一致）：用 getBoundingClientRect 而不是 offsetWidth，
         因为图片高度写在 CSS 的 --icon-height 上、width 是 auto（按图片自身比例），
         offset* 在这一页拿不到可靠的值。 */
    function driftHalfSize(n) {
        const box = n.slot || n.el;
        const r = (box && typeof box.getBoundingClientRect === "function")
            ? box.getBoundingClientRect()
            : null;
        const iw = window.innerWidth || 1;
        const ih = window.innerHeight || 1;
        let w = r && r.width ? r.width : 240;
        let h = r && r.height ? r.height : 300;
        /* 极端情况保护：图不能比屏幕还大（否则永远在撞墙、抖个不停） */
        w = Math.min(w, iw * 0.9);
        h = Math.min(h, ih * 0.9);
        return { hw: (w / iw) * 50, hh: (h / ih) * 50 };
    }

    function resetDrift(n) {
        const i = nodes.indexOf(n);
        const s = (DRIFT.seed && DRIFT.seed[i]) || { left: 30, top: 50, dir: [1, 0] };
        const size = driftHalfSize(n);
        const sp = DRIFT.speed * rand(1 - DRIFT.speedJitter, 1 + DRIFT.speedJitter);
        const dir = { x: (s.dir && s.dir[0]) || 1, y: (s.dir && s.dir[1]) || 0 };
        const L = len(dir) || 1;

        /* 初始落点先夹进运动区域：以后改 DRIFT.area 也不会让图标一开始就在区域外面 */
        const A = DRIFT.area || { left: 0, right: 100, top: 0, bottom: 100 };
        const maxX = Math.max(A.left, A.right - 2 * size.hw);
        const maxY = Math.max(A.top, A.bottom - 2 * size.hh);

        n.drift = {
            pos: {
                x: Math.min(maxX, Math.max(A.left, s.left)),
                y: Math.min(maxY, Math.max(A.top, s.top))
            },
            vel: { x: dir.x / L * sp, y: dir.y / L * sp },
            half: size,
            vis: false
        };
        n.lastX = n.lastY = null;
    }

    /* 速度太小 / 退化成 0 时救一下：给个随机方向重新出发，绝不让它停在原地 */
    function fixSpeed(n) {
        const d = n.drift;
        let s = len(d.vel);
        if (isFinite(s) && s >= DRIFT.minSpeed) return;
        const a = Math.random() * Math.PI * 2;
        const sp = Math.max(DRIFT.minSpeed, DRIFT.speed);
        d.vel.x = Math.cos(a) * sp;
        d.vel.y = Math.sin(a) * sp;
    }

    /* 撞运动区域的四条边（用的是图片边缘，所以留出 half 的余量）——纯粹的镜面反射：
       撞左右框翻 vx、撞上下框翻 vy、撞角落两个都翻；速度大小不变。
       ★ 边界来自 DRIFT.area（默认 left 0%~60%、top 0%~100%），
         和图片边缘比较，所以图标的【外沿】最多到 right 那条线。 */
    function bounceWalls(n) {
        const d = n.drift;
        const { hw, hh } = d.half;
        if (!d.vis) return;

        const A = DRIFT.area || { left: 0, right: 100, top: 0, bottom: 100 };
        const minX = A.left;
        const maxX = Math.max(minX, A.right - 2 * hw);      /* 保证 minX ≤ maxX（区域比图还窄时退化） */
        const minY = A.top;
        const maxY = Math.max(minY, A.bottom - 2 * hh);

        if (d.pos.x < minX) { d.pos.x = minX; d.vel.x = Math.abs(d.vel.x); }
        else if (d.pos.x > maxX) { d.pos.x = maxX; d.vel.x = -Math.abs(d.vel.x); }

        if (d.pos.y < minY) { d.pos.y = minY; d.vel.y = Math.abs(d.vel.y); }
        else if (d.pos.y > maxY) { d.pos.y = maxY; d.vel.y = -Math.abs(d.vel.y); }
    }

    /* 两个图标互撞：等质量弹性碰撞 —— 沿碰撞法线把速度分量互换（= 光沿镜面反射），
       再把重叠对半推开。速度大小在互换前后完全一样，所以不会越弹越快。
       ★ 分离轴取“重叠量较小的那个轴”，并且【按这个轴】判断是不是已经在分开了：
         用中心连线判断是错的 —— 会出现“沿 x 需要分离、但两者 x 速度同向”的死角，
         那样会把推开也一起跳过，两个图标就一直叠着走。
       ★ 每对每帧【只解一次】（见 driftStep）：重复解会反复互换速度，越解越热。 */
    function bouncePair(a, b) {
        const da = a.drift, db = b.drift;

        const ax = da.pos.x + da.half.hw, ay = da.pos.y + da.half.hh;   /* 中心 */
        const bx = db.pos.x + db.half.hw, by = db.pos.y + db.half.hh;

        const sx = (da.half.hw + db.half.hw) - Math.abs(bx - ax);       /* x 方向的重叠量 */
        const sy = (da.half.hh + db.half.hh) - Math.abs(by - ay);       /* y 方向的重叠量 */
        if (sx <= 0 || sy <= 0) return;                                 /* 没碰上 */

        /* 分离轴 = 重叠量较小的那个轴（两个都是矩形，取最小平移方向） */
        if (sx <= sy) {
            const dir = bx >= ax ? 1 : -1;
            /* 沿这个轴已经在互相远离 → 只推开、不再换速度（否则会贴着抖） */
            if ((db.vel.x - da.vel.x) * dir < 0) {
                const tmp = da.vel.x; da.vel.x = db.vel.x; db.vel.x = tmp;
            }
            const gap = sx;                                             /* 正好推到不重叠 */
            da.pos.x -= dir * gap / 2;
            db.pos.x += dir * gap / 2;
        } else {
            const dir = by >= ay ? 1 : -1;
            if ((db.vel.y - da.vel.y) * dir < 0) {
                const tmp = da.vel.y; da.vel.y = db.vel.y; db.vel.y = tmp;
            }
            const gap = sy;
            da.pos.y -= dir * gap / 2;
            db.pos.y += dir * gap / 2;
        }
    }

    /* 只记“这个图标现在亮着吗”（由 update() 每帧调用）：
       每次重新亮起来的时候，把尺寸重量一遍（窗口大小 / 图片加载完成都可能让它变） */
    function driftVisible(n, visible) {
        if (!n.drift) resetDrift(n);
        const v = !!visible;
        if (v && !n.drift.vis) n.drift.half = driftHalfSize(n);
        n.drift.vis = v;
    }

    /* 亮着的时候才让 slot 接收鼠标事件 ——
       hover 显示名字靠纯 CSS（.bug-icon-slot:hover .bug-label），
       但暗着的图标必须 pointer-events: none，否则它会挡住底下文字的悬停 / 点击。
       ★ 这里只是切换一个类，不打断 wheel：滚轮监听挂在 window 上，
         事件照旧会冒泡上去，页面滚动不受影响。 */
    function hoverable(n, on) {
        const v = !!on;
        if (v === n.hoverOn) return;
        n.hoverOn = v;
        n.slot.classList.toggle("is-live", v);
    }

    /* ---- 图标 7 的淡入：左半边先出现、右半边后出现 ----
       q = 这个图标自己的淡入进度（0 = 刚轮到，1 = 完全看清），由 update() 每帧算好传进来。
       做法是一条【柔性遮罩】从左往右扫开：
         · r（easeOut(q)）从 0 走到 1 ＝ 遮罩“实心区”的右边缘从最左边一路扫到最右边；
         · 实心区后面再留 feather 宽的一段渐变过渡，扫过去的地方不会是一条硬边。
       所以同一时刻总是【左边先亮、右半边还压着】，看上去就是从左边“长”出来。
       ★ 整体淡入（opacity）仍然由 slot 负责、曲线和图标 5 / 6 完全一样；
          q 走满 1 之后遮罩直接摘掉（mask: none），后面的渲染不再受影响。 */
    function paintReveal(n, q) {
        const el = n.el;
        if (!el) return;
        if (q >= 1) {
            if (n.maskState !== "none") {
                n.maskState = "none";
                el.style.webkitMaskImage = "none";
                el.style.maskImage = "none";
            }
            return;
        }
        const feather = (n.cfg.reveal && n.cfg.reveal.feather) || 0.42;
        const r = easeOut(clamp01(q));
        const cut = Math.min(100, (r + feather) * 100);
        const m = "linear-gradient(90deg, #000 0%, #000 " + (r * 100).toFixed(2) +
            "%, transparent " + cut.toFixed(2) + "%, transparent 100%)";
        if (m !== n.maskState) {
            n.maskState = m;
            el.style.webkitMaskImage = m;      /* 老 Chrome / Safari 认前缀版 */
            el.style.maskImage = m;
        }
    }

    /* ---- 图标 7 的默认位置：图标 5 与图标 6 的正中间 ----
       5 / 6 是钉住的、left / bottom 写在 3.css 里，宽度还随图片比例变，
       所以用它们【真实渲染出来的盒子】量中点，比在 CSS 里猜百分比可靠。
       ★ 图还没加载完（盒子是 0）时直接跳过，等下一帧再量。
       ★ 想手动钉死箭头：删掉 ICONS 里那一行的 between，然后改 3.css 的 .bug-icon-7。 */
    function placeBetween(n) {
        const pair = n.cfg.between;
        if (!pair) return;
        const a = nodes.find(x => x.cfg.cls === pair[0]);
        const b = nodes.find(x => x.cfg.cls === pair[1]);
        if (!a || !b) return;
        const ra = a.slot.getBoundingClientRect();
        const rb = b.slot.getBoundingClientRect();
        if (!ra.width || !ra.height || !rb.width || !rb.height) return;
        const cx = (ra.left + ra.width / 2 + rb.left + rb.width / 2) / 2;
        const cy = (ra.top + ra.height / 2 + rb.top + rb.height / 2) / 2;
        if (Math.abs(cx - n.lastCx) < 0.5 && Math.abs(cy - n.lastCy) < 0.5) return;
        n.lastCx = cx;
        n.lastCy = cy;
        n.slot.style.left = cx.toFixed(1) + "px";     /* 盒子中点对准两只图标的中点 */
        n.slot.style.top = cy.toFixed(1) + "px";
        n.slot.style.bottom = "auto";
    }

    /* 写 DOM（只有真的变了才写，省得每帧都动样式）。
       ★ 位置写在 slot 上；顺带判断名字该放在图标【下面】还是【上面】：
         图标贴着屏幕底部时放下面会被切掉，那就翻到上面去（纯 CSS 类切换）。 */
    function driftPaint(n) {
        const p = n.drift.pos;
        const lx = p.x.toFixed(3);
        const ty = p.y.toFixed(3);
        if (lx !== n.lastX || ty !== n.lastY) {
            n.lastX = lx;
            n.lastY = ty;
            n.slot.style.left = lx + "%";
            n.slot.style.top = ty + "%";
        }

        /* 图标底边已经接近屏幕底部 → 名字翻到上方 */
        const bottom = p.y + 2 * n.drift.half.hh;
        const above = bottom > 86;
        if (above !== n.labelAbove) {
            n.labelAbove = above;
            n.slot.classList.toggle("is-above", above);
        }
    }

    /* 这一帧在飘的图标（只有亮着的才参与运动和碰撞） */
    function driftMovers() {
        return nodes.filter(n => n.drift && n.drift.vis);
    }

    /* 一次物理推进（整场一起走，不是逐个图标各走一遍）：
       1) 拆成小步积分：每小步推进位置并做撞墙反射（拆步是为了不让图标一帧跨过对面）；
       2) 所有小步走完后，解图标之间的碰撞（换速度 + 推开重叠）；
       3) 再松弛几轮（撞墙 → 解碰撞）把多个图标挤在一起的残余重叠压干净；
       4) 最后统一夹一次墙 —— 因为互撞的推开有可能把某个图标顶出活动区域。
       ★ 碰撞的解是“互换速度分量”，总动能严格守恒，所以重复松弛不会让系统越弄越热。 */
    function driftStep(dt) {
        const movers = driftMovers();
        if (!movers.length) return;

        /* 最大位移按“每小步不超过 5% 视口”拆 */
        let maxV = 0;
        movers.forEach(n => { maxV = Math.max(maxV, Math.abs(n.drift.vel.x), Math.abs(n.drift.vel.y)); });
        const STEPS = Math.max(1, Math.ceil(maxV * dt / 5));
        const sdt = dt / STEPS;

        for (let s = 0; s < STEPS; s++) {
            movers.forEach(n => {
                n.drift.pos.x += n.drift.vel.x * sdt;
                n.drift.pos.y += n.drift.vel.y * sdt;
                bounceWalls(n);
            });
        }

        /* 解一遍所有图标对 */
        const solvePairs = () => {
            for (let i = 0; i < movers.length; i++) {
                for (let j = i + 1; j < movers.length; j++) bouncePair(movers[i], movers[j]);
            }
        };

        solvePairs();                     /* 先按碰撞换速度（真正的“反弹”在这里发生） */

        /* 松弛两轮：挤在角落 / 三个撞成一团时，一轮推开往往还留着一点重叠 */
        for (let it = 0; it < 2; it++) {
            movers.forEach(n => bounceWalls(n));
            solvePairs();
        }

        /* 最后统一夹回活动区域内，并画到 DOM */
        movers.forEach(n => { bounceWalls(n); fixSpeed(n); driftPaint(n); });
    }

    /* 有没有图标正在飘（没有就不用自己排帧了） */
    function driftActive() {
        return !!DRIFT.on && nodes.some(n => n.drift && n.drift.vis);
    }

    /* 飘动要一直动，而 1.js 的 render() 只在滚动 / 缓动的时候才排帧，
       页面停住时它就不画了 —— 所以这里自己挂一个 rAF 循环，
       只在“至少有一个图标亮着”的时候跑，全暗下来就自动停。
       ★ 这里只负责“按真实时间推进 + 重排帧”：可见性由 update() 每帧写进 d.vis。 */
    let driftRaf = null;
    let driftLast = 0;

    /* 一帧的理论时长。真实 dt 取“上一帧到这一帧”的间隔，但最多按三帧算：
       如果 rAF 被卡了一下（或标签页切走再回来），图标不会一次飞出去老远。 */
    const DRIFT_FRAME = 1 / 60;

    function driftTick(now) {
        const real = (driftLast > 0 && now > driftLast) ? (now - driftLast) / 1000 : DRIFT_FRAME;
        const dt = Math.min(3 * DRIFT_FRAME, real);
        driftLast = now;

        /* ★ 整场只推进一步：driftStep 内部会一起处理所有亮着的图标（含它们之间的碰撞），
           不能每个图标各调一次 —— 那样同一帧会被推进多次，碰撞也会重复解。 */
        driftStep(dt);

        if (driftActive()) {
            driftRaf = requestAnimationFrame(driftTick);
        } else {
            driftRaf = null;
            driftLast = 0;      /* 停了就把计时清掉，下次接上时不会算出一个巨大的 dt */
        }
    }

    function driftEnsure() {
        if (driftRaf !== null || !driftActive()) return;
        driftLast = 0;
        driftRaf = requestAnimationFrame(driftTick);
    }

    /* ======================= 4. 每帧算四个图标的透明度 ======================= */
    function update() {
        const h = HOME();
        /* 1.js 还没定稿时间轴（底图没加载完 / items 还没建）：什么都不做 */
        if (!h || !h.items || h.items.length === 0) return;

        mount();

        const outItem = findItem(FADE_OUT_HOST);
        if (!outItem) {
            row.style.visibility = "hidden";
            return;
        }

        let anyVisible = false;

        /* ---- 特例：页面停在冻结组【中间】，而这一组一次都没播过 ----
           刷新时浏览器会把滚动位置恢复成上一次的位置，如果那一下正好落在这三段的跨度里，
           1.js 会把 text-4/5/6 全部藏起来（冻结组只能靠滚轮跨线触发），
           文字一个都不显示，按宿主时钟算却会剩下 icon1 孤零零挂在屏幕上。
           键盘 End / Home 一步冲过这一组也是同一个状态（freezePos 仍是初值 0）。
           → 这一行整行收起来，等滚轮真正跨过触发线、正常开演时再出来。 */
        const z = outItem.freezeZone;
        const stranded = !!z && !h.freezeActive && h.freezePos === 0 && h.cur > z.hit && h.cur < z.z1;

        nodes.forEach((n, i) => {
            const host = findItem(n.cfg.host);
            if (!host) {
                n.slot.style.opacity = "0";
                hoverable(n, false);
                driftVisible(n, false);
                return;
            }

            const win = resolveWindow(n.cfg, host);
            if (!win) {
                n.slot.style.opacity = "0";
                hoverable(n, false);
                driftVisible(n, false);
                return;
            }

            /* 这个图标跟哪一段文字一起淡出：默认 .text-6，可用 ICONS 里的 fadeOut 覆盖 */
            const fadeSel = n.cfg.fadeOut || FADE_OUT_HOST;
            const fadeItem = (fadeSel === FADE_OUT_HOST) ? outItem : (findItem(fadeSel) || outItem);
            const outT = fadeOutT(fadeItem, outStateOf(fadeSel));   /* 0 = 还没淡出，1 = 全淡出 */

            const p = win.clock;
            let op = 0;

            if (p <= win.a) {
                /* 还没轮到（往回滚也一样：退到窗口之前就归零，不会“卡在亮着”） */
                op = 0;
            } else if (p < win.b) {
                /* 自己的淡入窗口：曲线和文字同一套 easeOut，所以亮起来的手感和文字一致 */
                op = easeOut((p - win.a) / (win.b - win.a));
            } else {
                /* 淡入已经走完，之后一直亮着。
                   ★ 唯一的例外：这一段的淡入算在冻结组的账上（图标 3 认的 text-4），
                     冻结组演到头就停了 —— 要是淡入尾巴被切在 z1 外面，
                     干脆把整条淡入曲线按 z1 收尾，收不干净的部分交给下面 (1 - outT) 收，
                     免得图标在冻结演完时“啪”地闪一下才消失。 */
                const wZ = win.fromItem && win.fromItem.freezeZone;
                const wEnd = wZ ? (wZ.z1 - wZ.hit) : Infinity;
                const bEnd = Math.min(win.b, wEnd);
                op = (bEnd > p)
                    ? easeOut(clamp01((p - win.a) / (bEnd - win.a)))
                    : 1;
            }

            /* 只要 text-6 开始淡出，三个一起暗下去（到 text-6 完全消失时它们也正好全没了） */
            op *= 1 - outT;

            /* 页面停在冻结组中间、而这一组一次都没播过：整行不显示（见上面 stranded 说明） */
            if (stranded) op = 0;

            /* ★ 冻结组里的图标（图标 3 / 8）：那一段文字还没轮到演、或页面停在组里
               还没开始播时，1.js 会把冻结文字整个藏起来（item.skipFrozen），
               图标不能自己单独亮着 —— 判断和 1.js 的 render() 保持一致：
                 · 正在播这一组 → 照常按 freezePos 算；
                 · 这一组已经播完（freezePos 停在 z1）→ 放行，交给下面 outT 收尾；
                 · 其它情况（还没轮到 / 刷新后被浏览器直接恢复到组后面）→ 先藏起来。
               ★ 这条只对“起点认的是一段冻结文字”的图标生效，图标 1 / 2 / 4 不受影响。 */
            if (win.fromItem && win.fromItem.skipFrozen) {
                const fz = win.fromItem.freezeZone;
                const playing = !!(h.freezeActive && fz && h.frozenZone === fz);
                const played = !!fz && h.freezePos >= fz.z1 - 1e-6;
                if (!playing && !played) op = 0;
            }

            /* ★ 图标 7：淡入时【左半边先出现、右半边后出现】 */
            if (n.cfg.reveal) {
                paintReveal(n, p <= win.a ? 0 : clamp01((p - win.a) / Math.max(1e-6, win.b - win.a)));
            }

            /* ★ 图标 7：位置对准图标 5 / 6 的中点（见 ICONS 里的 between） */
            if (n.cfg.between) placeBetween(n);

            /* ---- 飘动 ----
               “出现在页面里”的那段时间 = 从淡入开始到随 text-6 淡出为止。
               ★ 这里只记“亮没亮”（op > 0.02），【不】在这里挪位置：
                 位置的推进只交给 driftTick()，它按真实时间走，
                 这样 1.js 多调几次 render() 也不会让图标多飞几步。 */
            const live = op > 0.02;

            /* ★ pin 的图标（5 / 6）不参与飘动 / 碰撞：它们的左右位置写在 3.css 里，
               这里只负责透明度，所以完全不碰 n.drift、也不写内联 left / top。 */
            if (!n.pinned) driftVisible(n, live);

            /* 只有亮着的图标才接受鼠标 hover（暗着的图标不能挡住底下文字） */
            hoverable(n, live);

            if (op > 0.001) {
                n.slot.style.opacity = op.toFixed(4);
                anyVisible = true;
            } else {
                n.slot.style.opacity = "0";
            }
        });

        /* 至少有一个图标亮着 → 保证飘动循环在跑（全暗了它自己会停） */
        if (anyVisible) driftEnsure();

        /* 全部全透明就把整个画框收起来，省一点合成开销（位置由上面的 left / top 决定） */
        row.style.visibility = anyVisible ? "visible" : "hidden";
    }

    /* ======================= 5. 挂到 1.js 的渲染循环上 =======================
       1.js 在 tick / scroll / resize / 初始化里都会调用它自己的 render()，
       把它包一层即可：文字画完立刻画图标，同一帧，不会有一帧的错位，
       也不需要 3.js 自己跑一个 rAF。
       ========================================================================== */
    let hooked = false;
    let fallbackId = null;

    function hook() {
        if (typeof window.render !== "function") return false;    /* 1.js 还没执行到 */
        if (window.render.__bugIcons) return true;                /* 已经包过了 */
        const original = window.render;
        const wrapped = function () {
            const r = original.apply(this, arguments);
            try {
                update();
            } catch (err) {
                console.warn("[home] 图标更新出错：", err);
            }
            return r;
        };
        wrapped.__bugIcons = true;
        window.render = wrapped;
        return true;
    }

    /* 兜底：窗口里一直没有 window.render（比如 3.js 被放在 1.js 前面执行），
       就先用自己的帧循环顶着，等两段脚本都跑完（DOMContentLoaded）再接上。 */
    function fallbackTick() {
        if (hooked) { fallbackId = null; return; }
        try {
            update();
        } catch (err) {
            /* 1.js 还没就绪时的报错直接忽略 */
        }
        fallbackId = requestAnimationFrame(fallbackTick);
    }

    function attach() {
        if (hooked) return;
        hooked = hook();
        if (hooked) {
            update();                 /* 接上之后立刻按当前进度画一帧 */
        } else if (fallbackId === null) {
            fallbackId = requestAnimationFrame(fallbackTick);
        }
    }

    attach();                                                  /* 1.js 在同一份文档里先执行：这里就接上了 */
    document.addEventListener("DOMContentLoaded", attach, { once: true });
    window.addEventListener("load", attach, { once: true });

    /* 调试用：控制台里 __bugIcons.update() 可以强制刷一次；
       __bugIcons.nodes 能看到八个图标（含各自的飘动状态 n.drift）；
       __bugIcons.outDone 看“是否已随默认淡出宿主（.text-6）淡出”；
       __bugIcons.DRIFT 是飘动范围 / 速度，改完下一帧就生效（比如 DRIFT.on = false 关掉飘动）。 */
    window.__bugIcons = {
        update,
        nodes,
        row,
        DRIFT,
        get outDone() { return outStateOf(FADE_OUT_HOST).done; }
    };
})();
