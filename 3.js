/* ==========================================================================
   3.js —— .text-3 / .text-4 / .text-5 下方那三个宿主图标
   --------------------------------------------------------------------------
   要做的事（出场顺序，一个比一个晚）：
     · 图标 1（b-subtilis）：text-3 一淡入就跟着淡入 —— 出场时间不变；
     · 图标 2（e-coli）    ：text-3【淡出结束】之后才开始淡入；
     · 图标 3（p-putida）  ：text-4【淡入结束】之后才开始淡入；
     · 三个图标各自的淡入时长都是同一条曲线、同一个长度；
     · 这三个图标【不在各自宿主淡出时消失】，而是等 text-6 开始淡出时一起淡出
       （text-6 完全消失时，它们也正好全没了）。
   分工（按需求）：
     · 3.js  ＝ 图片链接（src）+ 淡入 / 淡出动效；
     · 3.css ＝ 位置 / 大小 / 间距（图标钉在屏幕上、永远待在文字下方）。
   ★ 想再调出场次序，只改下面 ICONS 里的 start / end 两个字段（见那里的注释）。

   怎么和 1.js 对上（不要去改 1.js）：
     1.js 每画一帧都会调用它自己的全局 render()，3.js 把 window.render 包一层：
     文字画完立刻跟着画图标，用的还是同一帧的 cur / freezePos，
     所以图标和文字严丝合缝，也不用自己开定时器。
     1.js 把整条时间轴挂在 window.__home 上（items / cur / freezePos / freezeActive /
     frozenZone …），下面所有状态都从那里读，3.js 不复制 1.js 的任何算法。
   ========================================================================== */
(function () {
    "use strict";

    /* ======================= 1. 三个图标（图片链接 / 出场点在这里改） =======================
       cls  ：3.css 里对应的样式钩子（要单独调某个图标的大小就改那里）
       host ：图标“属于”哪一段文字 —— 找不到它时这个图标就整个不显示；
              它同时也是淡出包络的判断依据
       src  ：图片链接
       name ：仅用于控制台报错信息
       start：这个图标【什么时候开始淡入】—— 写“认哪一段文字的哪个时刻”：
                from : 用哪一段文字当时钟（用它的淡入区间 [A, H] 算曲线）
                mark : "A" = 这段文字刚开始淡入（出场时间不变的那个选项）
                       "H" = 这段文字淡入结束（完全看清了）
                       "E" = 这段文字完全消失（淡出结束）
                shift: 在 mark 之后再往后推多少（一般 0）
              —— 图标 1 写 ".text-3" + "A" 就等于原来的行为：text-3 一淡入它就淡入；
                 图标 2 写 ".text-3" + "E"：等 text-3 完全淡出之后它才出现；
                 图标 3 写 ".text-4" + "H"：等 text-4 完全淡入之后它才出现。
              ★ 图标 3 认的 text-4 属于冻结组（1.js 的 FREEZE_GROUPS），
                它的进度由滚轮驱动的 freezePos 给出，下面 resolveWindow() 会自动认对时钟，
                所以“text-4 淡入结束”这一刻是准的，不需要改 1.js。
       end  ：淡入什么时候结束（可选）。
              写了：从 start 到 end 之间淡入，于是“三者出现时间不变”＝淡入时长都一样；
              不写：从 start 往后淡入 host.H - host.A 那么长（和图标 1 的时长一致）。
       ========================================================================== */
    const ICONS = [
        {
            cls: "bug-icon-1",
            host: ".text-3",
            src: "https://static.igem.wiki/teams/6059/wiki/home/b-subtilis.avif",
            name: "Bacillus subtilis",
            /* 出场时间不变：text-3 一淡入就跟着淡入，时长 = text-3 的淡入区间 */
            start: { from: ".text-3", mark: "A" }
        },
        {
            cls: "bug-icon-2",
            host: ".text-4",
            src: "https://static.igem.wiki/teams/6059/wiki/home/e-coli.avif",
            name: "Escherichia coli",
            /* text-3【完全淡出】之后才开始淡入；时长仍然和图标 1 一样（见下面 resolveWindow） */
            start: { from: ".text-3", mark: "E" }
        },
        {
            cls: "bug-icon-3",
            host: ".text-5",
            src: "https://static.igem.wiki/teams/6059/wiki/home/p-putida.avif",
            name: "Pseudomonas putida",
            /* text-4【完全淡入】之后才开始淡入；时长仍然和图标 1 一样 */
            start: { from: ".text-4", mark: "H" }
        }
    ];

    /* 三个图标统一在它的淡出区间里一起消失（“最后 text-6 淡出的时候这三个一起淡出”） */
    const FADE_OUT_HOST = ".text-6";

    /* 和 1.js 的 render() 用同一条缓动（easeOut cubic），所以图标和文字是一起“亮”起来的 */
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

    /* ======================= 2. 建 DOM：一行容器 + 三个 <img> =======================
       位置 / 大小 / 间距全部写在 3.css（.bug-icons / .bug-icon），
       这里只负责把节点挂上去、把链接塞进 src。
       ★ 容器是 position: fixed（见 3.css）：页面怎么滚它都不动，
         所以图标“保持在屏幕位置不变”，而 1.js 又把文字钉在 40% 锚线上，
         于是图标永远稳稳待在文字下方。
       ========================================================================== */
    const row = document.createElement("div");
    row.className = "bug-icons";
    row.setAttribute("aria-hidden", "true");     /* 纯装饰，读屏器跳过 */

    const nodes = ICONS.map(cfg => {
        const img = document.createElement("img");
        img.className = "bug-icon " + cfg.cls;
        img.src = cfg.src;
        img.alt = "";
        img.decoding = "async";
        img.draggable = false;
        img.style.opacity = "0";                 /* 第一帧之前先不可见，避免闪一下 */
        img.addEventListener("error", () => {
            console.error("[home] 图标加载失败，请检查链接：", cfg.name, cfg.src);
        });
        row.appendChild(img);
        return { cfg, el: img };
    });

    function mount() {
        if (!document.body) return false;
        if (!row.isConnected) document.body.appendChild(row);
        return true;
    }

    mount();
    if (!row.isConnected) document.addEventListener("DOMContentLoaded", mount, { once: true });

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
            return (typeof v === "number" ? v : 0) + ((spec && spec.shift) || 0);
        };

        /* 淡入起点：图标 1 = text-3 的 A（时间不变）、图标 2 = text-3 的 E、图标 3 = text-4 的 H */
        const a = at("start", "A");

        /* 淡入终点：显式写了 end 就用它，否则默认“从起点往后淡入 host 的淡入时长”，
           于是图标 2 / 3 的淡入时长和图标 1 完全一样 —— 三者出现时间不变。 */
        const span = Math.max(1e-6, host.H - host.A);
        let b = cfg.end ? at("end", "H") : a + span;
        if (b <= a + 1e-6) b = a + span;

        return { a, b, clock, fromItem };
    }

    /* ---- text-6 的淡出走到哪了：0 = 还没淡出（三个图标全亮），1 = 已经全淡出 ----
       ★ 不能只看 cur：
         冻结组播完的那一帧，1.js 会先解冻、并把 cur 拨回触发线（见 updateFreeze 的出口），
         那一瞬间 cur 反而小于 text-6 的 B，用 cur 算会得出“还没淡出”，
         于是已经淡出的图标会当场复活。
       ★ 所以认 freezePos 停在哪一端（1.js 播到头时会把它正好停在两端之一）：
         正放结束 → freezePos 停在 z1（= 组内最后一个 E ≈ text-6 的 E）→ 已淡出；
         倒放结束 → freezePos 倒回 hit（≈ text-4 的 A，远小于 text-6 的 E）→ 还没淡出，
         于是三个图标跟着倒放一起亮回来。
       ★ freezePos 只在“某一组播到那一端”时才会落在那个值上，
         所以它天然能区分“这一组还没轮到”和“这一组刚刚播完”。 */
    let outDone = false;

    function fadeOutT(outItem) {
        const h = HOME();
        const z = outItem.freezeZone;

        /* 兜底：万一这一页没用冻结组（比如改掉了 1.js 的 FREEZE_GROUPS），
           就退回“跟着 text-6 自己的淡出区间走”，用当前时钟当进度。 */
        if (!z) {
            const p = clockOf(outItem);
            return clamp01((p - outItem.B) / Math.max(1e-6, outItem.E - outItem.B));
        }

        /* 正在播这一组（正放 / 倒放都走这里）：淡出进度直接由 freezePos 算，
           所以上滑倒放时三个图标也会对称地一起亮回来。 */
        if (h.freezeActive && h.frozenZone === z) {
            const t = clamp01((h.freezePos - outItem.B) / Math.max(1e-6, outItem.E - outItem.B));
            outDone = t >= 1;
            return t;
        }

        /* 不在这一组里：freezePos 停在这一组的尾端，或页面早就滚过去了 → 已经淡出 */
        if (h.freezePos >= outItem.E - 1e-6 || h.cur > z.z1) {
            outDone = true;
            return 1;
        }
        /* freezePos 还在这一组的起点（没轮到 / 倒放回来了）→ 交给各自的宿主文字决定 */
        if (h.freezePos <= z.hit + 1e-6 || h.cur < z.hit) {
            outDone = false;
            return 0;
        }
        /* 理论上到不了这里；真到了就保持上一帧的结论，绝不因为 cur 被拨回而复活 */
        return outDone ? 1 : 0;
    }

    /* ======================= 4. 每帧算三个图标的透明度 ======================= */
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

        const outT = fadeOutT(outItem);      /* 0 = 还没淡出，1 = 已经全淡出 */
        let anyVisible = false;

        /* ---- 特例：页面停在冻结组【中间】，而这一组一次都没播过 ----
           刷新时浏览器会把滚动位置恢复成上一次的位置，如果那一下正好落在这三段的跨度里，
           1.js 会把 text-4/5/6 全部藏起来（冻结组只能靠滚轮跨线触发），
           文字一个都不显示，按宿主时钟算却会剩下 icon1 孤零零挂在屏幕上。
           键盘 End / Home 一步冲过这一组也是同一个状态（freezePos 仍是初值 0）。
           → 这一行整行收起来，等滚轮真正跨过触发线、正常开演时再出来。 */
        const z = outItem.freezeZone;
        const stranded = !!z && !h.freezeActive && h.freezePos === 0 && h.cur > z.hit && h.cur < z.z1;

        nodes.forEach(n => {
            const host = findItem(n.cfg.host);
            if (!host) {
                n.el.style.opacity = "0";
                return;
            }

            const win = resolveWindow(n.cfg, host);
            if (!win) {
                n.el.style.opacity = "0";
                return;
            }

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

            if (op > 0.001) {
                n.el.style.opacity = op.toFixed(4);
                anyVisible = true;
            } else {
                n.el.style.opacity = "0";
            }
        });

        /* 三个都全透明就把整行收起来，省一点合成开销（位置仍然由 3.css 管） */
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
       __bugIcons.nodes 能看到三个 <img>；__bugIcons.outDone 看“是否已随 text-6 淡出”。 */
    window.__bugIcons = {
        update,
        nodes,
        row,
        get outDone() { return outDone; }
    };
})();
