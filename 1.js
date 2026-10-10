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

/* ---- 文字钉在屏幕的哪个高度 ----
   0.5 = 正中间（原来）；0.4 = 从上往下 40% 处（距底部 60%）。
   所有文字（冻结播放的 text-4/5/6 和跟随滑动的其它文字）都用这一个值，
   改它就能整体上下移动，动效本身不受影响。 */
const ANCHOR_RATIO = 0.4;
const anchorY = () => (window.innerHeight || document.documentElement.clientHeight) * ANCHOR_RATIO;

/* 冻结文字期间：滚轮 delta → 文字进度 的倍率。
   1 表示和页面滚动同速（整段 3 句要滑约 900px 才放完，比较慢）；
   调大 = 滚同样距离文字走得更快、这段更利索。
   页面在这期间是不动的，所以这个值只影响“读起来要走多少滚轮”。 */
const FREEZE_WHEEL_RATE = 2.2;

/* 顶部“引导段”的高度（= 顶部视频高度，2.css 的 --lead-in，由 sizeTopVideo 写进 :root）。 */

/* 元素要“上移多少”才能把它的竖直中心放到锚线上。
   pageTop 传当前这一帧页面停的位置、h 传元素高度、top 传它的静态 top。
   冻结播放和普通滚动都走这一个式子，所以两边落点完全一致。 */
const pinDy = (pageTop, h, top) => anchorY() - h / 2 + pageTop - top;

/* ---- 默认动效时长（秒）---- */
const FADE_IN_SECONDS = 0.6;   /* 原地淡入时长 */
const HOLD_SECONDS = 1.5;      /* 钉在竖直视觉中心的停留时长 ← 需求里的 3s */
const FADE_OUT_SECONDS = 0.6;  /* 原地淡出时长 */
const GAP_SECONDS = 0.4;       /* 相邻组件之间的额外留白（秒）；0 = 上一个消失完下一个立刻淡入 */

/* ---- 单个组件单独拎出来可改：从上往下匹配，命中的规则覆盖默认值 ----
   例：
   const COMPONENT_TIMING = [
       { sel: ".text-12", hold: 4.0, fadeIn: 0.8, fadeOut: 0.8 },
       { sel: ".text-1",  hold: 2.0 },
       { sel: ".img-13",  fadeIn: 1.2 }
   ];                                                                */
/* text-4/5/6 不在这里单独设时长：它们走默认的 淡入/停留/淡出，
   和页面上其它文案完全一致（改时长直接改上面的三个默认值即可）。 */
const COMPONENT_TIMING = [];

/* ---- 冻结组：每一组都是“页面停住、滚轮只放这几段文字” ----
   一组 = 一个数组，里面的选择器会被一起摘出普通时间轴，改成在冻结播放里演。
   向下滑到该组第一段的触发线 → 正放（按数组顺序）；
   向上滑回到那条线 → 倒放（反着放一遍）。
   可以写多组，各自在自己的位置触发、互不影响。 */
const FREEZE_GROUPS = [
    [".text-4", ".text-5", ".text-6"],
    [".text-8", ".text-9"],
    [".text-13", ".text-14"],
    [".text-15", ".text-16"],
    [".text-17", ".text-18"],
    [".text-27", ".text-28", ".text-29"],
    [".text-32", ".text-33"]
];
const FREEZE_MIN_SECONDS = 0.6;

/* 冻结组“到达判定”的容差（像素）：
   页面滚到该组 CSS top 对应的位置 ±这个值以内才允许开演。
   太小可能被滚轮一步跨过去（永远不触发），太大就等于没限制。
   一帧正常滚动走 5~15px，取 24 足够稳。 */
const ARRIVE_TOL = 24;

/* “慢滚区”：在这几段文字之间把滚轮速度降下来，让动画看得清。
   格式：[ 起始选择器, 结束选择器, 区间内的速度倍率, 过渡长度(px) ]
   例：[[".text-1", ".text-4", 0.5, 400]] 让这段以一半速度滚过。
   ★ 这个数组必须存在（哪怕是空的）：zoneSpeedFactor() 会读它，
     以前它被误删过，导致滚轮回调里抛 ReferenceError、整个页面滚不动。
     空数组 = 不减速，行为与没有这个功能时完全一致。 */
const SLOW_ZONES = [];

/* ============================ 2. 底图 ============================ */
const bgImg = new Image();
bgImg.src = "./map.png";

function updateBodyHeight() {
    const displayWidth = document.documentElement.clientWidth;
    const displayHeight = displayWidth * bgImg.naturalHeight / bgImg.naturalWidth;
    document.body.style.height = `${displayHeight}px`;
}

/* ============================ 3. 参与动画的元素 ============================ */

/* 参与动画的元素：文字（以及将来可能加的图片，都带 .text-box / .img-box）。
   ★ 这个数组必须在这里建好：后面 layout()、初始化那段都要用它。
   ★ 组内绑定（原来那份 GROUP_PAIRS / followerMap / followerEls）已按需求删除：
     现在每个元素各自占时间轴，不再有“图片跟随文字”的关系。 */
const texts = Array.from(document.querySelectorAll(".text-box, .img-box"));

/* 色块组（已注释）：原来是 4 个色块绑在 .text-15 上，和宿主一起淡入 / 一起淡出 */
/* const RECT_HOST = ".text-15"; */

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

/* ---- 冻结“一根线”：触发点 + 动效跨度 ----
   tr : 触发线（进度值）。取冻结区里最早开始淡入的那个文字的 A，
        也就是页面滚到“它开始淡入”的那一屏 —— 这就是那根线。
   z1 : 动效跨度终点（最后一个文字完全消失）。触发之后滚轮推进 [tr, z1]，
        这期间页面锁在那根线上不动；推过 z1 就解冻，页面从这根线继续往下滚。 */
let frozenZones = [];        // 所有冻结组算出来的区间
let frozenZone = null;       // 当前正在用的那一组（渲染和状态机都看它）

/* 算一组冻结区间：从该组第一段的触发线到最后一组文字消失。
   ★ 必须在“这一组的时间轴已经定稿”之后调用：
     触发线只看 top（不受位移影响），但 z1 取的是组内最后一段的 E，
     如果后面还有别的组要重串时间轴，那一次重串不会再动这一组，所以是安全的。 */
function buildOneZone(group) {
    if (!group || group.length === 0 || items.length === 0) return null;

    let first = null;
    let last = null;
    group.forEach(sel => {
        const it = items.find(i => matches(i.el, sel));
        if (!it) return;
        if (!first || it.A < first.A) first = it;
        if (!last || it.E > last.E) last = it;
    });
    if (!first || !last) return null;

    /* ---- 锁定位置跟着 CSS 的 top 走，并且和“钉在锚线上”的渲染方式对齐 ----
       渲染时元素中心被钉在锚线上（见 pinDy），所以触发线也取“元素中心到达锚线”那一屏：
           tr = top + h/2 - anchorY()
       这样上锁那一帧文字正好落在它该在的位置（不用挪），多组之间也一致。
       ★ 只用 top 不用 h 是不行的：文字高度不一样（比如 text-8 比 text-4 高一截），
         那会让每组的触发线偏移半个字高，第二组甚至会挪进第一组的区间里。
       ★ 也不能用 first.A：A 是串行时间轴排出来的，会被前一段推着走。
       普通映射下页面位置就是 p - introLen()，所以反向的进度是 hit = tr + introLen()。 */
    const L = introLen();
    const top = first.top != null ? first.top : first.el.offsetTop;
    const h = first.h != null ? first.h : (first.el.offsetHeight || 0);
    const tr = clamp(top + h / 2 - anchorY(), 0, pageMaxScroll());
    const hit = tr + L;

    /* 让整段至少占 FREEZE_MIN_SECONDS 的真实秒数，免得锁一瞬间就弹开 */
    const z1 = Math.max(last.E, hit + FREEZE_MIN_SECONDS * playbackRate());
    return { hit, tr, z1, group };
}

/* 把选择器命中的元素收集起来（供时间轴摘除 / 渲染判断用） */
function buildFrozenZones() {
    frozenZones = [];
    FREEZE_GROUPS.forEach(group => {
        const z = buildOneZone(group);
        if (!z) return;
        frozenZones.push(z);
        group.forEach(sel => {
            items.forEach(it => { if (matches(it.el, sel)) it.freezeZone = z; });
        });
    });
    frozenZones.sort((a, b) => a.hit - b.hit);
    frozenZone = frozenZones[0] || null;
}

/* 冻结组之后的时间轴重排。
   目标（用户要求）：
     · 冻结组【自己】按触发线摆好（它就在 CSS 位置上开演）；
     · 除冻结组以外的【所有】文字都回到作者在 1.css 里写的静态位置 ——
       也就是 text-1 那种“滚到自己 CSS 位置时正落在 40% 锚线”的普通出场方式；
       允许个别文字在时间上重叠（用户明确说没关系）。
   ★ 所以这里不再做“整体前移/后移”的推算：
     任何推算都会引入 组内 span 与页面行程之间的差，越推越乱。
     直接把 A 定成静态位置、再按 top0 顺序串一遍即可，简单且可预期。
   ★ 冻结组用 top0（原始静态位置）判断先后：it.top 会被这里改写。 */
function relaxNonFrozenToAuthored(skippedEls) {
    /* 冻结组：保持 buildOneZone / 组内串行算出来的 A（它们本来就在正确的一屏） */
    /* 非冻结：A 直接回到作者写的位置 */
    items.forEach(it => {
        if (skippedEls.has(it.el)) return;
        const shift = it.top0 - it.A;
        it.A += shift;
        it.H += shift;
        it.B += shift;
        it.E += shift;
    });
}

/* 进度落在哪一组冻结区间里：取“触发线不超过进度”的最后一组。
   ★ 这里必须【纯粹看进度 p】，不能再优先返回 frozenZone：
     一旦保留“已经在某组里就继续用它”，第一组放完、进度继续往前走到第二组时
     会一直被第一组拦住，第二组永远触发不了。 */
function zoneForProgress(p) {
    if (frozenZones.length === 0) return null;

    let best = null;
    frozenZones.forEach(z => { if (p >= z.hit - 1) best = z; });
    if (best) return best;
    /* 还没到任何一组的触发线：把最近的那一组先挂在身上（供渲染判断用） */
    return frozenZones[0];
}

/* 触发线对应的像素位置（tr 已经算好，这里只做兜底） */
function freezePoint(z) {
    if (!z) return pageMaxScroll();
    return clamp(z.tr, 0, pageMaxScroll());
}

/* 进度 → 页面滚动位置。冻结时钉在 frozenAt，其余就是普通 1:1 映射。 */
function pageScrollOf(p, active = freezeActive, at = frozenAt) {
    const realPageMax = pageMaxScroll();
    const L = introLen();

    /* 冻结：底图彻底钉死在 frozenAt（一点不动）。 */
    if (active) return clamp(at, 0, realPageMax);

    return clamp(p - L, 0, realPageMax);
}

/* 这一帧页面停在哪：冻结 → frozenAt（一点不动）；否则普通映射 */
function pageTopFor(p) {
    if (freezeActive) return clamp(frozenAt, 0, pageMaxScroll());
    return pageScrollOf(p, false, 0);
}

/* 当前进度是否落在冻结动效区间里 */
const inFrozenZone = () => !!frozenZone && cur >= frozenZone.hit && cur < frozenZone.z1;

/* ---- 冻结机制 ----
   freezeArmed  : 滚轮 / 触摸 真的动了，才允许撞线时进入播放。
                  页面自己因为别的原因（刷新、浏览器恢复滚动位置、锚点）停在触发线上时
                  绝不自动播 —— 否则一刷新就被迫看一遍。
   freezeActive : 是否正在“冻结播放”这一段文字。

   ★ 冻结期间：页面位置钉死在触发线上不动，这几段文字的进度改由【滚轮】直接驱动 ——
     往下滑正放（text-4 → 5 → 6），往上滑倒放（text-6 → 5 → 4）。
     滚轮滑一下文字走一点，不是定时自动播；停下来文字就停在当前状态。
     滑到头（正放到 z1 / 倒放回 hit）就解冻，页面从冻结位置继续 1:1 跟手。 */
let freezeArmed = false;
let freezeActive = false;
let frozenAt = 0;

/* 冻结动效自己的进度（滚轮驱动）。
   它和 cur（页面进度）分开：冻结期间页面不动，cur 就停在触发线上。
   往下滑它在 [hit, z1] 里往前走，往上滑往回退 —— 淡入/淡出是同一条包络，
   所以往前就是 4→5→6，往回就是 6→5→4。 */
let freezePos = 0;

/* 这一轮冻结的方向：+1 = 正放（下滑进来，4→5→6）、-1 = 倒放（上滑进来，6→5→4）。
   用来决定“滑到哪一端算放完”，避免两个端点判断互相打架。 */
let freezeDirIn = 1;

/* 倒放是否已经“上膛”：把滚轮从往下改成往上的那一刻才置位，
   放完一次就清掉 —— 这样一路往上滑不会在触发线附近反复重播（6>5>4 无限循环）。 */
let wantReverse = false;

/* 滚轮往哪边推：+1 = 往下、-1 = 往上、0 = 还没动。
   撞线时用它判断该正放还是倒放；一旦方向变了就重新允许触发下一轮。 */
let dirState = 0;
let lastDir = 0;

/* 这一趟（一次连续的下滑或上滑）里已经放过的冻结组。
   ★ 解冻时进度会“结清”本组跨度，靠这个集合挡住同一趟里重复触发。
     换滚动方向时清空，于是换成往上滑时可以再倒放一遍。 */
let firedZones = new Set();

/* 上一帧的页面滚动位置。
   ★ 冻结组的“跨线”判定要用它：比较上一帧与这一帧的位置，
     才能知道页面是不是越过了某一组的触发线（见 updateFreeze）。
     用“落在窗口里”判定会在一帧滚动很大时整段跳过触发线，那一组就永远不触发。 */
let prevPageY = 0;

/* 播放结束后，进度会被拨回触发线上（见 tick 里减去“动效跨度”那段）。
   如果不加这个标记，下一帧 prevCur 正好等于 hit，会立刻又被判定为“撞线”而无脑重播 ——
   表现就是“播完之后页面卡住不动、反复重播”。
   标记在“用户往回滚到触发线以上”时清零，于是往回再往下滑可以正常重播一次。 */
let freezeDone = false;

/* 滚轮 / 触摸真正收到输入的信号：允许下一次撞线时上锁 */
function armFreeze() {
    freezeArmed = true;
}

/* 显示用的冻结判断（只在真的锁着、且进度还在动效区间里时成立） */
const freezeLatched = () => freezeActive && inFrozenZone();

/* 重置“驱动输入”状态（初始化 / resize 用：这些都不是滚轮驱动）
   ★ 这里绝不能碰 freezeActive / freezeDone：
     初始化的 window load 事件会晚到，正好在播放中途打进来，
     要是把它们清掉，正在播的那一段会被掐断、页面当场跳到 z1 对应的位置。
     freezeActive 只由 tick 自己按播放进度收尾；freezeDone 只在用户往回滚过触发线时清。 */
function resetFreeze() {
    freezeArmed = false;
    frozenAt = 0;
    /* 跨线判定的基准也跟着归位，免得上一次留下的旧值造成误触发 */
    prevPageY = clamp(window.scrollY, 0, pageMaxScroll());
}

/* ---- 每帧定阶段：普通滚动 / 冻结播放 ----
   返回 true = 这一帧页面钉死在触发线上，冻结区的文字由滚轮驱动。
   ★ 这里只负责“开始 / 结束”，推进由滚轮（addTarget）和 tick 一起完成。 */
function updateFreeze(prevCur) {
    /* 当前进度附近的那一组冻结区间（可以有多组：text-4/5/6 一组、text-8/9 一组）。
       一组放完继续往前走，就会轮到下一组 —— 所以每帧按进度重新定位。 */
    const z = freezeActive && frozenZone ? frozenZone : zoneForProgress(target);

    /* ★ 换到另一组时要把 freezeDone 清掉：
       freezeDone 是“这一组已经放过了，别在原地重播”的标记，
       它只对本组有效。第一组放完置了 true，如果不随组切换清掉，
       第二组就会因为 !freezeDone 不成立而永远触发不了。 */
    if (z !== frozenZone) {
        frozenZone = z;
        freezeDone = false;
    }
    frozenZone = z;

    if (!z) {
        freezeActive = false;
        return false;
    }

    /* ---- 倒放：每“换一次方向”只放一遍 ----
       只按位置判断的话，一路往上滑会在触发线附近不断重新满足条件 → 无限循环
       （位置判据总能再次越过）。所以改成事件式：
         把滚轮从“往下”改成“往上”的那一刻，允许一次倒放（wantReverse = true），
         放完就把它清掉（同时 freezeDone = true 挡住位置判据）。
       在这之后继续往上滑不会再放；要再倒放一遍，必须先往下滑一次换回方向。
       ★ 方向一变就清空 firedZones：换方向等于“重新来一趟”，
         于是往上滑时每一组都能倒放一次。 */
    if (dirState !== lastDir) {
        lastDir = dirState;
        freezeDone = false;
        wantReverse = (dirState < 0);   // 只有“改成往上滑”这一下才允许倒放
        firedZones.clear();
    }

    /* ★ 不再用“滚回触发线之前”来复位 firedZones：
       解冻后进度就压在触发线上，那条判据每帧都成立，
       会把刚放过的组立刻复位、于是原地反复重播。
       复位只交给“换滚动方向”（上面那段）：换方向 = 重新来一趟，
       于是往上滑时每一组都能倒放一次，同方向则每组只放一遍。 */
    /* 正在播放 */
    if (freezeActive) {
        /* 解冻：页面就停在它冻结时所在的位置（frozenAt），
           cur / target 也回到那里 —— 不欠账、不跳转，就从原位置继续。
           ★ 冻结那几段文字是【独立于页面滚动】自己走完的：
             它们的演出不消耗页面行程，所以解冻后页面位置必须还是 frozenAt。
             后续文字都放在作者写的静态位置上（见 relaxNonFrozenToAuthored），
             所以页面一继续滚，它们就按 text-1 那种方式在各自位置淡入淡出。 */
        if (freezeDirIn > 0) {
            if (freezePos >= z.z1 - 1e-6) {
                freezeActive = false;
                freezeDone = true;
                firedZones.add(z);
                cur = clamp(frozenAt, 0, pageMaxScroll());
                target = cur;
                return false;
            }
        } else {
            if (freezePos <= z.hit + 1e-6) {
                freezeActive = false;
                freezeDone = true;
                wantReverse = false;
                firedZones.add(z);
                cur = clamp(frozenAt, 0, pageMaxScroll());
                target = cur;
                return false;
            }
        }
        return true;
    }

    /* ---- 撞线进入：页面【跨过】这一组 CSS 的 top 那根线时才开演 ----
       ★ 判据必须用【跨越】，不能用“落在一个窗口里”：
         窗口判定（z.tr ± ARRIVE_TOL）在一帧滚动很大时会整段跳过去 ——
         前一帧还在窗口上方、后一帧已经在窗口下方，条件从头到尾没成立过，
         这一组就永远不触发。组数一多、页面越滚越快就越容易漏。
         跨越判定只看“上一帧在线上方、这一帧到了或越过线”，
         不管一帧滚 1px 还是 500px 都必定命中一次。
       ★ 也不能用 target（滚轮提前量）：它领先 pageY 多少完全取决于滚动速度，
         会出现“滚得快触发、滚得慢不触发”的怪毛病。
       ★ 正放（往下滑）：pageY 从 z.tr 下方跨上来 → 正放一次。
       ★ 倒放（往上滑）：pageY 从 z.tr 上方跨下去 → 倒放一次。
       ★ 两者都由 firedZones 兜底（同一趟里每组只放一遍）和 freezeArmed（必须是滚轮 / 触摸驱动）。 */
    const pageY = clamp(window.scrollY, 0, pageMaxScroll());
    const crossedDown = dirState > 0 && !firedZones.has(z)
                        && prevPageY < z.tr - ARRIVE_TOL && pageY >= z.tr - ARRIVE_TOL;
    const crossedUp = wantReverse && dirState < 0 && !firedZones.has(z)
                      && prevPageY > z.tr + ARRIVE_TOL && pageY <= z.tr + ARRIVE_TOL;

    if (freezeArmed && !freezeDone && (crossedDown || crossedUp)) {
        /* ★ 锁定位置 = 这一组 CSS top 对应的那一屏（z.tr）。
           跨越判定保证了页面此刻就在 z.tr 附近（最多差一帧的滚动量），
           所以对齐到 z.tr 只有几十像素的位移，看不出来；
           但换来的好处是：这一组一定在【CSS 指定的位置】开演、文字精确落在 40% 锚线上。
           ★ cur / target 一起设成 z.hit：进度与页面位置保持一致，
             冻结期间 pageTopFor 会把它钉在 frozenAt 上。
           ★ 动画进度按方向取起点：
             正放从触发线开始（组内第一段刚要淡入）；
             倒放从区段结尾开始，保证是从最后一段往回演。 */
        frozenAt = freezePoint(z);
        cur = z.hit;
        target = cur;
        freezeActive = true;
        freezeDirIn = crossedDown ? 1 : -1;
        freezePos = crossedDown ? z.hit : z.z1;
        wantReverse = false;    // 用掉这一次
        prevPageY = pageY;
        startLoop();
        return true;
    }

    /* 记下这一帧的页面位置，供下一帧做跨越判定 */
    prevPageY = pageY;
    return false;
}

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
// const rectRand = (a, b) => a + Math.random() * (b - a);
//
// function randomizeRectMotion(el) {
//     el.style.setProperty("--rscale", rectRand(1.12, 1.34).toFixed(3));
//     el.style.setProperty("--rtx", rectRand(-36, 36).toFixed(1) + "px");
//     el.style.setProperty("--rty", rectRand(-26, 26).toFixed(1) + "px");
// }
//
// rectEls.forEach(el => {
//     el.__rfade = Math.round(rectRand(600, 1100));   // 淡入时长
//     el.__rdelay = Math.round(rectRand(0, 450));     // 淡入延迟（错落感）
//     el.style.setProperty("--rdur", rectRand(2.4, 4.0).toFixed(2) + "s");
//     randomizeRectMotion(el);
//
//     // 每转完一圈换一组新的随机漂浮参数（周期不变，避免打乱相位）
//     el.addEventListener("animationiteration", () => randomizeRectMotion(el));
// });

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
    // 色块（rect）已注释：原来这里会重置 rectEls 的 marginTop / opacity
    // rectEls.forEach(el => {
    //     el.style.marginTop = "0px";
    //     el.style.opacity = "0";
    // });

    /* ---- 测量 + 按页面上下位置排序（每个元素各自占时间轴，没有绑定） ---- */
    const measured = texts
        .map(el => ({
            el,
            w: el.offsetWidth,
            h: el.offsetHeight,
            left: el.offsetLeft,
            top: el.offsetTop,
            top0: el.offsetTop          // 原始静态位置：后面冻结组重排时间轴时要拿它比较
        }))
        .sort((a, b) => a.top - b.top);

    /* ---- 每个组件“自然到达锚线”的进度 ----
       页面滚动到 scrollY 时，元素在屏幕上的中心 = top + h/2 - scrollY，
       让它等于锚线高度 anchorY()，即 scrollY = top + h/2 - anchorY()，也就是下面的 arrival。
       （锚线默认在从上往下 40% 处，见 ANCHOR_RATIO。）
       INTRO_SECONDS 用名义速度估算，避免和下面的自适应互相依赖。 */
    const introNominal = INTRO_SECONDS * REF_WHEEL_RATE * WHEEL_SPEED;
    const limit = pageMaxScroll() + introNominal;

    const arrivals = measured.map(m => introNominal + m.top + m.h / 2 - anchorY());
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

    /* 冻结区依赖 items 的 A/E，所以必须在 items 生成之后才能算：
       先清掉旧值，等下面 items 建好再重新取一次。 */
    frozenZone = null;

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

        /* 色块组（已注释）：原来色块跟随宿主，透明度另有错落延迟 */
        // const rects = [];
        // if (rectEls.length && matches(m.el, RECT_HOST)) {
        //     rectEls.forEach(el => rects.push({
        //         el,
        //         delay: (el.__rdelay || 0) / 1000 * rate,
        //         fadeIn: (el.__rfade || 0) / 1000 * rate
        //     }));
        // }

        return { ...m, A, H, B, E };
    });

    /* ---- 冻结组（底图停住、只放这几段文字）----
       ★ 第一步：先把【所有】组内元素标记好（freezeZone 置空 + 加入 skippedEls）。
         必须一次标完再开始算：
         算第一组时要把它之后的普通文字整体前移 span，而“之后的”按 top0 判断；
         如果第二组的元素此刻还没标记，它们会被当成普通文字跟着前移一次，
         轮到第二组自己再算时又前移一次 —— 第二组就越跑越靠前、和第一组挤在一起。
       ★ 第二步：逐组算触发线并重排，顺序从时间靠前到靠后。 */
    const skippedEls = new Set();
    frozenZones = [];
    FREEZE_GROUPS.forEach(group => {
        group.forEach(sel => {
            items.forEach(it => { if (matches(it.el, sel)) { it.freezeZone = null; skippedEls.add(it.el); } });
        });
    });
    FREEZE_GROUPS.forEach(group => {
        const z = buildOneZone(group);
        if (!z) return;
        group.forEach(sel => {
            items.forEach(it => { if (matches(it.el, sel)) it.freezeZone = z; });
        });
        frozenZones.push(z);
    });
    /* 把所有非冻结文字放回作者写的静态位置（冻结组自己不动） */
    relaxNonFrozenToAuthored(skippedEls);
    frozenZones.sort((a, b) => a.hit - b.hit);
    frozenZone = frozenZones[0] || null;


    items.forEach(it => {
        if (skippedEls.has(it.el)) {
            it.skipFrozen = true;
            it.el.style.visibility = "hidden";
            it.el.style.opacity = "";
            it.el.style.transform = "none";
        }
    });

    /* ---- 图层顺序：后出场的压在先出场的之上 ---- */
    const zOrder = new Map();
    items.forEach((it, i) => {
        if (!zOrder.has(it.el)) zOrder.set(it.el, i);
    });
    zOrder.forEach((idx, el) => {
        el.style.zIndex = String(idx + 1);
    });

    const endP = items.length ? items[items.length - 1].E : 0;
    console.info(
        `[home] 组件 ${items.length} 个 | 播放速度 ${WHEEL_SPEED} → ${(WHEEL_SPEED * fitScale).toFixed(4)}` +
        `（自适应 ×${fitScale.toFixed(3)}，滚轮需多滚 ${(1 / fitScale).toFixed(2)} 倍）| ` +
        `时间轴 ${Math.round(endP)} / 可用 ${Math.round(limit)} | 整页约 ${rate > 0 ? (limit / rate).toFixed(0) : "∞"}s | ` +
        `到达点前移 ${pulledCount} 个 | ` +
        (frozenZone
            ? `冻结触发线 top 对应 ${Math.round(frozenZone.tr)}px` +
              `（CSS top→进度 ${Math.round(frozenZone.hit)}），动效结束 ${Math.round(frozenZone.z1)}`
            : `冻结区 无`)
    );
}

/* ============================ 7. 渲染 ============================ */
/* 任何一个进度 p 下，可见组件都钉在锚线上：元素中心落在屏幕从上往下 ANCHOR_RATIO 处。
   相对静态位置需要的位移 = (anchorY - h/2) + scrollY - top（scrollY 每帧补偿掉了页面滚动）。
   锚线高度只由 ANCHOR_RATIO 一个常量决定（默认 0.4 = 从上往下 40%）。 */
function render() {
    const vh = window.innerHeight;
    const sa = window.scrollY;

    items.forEach(it => {
        const { el, h, top, A, H, B, E } = it;

        /* ---- 每组冻结文字只在“轮到它”的时候绘制 ----
           动画时钟分三种情况：
             · 正在播的那一组        → freezePos（滚轮驱动）
             · 已经播过的、排在当前进度之前的组 → 固定用 cur，于是 p >= z1，
               自然落进下面的 p >= E 分支（永远不再显示）
             · 还没到的组            → 也交给下面判断（p 还没到它的 A，同样不显示）
           这样多组之间互不干扰，也不会在播第二组时把第一组又冒出来。 */
        const p = (freezeActive && it.freezeZone === frozenZone) ? freezePos : cur;

        if (it.skipFrozen && !(freezeActive && it.freezeZone === frozenZone)) {
            const z = it.freezeZone;
            if (!z || cur <= z.z1) {
                el.style.visibility = "hidden";
                el.style.opacity = "";
                el.style.transform = "none";
                return;
            }
        }

        /* 还没轮到 / 已经消失：完全藏起来，静态位置保持不动 */
        if (p <= A || p >= E) {
            el.style.visibility = "hidden";
            el.style.opacity = "";
            el.style.transform = "none";
            // 色块（rect）已注释
            // if (rects && rects.length) {
            //     rects.forEach(r => { r.el.style.opacity = "0"; });
            // }
            return;
        }

        /* 钉在锚线上：元素中心落在屏幕从上往下 ANCHOR_RATIO 处（默认 40%） */
        const dy = pinDy(sa, h, top);

        let op;
        if (p < H) {
            op = easeOut((p - A) / Math.max(1e-6, H - A));                     // 原地淡入
        } else if (p < B) {
            op = 1;                                                            // 原地停留
        } else {
            op = 1 - easeOut(clamp((p - B) / Math.max(1e-6, E - B)));           // 原地淡出
        }

        /* ---- 冻结区那几段：页面被钉住不动的，所以位移按冻结点算 ----
           用的还是同一个 pinDy 式子，只是把“页面位置”换成冻结点，
           因此每一段的视觉中心都落在锚线上，和跟随滑动的文字完全对齐。 */
        const frozenHere = freezeActive && !!it.skipFrozen;
        const useDy = frozenHere ? pinDy(clamp(frozenAt, 0, pageMaxScroll()), h, top) : dy;

        el.style.visibility = "visible";
        el.style.opacity = String(op);
        el.style.transform = `translate(0px, ${useDy}px)`;

        // 色块组（已注释）：原来跟着宿主钉在中心；透明度按各自随机延迟错落淡入、和宿主一起淡出
        // if (rects && rects.length) {
        //     rects.forEach(r => {
        //         r.el.style.opacity = String(rectOpacityAt(r, p, it));
        //         r.el.style.marginTop = `${dy}px`;
        //     });
        // }
    });

    /* 冻结期间给 <body> 挂一个类（1.css 里可用 body.frozen-scroll 写别的样式）；
       只在真的锁着、进度还在区间里时挂。 */
    document.body.classList.toggle("frozen-scroll", freezeLatched());

    updateTopIndicator();
}

/* 色块的透明度包络（已注释）：宿主淡入区间内按各自随机延迟错落拉起，
   淡出区间与宿主同步（同一个包络，因此上滑可以完整倒放）。 */
// function rectOpacityAt(r, p, host) {
//     if (p <= host.A || p >= host.E) return 0;
//
//     const t1 = host.A + r.delay;
//     const t2 = t1 + r.fadeIn;
//
//     if (p < t1) return 0;
//     if (p < t2) return easeOut((p - t1) / Math.max(1e-6, t2 - t1));
//     if (p < host.B) return 1;
//     return 1 - easeOut(clamp((p - host.B) / Math.max(1e-6, host.E - host.B)));
// }

/* ============================ 8. 滚动驱动 ============================ */
function tick(now) {
    const dt = Math.min(50, now - lastTime || 16.67);
    lastTime = now;

    /* 先记录这一帧开始时的进度（= 上一帧实际停在的页面位置），冻结阶段用它判断 */
    const prevCur = cur;

    /* 先定这一帧的阶段：普通滚动（滚轮驱动），还是冻结播放（滚轮推动文字） */
    updateFreeze(prevCur);

    if (freezeActive) {
        /* ---- 冻结播放：页面一步不走，进度也不推进 ----
           ★ 冻结这几段文字和页面滚动【完全解耦】：
             cur 停在冻结时的位置（页面因此钉在 frozenAt 一点不动），
             文字进度走 freezePos，由滚轮直接驱动（见 addTarget）。
             滚轮停手文字就停在当前状态（该停留的停留）。
           ★ 这一趟“欠下”的行程（span）不解冻时还在，而是在解冻那一刻
             一次性记到 cur 上（见 updateFreeze 的出口）：
             页面于是从 frozenAt 直接接到 frozenAt + span，
             后续文字的出场点本来就是按 (hit + span) 排的，正好对齐、不留空档。 */
    } else {
        const k = 1 - Math.pow(1 - SMOOTHING, dt / 16.67);
        cur += (target - cur) * k;

        if (Math.abs(target - cur) < 0.1) cur = target;
    }

    /* 冻结时页面钉在触发线上（一点不动）；其余情况走普通映射 */
    window.scrollTo({ top: pageTopFor(cur), behavior: "instant" });
    render();

    /* 冻结播放期间滚轮随时可能继续滑，保持排帧以便及时收尾 */
    if (cur !== target || freezeActive) {
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
    /* 记录滚轮方向：撞线时用它决定正放还是倒放 */
    if (delta > 0) dirState = 1;
    else if (delta < 0) dirState = -1;

    /* ---- 冻结播放期间：滚轮完全不碰页面，只推冻区那几段文字 ----
       往下滑 → freezePos 往前走（text-4 → 5 → 6 依次 出现-停留-消失）
       往上滑 → freezePos 往回退（text-6 → 5 → 4 倒着放）
       滚轮停手它就停住，所以“停留”那段是靠继续滑才走完的，完全绑在鼠标上。
       ★ cur / target 在这里【一点都不动】：
         页面因此钉在 frozenAt；欠下的行程等解冻时一次性记上（见 updateFreeze 出口）。
         如果这里还累加 target，解冻那一帧页面会朝着远处的 target 猛冲。
       FREEZE_WHEEL_RATE：滚轮 → 文字进度的倍率（见文件头部）。
       ★ 正放和倒放用同一个倍率 —— 两边的手感必须一致。 */
    if (freezeActive && frozenZone) {
        freezePos = clamp(freezePos + delta * FREEZE_WHEEL_RATE, frozenZone.hit, frozenZone.z1);
        startLoop();
        return;
    }

    target = clamp(target + delta * zoneSpeedFactor(target), 0, maxProgress());
    startLoop();
}

window.addEventListener("wheel", e => {
    e.preventDefault();

    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= window.innerHeight;

    /* 滚轮是真正的“驱动输入”：允许撞线时进入冻结播放 */
    armFreeze();
    addTarget(d * wheelFactor());
}, { passive: false });

let touchY = null;

window.addEventListener("touchstart", e => {
    touchY = e.touches[0].clientY;
    if (!freezeActive) armFreeze();
}, { passive: true });

window.addEventListener("touchmove", e => {
    e.preventDefault();

    const y = e.touches[0].clientY;
    if (touchY !== null) {
        const d = touchY - y;
        if (freezeActive && frozenZone) {
            /* 冻结播放期间触摸同样只推动文字 */
            freezePos = clamp(freezePos + d * TOUCH_SPEED * fitScale, frozenZone.hit, frozenZone.z1);
            startLoop();
        } else {
            armFreeze();
            addTarget(d * TOUCH_SPEED * fitScale);
        }
    }
    touchY = y;
}, { passive: false });

window.addEventListener("touchend", () => {
    touchY = null;
});

window.addEventListener("keydown", e => {
    /* 冻结播放期间键盘翻页同样解绑 */
    if (freezeActive) return;

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
        armFreeze();
        target = clamp(target + map[e.key], 0, maxProgress());
        startLoop();
    } else if (e.key === "Home") {
        e.preventDefault();
        target = 0;
        startLoop();
    } else if (e.key === "End") {
        e.preventDefault();
        armFreeze();
        target = maxProgress();
        startLoop();
    }
});

window.addEventListener("scroll", () => {
    /* 冻结播放期间页面位置是我们自己钉死的常量，进度也是时间驱动的：
       绝不能让浏览器的滚动事件反过来改进度，否则这段会被打乱。 */
    if (freezeActive) {
        render();
        return;
    }

    /* ---- 解冻后不存在“滑行”这回事 ----
       cur 冻结期间没动，解冻时直接落到触发线之后的 z1，页面位置就是冻结点，
       之后全程滚轮 1:1 —— 所以这里不需要任何特殊处理。 */

    const computedPageP = window.scrollY > 0 ? introLen() + window.scrollY : 0;
    const pageThreshold = progressLimit();
    const pageY = window.scrollY;

    /* 往下滚到底：把进度顶到页面末端（这样最后一段也能放完）。
       只在“向下”到达底部时做，而且进度已经比页面末端大就不回写 ——
       否则从下面往上滑经过底部时会把进度顶到末端，跳掉中间那一整段动画。 */
    if (pageY >= pageMaxScroll() &&
        pageY > pageScrollOf(cur) &&
        cur < Math.min(pageThreshold, maxProgress())) {
        cur = target = pageThreshold;
        render();
        return;
    }

    /* ---- 手动 / 外部滚动改变页面位置的兜底 ----
       页面位置和进度对不上时按“位置为准”回写进度：
         ★ 但页面已经压在触发线上、进度还没走完动效时绝不回写 ——
           回写就等于把人吸回触发线，这就是“往上滑被弹回来”的 bug。
           这一条只需要用页面对比“没有冻结时应该停在哪”来判断，
           不涉及任何“要不要上锁”的逻辑，所以不会卡住滚轮的推进。 */
    const approachingZone = frozenZone && pageY >= freezePoint(frozenZone) - 2;
    const matchesPage = Math.abs(pageY - pageScrollOf(cur)) <= 2;

    if (!matchesPage && !approachingZone) {
        cur = target = Math.min(computedPageP, pageThreshold);
    }

    render();
}, { passive: true });

function onResize() {
    updateBodyHeight();
    sizeTopVideo();        /* 视频高度 / 下移量 / 文档总高：必须在 updateBodyHeight() 之后、layout() 之前 */
    layout();
    resetFreeze();             // resize 属于“外部”变化，不继承冻结状态，也不会上锁
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
    sizeTopVideo();        /* 底图高度就绪后再算视频高度 / 下移量 / 文档总高 */

    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
        // 先清掉可能残留的内联动画状态，再测量
        texts.forEach(el => {
            el.style.transform = "none";
            el.style.opacity = "";
            el.style.visibility = "";
        });

        layout();

        /* 初始化属于“外部”进入：一律不上锁，也不把页面拽到触发线上。
           这里直接照“普通滚动”的映射算，所以刷新 / 从链接进入都只是静止的一屏。 */
        resetFreeze();
        cur = target = clamp(
            window.scrollY > 0 ? introLen() + window.scrollY : 0,
            0,
            maxProgress()
        );
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
    get cur() { return cur; },
    get target() { return target; },
    get frozenZone() { return frozenZone; },
    get frozenZones() { return frozenZones; },
    get freezeActive() { return freezeActive; },
    get frozenAt() { return frozenAt; },
    get freezeArmed() { return freezeArmed; },
    get freezePos() { return freezePos; },
    get pageTop() { return pageTopFor(cur); },
    layout,
    render
};

/* ============================ 10. 右侧竖直中心的 top% 圆圈 ============================ */
/* 固定在页面右边的竖直中心（就是组件被钉住的那条中心线），实时显示这条中心线
   落在【页面 / 底图高度的百分之几】—— 也就是你在 1.css 里给 .text-* 写 top 时
   该填的那个百分比。
   用法：滚到想放元素的位置 → 看圆圈读数 → 把它写进 .text-xx { top: xx% }。
   例：圆圈显示 34.50%，想让它正对着中心线，就写 top: 34.5%。
   样式在 1.css 的 .top-indicator；不想要就整段注释掉（render() 里那行调用一起注释）。 */
const topIndicator = document.createElement("div");
topIndicator.className = "top-indicator";
topIndicator.innerHTML = '<span class="top-indicator-label">top</span>' +
                         '<span class="top-indicator-value">--%</span>';
document.body.appendChild(topIndicator);

const topIndicatorValue = topIndicator.querySelector(".top-indicator-value");

/* 先算一次，底图还没加载完时也会显示（此时页面高度未知就显示 --%） */
updateTopIndicator();

function updateTopIndicator() {
    /* 页面高度 = 底图铺满后的高度（updateBodyHeight() 写在 body 上） */
    const pageH = document.body.offsetHeight || document.documentElement.scrollHeight;
    if (!pageH) {
        topIndicatorValue.textContent = "--%";
        return;
    }

    /* 底图在文档里的上沿：顶部视频那段是 2.css 的 --lead-in 把底图往下推的，
       读数要减掉它，显示的才是“底图高度的百分之几”（= 1.css 里该写的 top 值） */
    const leadIn = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--lead-in")) || 0;
    const mapTop = document.body.getBoundingClientRect().top + window.scrollY + leadIn;

    /* 锚线（文字钉住的那条线，默认从上往下 40%）在【底图坐标系】里的位置
       （负数 = 锚线还在底图上方，即视频那段里） */
    const centerY = window.scrollY + anchorY() - mapTop;

    topIndicatorValue.textContent = (centerY / pageH * 100).toFixed(2) + "%";
}

/* ============================ 11. 页面顶部的视频（点按钮播放） ============================ */
/* 位置：页面最顶端、和页面等宽；底图（map.png）从视频下沿开始，视频不盖住底图。
   怎么做到“底图接在视频下面”且不错位：
     用 2.css 现成的“引导段”变量 --lead-in（= 视频高度）把【底图 + 文字 + 图片 +
     2.js 的人物视频与轨迹点】一起下移一个视频的高度。它本来就是为这件事写的：
     底图挪 background-position，其余元素挪 margin-top / top，所以谁和谁的相对位置都
     不变（2.js 读到的轨迹点 y 也会跟着含进这段偏移，坐标参照系仍然一致）。
   ★ 不要改成给 body 加 margin-top：那不会改 2.js 读到的 offsetTop / 点盒子 top，
     人物会整体偏掉一个视频高度。
   ★ 整块 pointer-events: none：iframe 会吞掉它范围内的滚轮事件，而这一页是纯滚轮
     驱动的（2.css 里 .bg-video-wrap 一直 pointer-events: none 也是这个原因），
     所以视频绝不能拦住滚轮；只有下面两个按钮是可点的。
   交互：初始只显示封面 + 播放按钮；点按钮才把 PeerTube 播放器 iframe 挂进来（带
         autoplay，点一下就能出声）；播放后右上角出现 ✕，点它停播并收回封面。
   想换成原生控件（暂停 / 音量 / 进度 / 全屏）：把 1.css 里 .top-video-frame 的
   pointer-events 改成 auto，代价是鼠标停在视频区域时滚轮不再驱动页面。 */
const TOP_VIDEO_EMBED = "https://video.igem.org/videos/embed/pyn38ovsD5mjS7FP3bDJ4F";
const TOP_VIDEO_POSTER = "https://video.igem.org/lazy-static/thumbnails/f357e47c-5ea7-41c4-aa82-1916fc70bc8b.jpg";
/* 点播放之后才加的参数：自动播放、不要控件条、不要标题条（纯当顶部横幅用） */
const TOP_VIDEO_PARAMS = "?autoplay=1&controls=0&peertubeLink=0&title=0";

const topVideoWrap = document.createElement("div");
topVideoWrap.className = "top-video-wrap";

const topVideoPoster = document.createElement("img");
topVideoPoster.className = "top-video-poster";
topVideoPoster.src = TOP_VIDEO_POSTER;
topVideoPoster.alt = "";
/* 封面拿不到就留黑底，不影响播放按钮 */
topVideoPoster.addEventListener("error", () => { topVideoPoster.style.display = "none"; });

const topVideoPlay = document.createElement("button");
topVideoPlay.type = "button";
topVideoPlay.className = "top-video-play";
topVideoPlay.setAttribute("aria-label", "播放视频");
topVideoPlay.innerHTML = '<span class="top-video-play-icon"></span>';

const topVideoClose = document.createElement("button");
topVideoClose.type = "button";
topVideoClose.className = "top-video-close";
topVideoClose.setAttribute("aria-label", "停止并收起视频");
topVideoClose.textContent = "✕";

topVideoWrap.appendChild(topVideoPoster);
topVideoWrap.appendChild(topVideoPlay);
topVideoWrap.appendChild(topVideoClose);
document.body.appendChild(topVideoWrap);

/* 视频高度 = 页面宽度 × 9/16（视频是 16:9），并用 2.css 的“引导段”变量 --lead-in
   把【底图 + 文字 + 图片 + 2.js 的人物视频与轨迹点】一起下移同样的距离 ——
   底图正好从视频下沿接下去，而它们彼此的相对位置和坐标参照系完全不变。
   ★ 必须走 --lead-in，不能给 body 加 margin-top：2.js 把轨迹点的 y 当“文档坐标”用
     （见 2.js 的 readPoint / viewportCenterY），--lead-in 会同时写进那些点盒子的
     top（2.css 里 .tnpb-points / .crispr3-points 都写了 top: var(--lead-in)），
     body 的 margin 不会 —— 那样人物就会整体偏掉一个视频高度。 */
function sizeTopVideo() {
    const w = document.documentElement.clientWidth || window.innerWidth;
    const h = Math.round(w * 9 / 16);
    const mapH = document.body.offsetHeight || 0;

    document.documentElement.style.setProperty("--lead-in", h + "px");
    /* 文档总高要多出视频这一段：底图最底部才画得出来、也才滚得到 */
    document.documentElement.style.minHeight = (h + mapH) + "px";

    topVideoWrap.style.height = h + "px";
    return h;
}

sizeTopVideo();

let topVideoFrame = null;

/* 点播放：这时才建 iframe（首屏不用加载播放器），带 autoplay 直接开播 */
function playTopVideo() {
    if (topVideoFrame) return;

    topVideoFrame = document.createElement("iframe");
    topVideoFrame.className = "top-video-frame";
    topVideoFrame.src = TOP_VIDEO_EMBED + TOP_VIDEO_PARAMS;
    topVideoFrame.title = "XMU-China: Team Members Introduction (2026)";
    topVideoFrame.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
    topVideoFrame.setAttribute("allowfullscreen", "");
    topVideoFrame.setAttribute("frameborder", "0");
    topVideoFrame.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups");

    topVideoWrap.appendChild(topVideoFrame);
    topVideoWrap.classList.add("is-playing");
}

/* 点 ✕：把 iframe 整个撤掉（视频立刻停），回到封面 + 播放按钮 */
function stopTopVideo() {
    if (!topVideoFrame) return;

    topVideoFrame.remove();
    topVideoFrame = null;
    topVideoWrap.classList.remove("is-playing");
}

topVideoPlay.addEventListener("click", playTopVideo);
topVideoClose.addEventListener("click", stopTopVideo);
