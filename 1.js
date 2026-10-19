/* ======================= 0. 文案控制（两类文字都在这里） =======================
   ★ 全站唯一入口：随页面滚动的文字、【冻结】文字，用的都是这一节的变量。

   两类文字共用同一套「包络」：淡入 → 停留 → 淡出，时长都取自 0.1；
   也共用同一个屏幕高度（0.3 的 ANCHOR_RATIO）。
   唯一的区别是【谁来推进这个包络】：
     · 随页面滚动的文字：包络绑在页面上 —— 滚到它该出现的那一屏就自然演完，
       滚多少演多少，往上滚就倒着演。这类文字【不需要】任何单独配置，
       全页顺序由 1.css 的 top 决定；
     · 冻结文字（0.2 的 FREEZE_GROUPS 里点名的那些）：页面先被钉死在触发线上、
       一步不走，包络改由【滚轮】直接推进 —— 不滑就不走，滑过这一组才解冻继续往下滚。
   想改“演多久” → 0.1；想改“哪几句冻结 / 滚轮推多快” → 0.2；想改“停多高” → 0.3。
   ============================================================================ */

/* ---- 0.1 时长（两类共用：普通文字和冻结文字都是这三段）---- */
const FADE_IN_SECONDS = 0.6;   /* 原地淡入时长 */
const HOLD_SECONDS = 3.0;      /* 钉在竖直视觉中心（ANCHOR_RATIO）的停留时长 */
const FADE_OUT_SECONDS = 0.6;  /* 原地淡出时长 */
const GAP_SECONDS = 0.4;       /* 相邻组件之间的额外留白（秒）；0 = 上一个消失完下一个立刻淡入 */

/* ---- 0.1 的覆盖表：单个组件可以单独设时长（两类文字都适用）----
   从上往下匹配，命中的规则覆盖上面的默认值。例：
   const COMPONENT_TIMING = [
       { sel: ".text-12", hold: 4.0, fadeIn: 0.8, fadeOut: 0.8 },
       { sel: ".text-1",  hold: 2.0 },
       { sel: ".img-13",  fadeIn: 1.2 }
   ];
   没写的字段沿用上面的默认值；
   一条都不需要就留空数组（= 全部组件用同一套默认时长）。 */
const COMPONENT_TIMING = [
    /* text-9（“An editor can cut well / and still be unable to cut where we need it.”）：
       多停一会儿。默认 hold = 3.0 秒 → 这一句总共只挂 0.6 + 3.0 + 0.6 = 4.2 秒，
       而它自己的视频（3.js 的图标 10：editing.webm）要播 3.85 秒 ——
       视频刚播完这句就只剩 0.35 秒，4.js 那个「gene.webm 播完后从上方飞进来、
       在空中转一圈、落在 where 正上方」的效果根本没时间演。
       留到 5.5 秒 → 这句挂 6.7 秒：视频 3.85 秒播完后还有 2.85 秒，
       飞入（约 1.7 秒）能完整落地，再跟这一句一起淡出。
       想再长 / 再短只改这一个数（代价是 text-9 之后的内容整体往后延）。 */
    { sel: ".text-9", hold: 5.5 }
];

/* ---- 0.2 冻结文字：页面钉住、改由滚轮推进的那几组 ----
   写在这里的选择器会被摘出“随页面滚动”的时间轴，改成：
   向下滑到该组第一段的触发线（= 它 CSS top 那一屏）→ 页面锁死，滚轮只推这几句；
   向上滑回那条线 → 倒着放一遍。可以写多组，各自在自己的位置触发、互不影响。
   ★ 它们的时长仍然取 0.1 那套，不单独设；下面几个旋钮只管“冻结这段怎么演”
     （撞线判定的实现在 1.js 的 updateZoneArms / zoneToStart，不在这两个文件里配）。 */
const FREEZE_GROUPS = [];
/*已不需要（悲）
   ★ 这里必须是【空数组】= 不冻结任何文字。
     以前写的是 [[" "]]：单个空格不是合法选择器，el.matches(" ") 会抛错被 matches() 兜住返回 false，
     于是每次 layout() 都要刷几十条 “选择器无效” 的 warn，效果和空数组完全一样。
     以后要恢复冻结：照格式写成 [ [".text-4", ".text-5", ".text-6"] ] 即可。 */

/* 冻结期间：滚轮 delta → 文字进度的倍率。
   1 = 和页面滚动同速（整段 3 句要滑约 900px 才放完，比较慢）；调大 = 同样距离走得更快。
   只影响“读这几句要滑多少滚轮”，不改变 0.1 里那些秒数（页面此时是不动的）。 */
const FREEZE_WHEEL_RATE = 2.2;

/* 一组的最小时长下限（秒）：淡入+停留+淡出至少占这么久，免得锁定一瞬间就弹开。 */
const FREEZE_MIN_SECONDS = 0.6;

/* 触发容差（像素）：页面滚到该组 CSS top ±这个值以内就算“到线”。
   ★ 它只是“到了”这条线的判定宽度，不是“必须某一帧正好跨过去”的宽度：
     上膛状态是【保持】的（见下面的 updateZoneArms），页面停手停在带里也不会漏触发，
     所以 24 完全够用，不需要调大。
   ★ 反过来说：以前“漏触发”不是因为这里太小，把它调大反而更糟 ——
     判定带越宽，页面停手时落进带里的机会越大，那种“上一帧在带外、这一帧进带内”的
     一帧式跨越判据就更容易彻底失效（详见 updateZoneArms 上面的说明）。 */
const ARRIVE_TOL = 24;

/* 冲过头容忍（像素）：页面被“外部”一把拽很远时（拖滚动条 / PageDown / Home、End / 刷新），
   可能一帧就越过触发线几百像素。超过这个距离就不再往回拽页面去补演，
   只让它保持“上过膛”，等下次从线外滑回来再触发。正常滚轮滑动永远到不了这个值。 */
const FREEZE_CATCHUP = 480;

/* ---- 0.3 文字停在屏幕哪个高度（两类共用）----
   ANCHOR_RATIO = 没被下面覆盖表点名的句子的高度，用的是【文字中心】：
     0.5 = 正中间；0.4 = 从上往下 40%（距底部 60%）。改它整体上下移动，动效本身不受影响。
   ★ 只影响“停在屏幕多高”，【不影响】“滚到哪一屏出现” —— 后者由 1.css 的 top 决定
     （见 relaxNonFrozenToAuthored），所以改这里不会让两个文案在时间上撞车。

   ★ 单句单独设高度 → 写进 ANCHOR_OVERRIDES，它的数字是【文字块的上沿】（从顶边量）：
       top: 0.3 → 这一句的顶边压在“从上往下 30%”那条线上，文字往下排。
       30% = 距底 70%，也就是“70% 高度”；top: 0.2 = 距底 80% = “80% 高度”。
     ★ 用上沿而不是中心：每句行数不一样（1~6 行），用中心的话长短句的顶边会各差
       几十像素、对不齐；用上沿，所有被点名的句子“第一行从哪儿开始”是齐的，
       往下排到哪儿由行数自己决定。
     ★ 上沿语义天然不会把字切在顶上（顶边就在 20%~30% 处）；
       只有块高超过（视口高 − 上沿线）时才会顶到底边，那种极端情况由下面的夹取兜住。 */
const ANCHOR_RATIO = 0.4;

/* 单句覆盖表：从上往下匹配，命中的句子按上沿定位。例：
   const ANCHOR_OVERRIDES = [
       { sel: ".text-12", top: 0.45 },
       { sel: ".text-13", top: 0.3 }
   ]; */
const ANCHOR_OVERRIDES = [
    { sel: ".text-1",  top: 0.23 },   
    { sel: ".text-2",  top: 0.3 },   
    { sel: ".text-3",  top: 0.3 },  
    { sel: ".text-6",  top: 0.35 },  
    { sel: ".text-7",  top: 0.23 },  
    { sel: ".text-8",  top: 0.28 },  
    { sel: ".text-10", top: 0.3 },   
    { sel: ".text-11", top: 0.15 },   
    { sel: ".text-12", top: 0.25 },   
    { sel: ".text-15", top: 0.2 },   
    { sel: ".text-16", top: 0.15 },   
    { sel: ".text-17", top: 0.13 },  
    { sel: ".text-18", top: 0.13 },  
    { sel: ".text-19", top: 0.08 },
    { sel: ".text-23", top: 0.15 }    
];

/* 这个元素的上沿该压在视口从上往下多少比例：命中覆盖表就返回它的 top，没命中返回 null */
function topOf(el) {
    if (el) {
        for (let i = 0; i < ANCHOR_OVERRIDES.length; i++) {
            const r = ANCHOR_OVERRIDES[i];
            if (r && r.sel && matches(el, r.sel)) return r.top != null ? r.top : null;
        }
    }
    return null;
}

const viewportH = () => window.innerHeight || document.documentElement.clientHeight;
const anchorY = () => viewportH() * ANCHOR_RATIO;      // 兜底：没有元素时的基准锚线

/* 这一句的锚线高度（px）= 文字块【中心】该停在屏幕上的 y。
   · 命中覆盖表 → 中心 = 视口高 × top + h/2
       于是 上沿 = 中心 − h/2 = 视口高 × top，正好压在那条线上；文字往下排。
   · 没命中    → 中心 = 视口高 × ANCHOR_RATIO，
       再夹进 [h/2, 视口高 − h/2]，免得特别长的句子把字顶出屏幕。
   ★ h 必须由调用方传进来（render 里有缓存好的 it.h），不要在 render 里现场读 offsetHeight ——
     render 每帧都在写 style，再读布局会让浏览器每帧强制重排，容易掉帧。 */
const anchorYOf = (el, h) => {
    const vh = viewportH();
    const hh = h || 0;
    const t = topOf(el);

    /* 上沿定位：上沿永远在 20%~30% 处，只有块高到装不下时才会顶到底边，这里兜一下 */
    if (t !== null) return Math.min(vh * t + hh / 2, Math.max(vh - hh / 2, hh / 2));

    const y = vh * ANCHOR_RATIO;
    if (hh <= 0) return y;
    return Math.min(Math.max(y, hh / 2), Math.max(vh - hh / 2, hh / 2));
};

/* 元素要“上移多少”才能把竖直中心放到锚线上（锚线取这个元素自己的上沿 / 全局比例）。
   pageTop 传这一帧页面停的位置、h 传元素高度、top 传它的静态 top。
   冻结播放和普通滚动都走这一个式子，所以两边落点完全一致。 */
const pinDy = (el, pageTop, h, top) => anchorYOf(el, h) - h / 2 + pageTop - top;

/* ============================ 1. 滚动 → 进度换算 ============================
   滚轮要滚多远才放完（不影响上面那些“秒”，那两个是正交的）
   ★ 本节末尾还有“空白段加速”（GAP_SPEED_BOOST / GAP_SPEED_EASE）：
     没有文字的滑动区间里让滚轮走得更快，文字的位置和动效一概不动。
   ============================================================================ */

/* 滚轮 delta → 进度 的换算系数：越大，同样的滚轮输入页面“播”得越快 */
const WHEEL_SPEED = 0.1;

/* 时间轴总长超过页面可滚动范围时，自动下调播放速度，保证 3s 之类的时长不被压缩变形。
   自动值会打印到控制台；想自己写死就把这里改成 false，再手调 WHEEL_SPEED。 */
const AUTO_FIT = true;

/* 自适应最多把播放速度降到 1/MAX_SLOWDOWN（也就是滚轮最多需要多滚这么多倍）。
   调大 = 每个组件之间的“间隔”保留得更多、整页更慢；调小 = 更接近原速、间隔被压掉。 */
const MAX_SLOWDOWN = 2;

const TOUCH_SPEED = 0.20;

/* ★ 输入倍率（运行时可改）：同样的滚轮 / 手指滑动 / 键盘输入，页面走 inputScale 倍远。
   1 = 桌面原样（PC 一个字节都不变）；移动端由 5.js 通过 __home.setInputScale(5) 调成 5。
   ★ 它只乘在“输入 → 进度”这一层，时间轴（每段文字的时长、视频播放）一点都不动：
     所以就只是“滑同样的距离，页面走得快”，每段动效该多久还是多久。 */
let inputScale = 1;

const KEY_STEP = 30;          /* 键盘单步（名义进度，会跟随播放速度缩放） */
const SMOOTHING = 0.08;
const REF_WHEEL_RATE = 1000;  /* “1 秒”的定义：以每秒 1000 的滚轮 delta 为名义速度 */
const INTRO_SECONDS = 0;      /* 开场静止时长（秒）。新动效不需要，保持 0 */
const TAIL_SECONDS = 1.5;     /* 最后一个组件消失后，页面还留多少滚动（秒） */

/* ---- 文字高度（ANCHOR_RATIO / anchorY / pinDy）、冻结组（FREEZE_GROUPS →
   FREEZE_MIN_SECONDS / ARRIVE_TOL / FREEZE_WHEEL_RATE）、文案时长，全部已搬到
   文件最顶上的【0. 文案控制】。
   ★ 同一个 const 在这里再写一遍会直接抛 SyntaxError，所以下面只留这一段提示。 */

/* “慢滚区”：在这几段文字之间把滚轮速度降下来，让动画看得清。
   格式：[ 起始选择器, 结束选择器, 区间内的速度倍率, 过渡长度(px) ]
   例：[[".text-1", ".text-4", 0.5, 400]] 让这段以一半速度滚过。
   ★ 这个数组必须存在（哪怕是空的）：zoneSpeedFactor() 会读它，
     以前它被误删过，导致滚轮回调里抛 ReferenceError、整个页面滚不动。
     空数组 = 不减速，行为与没有这个功能时完全一致。 */
const SLOW_ZONES = [];

/* ---- “空白段加速”：没有文字的滑动区间里，滚轮走得更快 ----------------
   为什么需要：整页 33 段文字的位置是作者定的，段与段之间必然留出空白行程。
   开启前实测：滚到页面底部要 2148 格滚轮，其中 1103 格（51%）“画面上一个字都没有”，
   最长的一段要空滑七八十格。这里让这些空白区间自动加速，遇到文字再恢复原速。

   ★ 只改“滚轮 delta → 进度”的换算，【不动】任何文字的位置、出场点、时长和动效：
     这些都还是 0.1 / 0.2 / 1.css 里那一套，文字该在哪一屏出现就还在哪一屏出现
     （layout 打印的 A/H/B/E、冻结触发线、全部一字不变），
     变的只是“从上一句滑到下一句要滚多少格”。

   GAP_SPEED_BOOST : 空白正中间的速度倍率。1 = 关闭（与没有这个功能时完全一致）。
                     取 3.0 实测：整页滚轮格数 2148 → 1662，空滑格数 1103 → 726。
                     想更省力就调大（3.5 约 1603 格），想更接近原速就调小。
   GAP_SPEED_EASE  : 过渡距离（进度单位 = 页面像素）。离“最近的有字区间”或“冻结触发线”
                     还有这么远时才开始加速，进入文字前又平滑回到 1 倍 ——
                     这样文字出现、页面撞上冻结线的那一刻速度都是原速，不会有突然一顿。
                     调大 = 加速更平缓、空白段收益更小；调小 = 更干脆。
                     （本页的空档多在 91~522px，取 50 时 100px 以上的空档中段能吃满倍率。）

   ★ 想只在“往下滑”时加速、往上滑保持原速：把 addTarget 里那一行改成
       const speed = delta > 0 ? zoneSpeedFactor(target) * gapSpeedFactor(target)
                               : zoneSpeedFactor(target);
     现在上下对称 —— 不对称会让往回滑的手感忽快忽慢。 */
const GAP_SPEED_BOOST = 3.0;
const GAP_SPEED_EASE = 50;

/* ============================ 2. 底图 ============================ */

/* 底图地址：量页面高度（body height）和画到 body 上的背景用的都是它，
   换图只改这一行；页面高度、文字/轨迹点的 % 全都跟着这张图的比例走。 */
const BG_URL = "https://static.igem.wiki/teams/6059/wiki/home/map-5.avif";

const bgImg = new Image();
bgImg.src = BG_URL;

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
const wheelFactor = () => WHEEL_SPEED * fitScale * inputScale;       // 滚轮 delta → 进度（含输入倍率）
const introLen = () => INTRO_SECONDS * playbackRate();

const pageMaxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/* ---- 冻结“一根线”：触发点 + 动效跨度 ----
   tr  : 触发线（页面像素位置）。由该组第一段的 CSS top 决定 ——
         页面滚到这一屏就上锁，文字正好落在它该在的位置（不用挪）。
   hit : 同一根线换算成“进度”的值（hit = tr + introLen()），
         上锁时把 cur / target 一起设成它，页面于是钉在 tr 不动。
   z1  : 动效跨度终点（组内最后一段完全消失）。触发之后滚轮推 [hit, z1] 这一段，
         这期间页面锁在 tr 上；推过 z1 就解冻，页面从这根线继续往下滚。
   armDown / armUp ：撞线判定用的“上膛”状态（见 updateZoneArms 上面的长注释）。 */
let frozenZones = [];        // 所有冻结组算出来的区间
let frozenZone = null;       // 当前正在用的那一组（渲染和状态机都看它）

/* 算一组冻结区间：触发线（CSS top 那一屏）+ 组内各段串起来的包络。
   ★ 顺序很重要：先按时间轴顺序把这一组的元素收齐，再用第一段定触发线，
     然后把整组的 A/H/B/E 【重新串到触发线上】。
   ★ 为什么要重串（本文件最容易踩的坑）：
     items 里的 A/E 是“整页时间轴 + AUTO_FIT 压缩”的产物。AUTO_FIT 为了让
     33 个组件在页面滚到底之前全部演完，会把到达点前移（本页 33 个全被前移），
     冻结组的 A/E 因此可能跑到触发线【前面很远】。
     这时上锁那一刻 p = hit 已经落在该组的 E 之后 → 页面确实停住了，
     但一个字都不显示（这就是“滑过检出位置却没有文字跳出来”的直接原因）。
     重串之后组内的 A/H/B/E 与 CSS top 严格对齐，锁定即开演，与压缩无关。 */
function buildOneZone(group) {
    if (!group || group.length === 0 || items.length === 0) return null;

    /* ---- 把这一组命中的元素按时间轴顺序收齐（同一个 top 的几段就是这个先后） ---- */
    const members = [];
    group.forEach(sel => {
        items.forEach(it => {
            if (matches(it.el, sel) && members.indexOf(it) < 0) members.push(it);
        });
    });
    if (members.length === 0) return null;
    members.sort((a, b) => (a.A - b.A) || (a.top - b.top));

    const first = members[0];

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
    const tr = clamp(top + h / 2 - anchorYOf(first.el, h), 0, pageMaxScroll());
    const hit = tr + L;

    /* ---- 把这组的包络重串到 hit 上 ----
       A = hit → 淡入 → 停留 → 淡出 = E → 加一点间隔 → 下一段的 A ……
       时长仍然取 0.1 那套（timingOf），所以这里不引入任何新的“秒数”。 */
    const rate = playbackRate();
    let cursor = hit;
    members.forEach((it, i) => {
        const t = timingOf(it.el);
        if (i > 0) cursor += GAP_SECONDS * rate;
        it.A = cursor;
        it.H = it.A + t.fadeIn * rate;
        it.B = it.H + t.hold * rate;
        it.E = it.B + t.fadeOut * rate;
        cursor = it.E;
    });
    const last = members[members.length - 1];

    /* 让整段至少占 FREEZE_MIN_SECONDS 的真实秒数，免得锁一瞬间就弹开 */
    const z1 = Math.max(last.E, hit + FREEZE_MIN_SECONDS * rate);

    return {
        hit, tr, z1, group, members,
        /* 撞线判定的上膛状态：建区时先关掉，由 syncZoneArmsNow() 按页面此刻位置初始化 */
        armDown: false,
        armUp: false
    };
}

/* 冻结组之后的时间轴重排。
   目标：
     · 冻结组【自己】按触发线摆好（包络已经由 buildOneZone 重串到 hit 上，这里不动它们）；
     · 除冻结组以外的【所有】文字都回到作者在 1.css 里写的静态位置，也就是普通的
       “滚到自己 CSS 位置就出场”；允许个别文字在时间上重叠。
   ★ 这里不做“整体前移/后移”的推算：任何推算都会引入组内跨度与页面行程之间的差，越推越乱。
   ★ 唯一例外：如果某一段按静态位置排下来，结束点（E）会超过页面能滚到的最远进度，
     那它就永远演不完、会一直停在画面上。这种段（本页只有最后一段 text-31）往前收一点，
     正好在滚到底时结束。 */
function relaxNonFrozenToAuthored(skippedEls) {
    /* 页面最远端对应的进度：任何一段的 E 超过它，就等于“永远演不完、停在画面上不消失”。 */
    const reach = progressLimit();

    items.forEach(it => {
        if (skippedEls.has(it.el)) return;      // 冻结组：保持 buildOneZone 里串好的包络

        /* 非冻结：A 直接回到作者写的位置；
           只有“这一段会被顶出页面末端”的那一两段才往前收，正好在滚到底时结束。 */
        const span = it.E - it.A;
        const targetA = Math.max(0, Math.min(it.top0, reach - span));
        const shift = targetA - it.A;

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

/* “点右下角箭头 → 自动下拉到视频下方”正在进行中。
   ★ 这段时间页面位置由 tick 平滑推进（见 scrollPastTopVideo），
     所以 scroll 监听里要【只重绘、不回写 cur / target】，
     否则滚动事件会把 target 拉回“当前页位置”，动画半路就停住。 */
let autoScroll = false;

/* 冻结动效自己的进度（滚轮驱动）。
   它和 cur（页面进度）分开：冻结期间页面不动，cur 就停在触发线上。
   往下滑它在 [hit, z1] 里往前走，往上滑往回退 —— 淡入/淡出是同一条包络，
   所以往前就是 4→5→6，往回就是 6→5→4。 */
let freezePos = 0;

/* 倒放是否已经“上膛”：把滚轮从往下改成往上的那一刻才置位，
   放完一次就清掉 —— 这样一路往上滑不会在触发线附近反复重播（6>5>4 无限循环）。 */
let wantReverse = false;

/* 滚轮往哪边推：+1 = 往下、-1 = 往上、0 = 还没动。
   ★ 撞线时用它决定正放还是倒放；解冻时也用它决定“往哪一端算放完”：
     正放时改成往上滑、或倒放时改成往下滑，都会顺着新方向走到另一端就收尾，
     于是滚轮中途掉头也不会卡在冻结状态里出不来。 */
let dirState = 0;
let lastDir = 0;

/* ==========================================================================
   撞线判定：为什么不再用“上一帧 vs 这一帧”的跨越判定
   --------------------------------------------------------------------------
   老做法是比 prevPageY（上一帧读到的 scrollY）和这一帧的 scrollY：
       crossedDown = prevPageY < tr - ARRIVE_TOL && pageY >= tr - ARRIVE_TOL
   它有两个会漏掉触发的硬伤，都是“滑过检出位置却没有文字跳出来”的原因：

   ① 页面停进容差带里就永久失效。
      页面是靠 cur 追 target 才动的，滚轮一停手就停在任意位置。
      只要那一停正好落在 (tr-ARRIVE_TOL, tr] 这条带里，
      下一帧的“上一帧位置”就已经在带内了，跨越条件再也不会成立 ——
      这一组要等用户【往上滑回带外再滑下来】才会重新触发，正常下滑永远错过它。
      而滚轮一格只走几像素，停进这条带里的机会相当高。

   ② 判的组和页面所在的位置对不上。
      老代码用 zoneForProgress(target) 挑“这一帧判哪一组”。target 是滚轮提前量，
      领先真实页面位置几十到几百像素，于是页面正在过第一组的线时，
      挑出来的却是后面某一组 —— 第一组根本没人判它，一组都过不去还会越滚越偏。

   现在的做法：每帧按【页面真实位置】给每一组刷新一次“上膛”状态，再逐组判定 ——
     armDown : 页面到过线的【上方】（< tr - ARRIVE_TOL）→ 往下滑到线时正放；
     armUp   : 页面到过线的【下方】（> tr + ARRIVE_TOL）→ 往上滑到线时倒放。
   ★ 上膛是【保持】的：到过线外就一直有效，页面停在带里、一帧跳很远都不影响；
     开演时清零 → 同一趟里不会原地重播；往上滑回线外会重新上膛 → 可以再演一遍。
   ★ 判定用 window.scrollY（页面此刻的真实位置），不用 target。
   ========================================================================== */

/* 每帧刷新上膛状态：只在“到过线外”时置位，不会自己掉；清零只发生在开演时 */
function updateZoneArms(pageY) {
    frozenZones.forEach(z => {
        if (pageY < z.tr - ARRIVE_TOL) z.armDown = true;
        if (pageY > z.tr + ARRIVE_TOL) z.armUp = true;
    });
}

/* 按“页面此刻停在哪”重建上膛状态（初始化 / resize 用）：
   停在半路刷新时只装上还没经过的那几组，已经过去的那几组不会被重新触发。 */
function syncZoneArmsNow() {
    const pageY = clamp(window.scrollY, 0, pageMaxScroll());
    frozenZones.forEach(z => {
        z.armDown = pageY < z.tr - ARRIVE_TOL;
        z.armUp = pageY > z.tr + ARRIVE_TOL;
    });
}

/* 这一帧有没有该开演的组：有就返回 { zone, dir }（dir = +1 正放 / -1 倒放）。
   ★ 逐组判定，不再只挑一组：页面走到哪一组的线，那一组就一定被看到。 */
function zoneToStart(pageY) {
    if (!freezeArmed || frozenZones.length === 0) return null;

    /* 正放（往下滑）：取最靠前的“已上膛 + 页面已到线”的一组 */
    if (dirState > 0) {
        for (let i = 0; i < frozenZones.length; i++) {
            const z = frozenZones[i];
            if (!z.armDown) continue;
            if (pageY < z.tr - ARRIVE_TOL) continue;        // 还没到线
            if (pageY > z.tr + FREEZE_CATCHUP) continue;    // 被外部一把拽过去了，不往回拽
            return { zone: z, dir: 1 };
        }
    }

    /* 倒放（往上滑）：每“换一次方向”只放一遍（wantReverse 在方向变化时置位、用掉即清），
       否则一路往上滑会在触发线附近无限重播。 */
    if (wantReverse && dirState < 0) {
        for (let i = frozenZones.length - 1; i >= 0; i--) {
            const z = frozenZones[i];
            if (!z.armUp) continue;
            if (pageY > z.tr + ARRIVE_TOL) continue;        // 还没回到线
            if (pageY < z.tr - FREEZE_CATCHUP) continue;
            return { zone: z, dir: -1 };
        }
    }

    return null;
}

/* 滚轮 / 触摸真正收到输入的信号：允许下一次撞线时上锁 */
function armFreeze() {
    freezeArmed = true;
}

/* 显示用的冻结判断（只在真的锁着、且进度还在动效区间里时成立） */
const freezeLatched = () => freezeActive && inFrozenZone();

/* 重置“驱动输入”状态（初始化 / resize 用：这些都不是滚轮驱动）
   ★ 这里绝不能碰 freezeActive：
     初始化的 window load 事件会晚到，正好在播放中途打进来，
     要是把它清掉，正在播的那一段会被掐断、页面当场跳到 z1 对应的位置。
     freezeActive 只由 updateFreeze 按播放进度收尾。 */
function resetFreeze() {
    freezeArmed = false;
    frozenAt = 0;
    autoScroll = false;        /* 箭头下拉的自动滚动也一并作废（改尺寸后落点会变） */
    /* 上膛状态按页面此刻位置重算，免得上一次留下的旧值造成误触发 */
    syncZoneArmsNow();
}

/* 解冻后进度回到触发线；但如果这条线上还压着别的普通文字（它的窗口跨过这条线，
   冻结期间被收了起来），就把进度直接推过它们 —— 不跳过的话解冻后会闪一下。
   ★ 正常情况下一段都不会命中（每组的线都落在两段之间），所以这里返回的就是 z.hit。 */
function resumeProgressAfter(z) {
    let p = z.hit;
    items.forEach(it => {
        if (it.freezeZone) return;          // 冻结组自己的时间轴不占页面行程
        if (it.A < z.hit && it.E > z.hit) p = Math.max(p, it.E);
    });
    return clamp(p, 0, maxProgress());
}

/* ---- 每帧定阶段：普通滚动 / 冻结播放 ----
   返回 true = 这一帧页面钉死在触发线上，冻结区的文字由滚轮驱动。
   ★ 这里只负责“开始 / 结束”，推进由滚轮（addTarget）和 tick 一起完成。 */
function updateFreeze() {
    /* 页面此刻的真实位置：撞线判定只看它，不看 target（滚轮提前量） */
    const pageY = clamp(window.scrollY, 0, pageMaxScroll());

    /* 先刷新上膛状态：这一帧是“往下滑到线”还是“往上滑回线”都要用 */
    updateZoneArms(pageY);

    /* 滚轮方向变了 = 重新来一趟：只有“改成往上滑”这一下才允许倒放 */
    if (dirState !== lastDir) {
        lastDir = dirState;
        wantReverse = (dirState < 0);
    }

    /* ---- 正在播放：只看滚轮往哪一端推 ----
       往下滑推到 z1 → 这一组放完；往上滑退回 hit → 这一组倒放完。
       ★ 解冻位置一律回到触发线：冻结那几段文字的演出【不消耗页面行程】，
         所以页面必须还停在冻结时那一屏（frozenAt），不欠账、不跳转。
       ★ 倒回 hit 才解冻的，说明这一组其实没演过 → 重新上膛，往下滑还能再看一次；
         正放到 z1 的不再上膛（同一趟里不重播，要重播得先往上滑回线外）。 */
    if (freezeActive) {
        const z = frozenZone;
        if (!z) {
            freezeActive = false;
            return false;
        }

        const rewound = freezePos <= z.hit + 1e-6;
        const played = freezePos >= z.z1 - 1e-6;
        const done = dirState < 0 ? rewound : played;

        if (done) {
            freezeActive = false;
            cur = target = rewound ? clamp(z.hit, 0, maxProgress()) : resumeProgressAfter(z);
            if (rewound) z.armDown = true;
            return false;
        }
        return true;
    }

    /* ---- 撞线进入：逐组判定，页面走到哪一组的线，那一组就开演 ---- */
    const pick = zoneToStart(pageY);
    if (pick) {
        const z = pick.zone;
        frozenZone = z;
        /* ★ 锁定位置 = 这一组 CSS top 对应的那一屏（z.tr）。
           上膛判据保证了页面此刻就在 z.tr 附近（最多差一帧的滚动量），
           所以对齐到 z.tr 只有几像素的位移，看不出来；
           但换来的好处是：这一组一定在【CSS 指定的位置】开演、文字精确落在 40% 锚线上。
           ★ cur / target 一起设成 z.hit：进度与页面位置保持一致，
             冻结期间 pageTopFor 会把它钉在 frozenAt 上。
           ★ 播放头按方向取起点：
             正放从触发线开始（组内第一段刚要淡入）；
             倒放从区段结尾开始，保证是从最后一段往回演。 */
        frozenAt = freezePoint(z);
        cur = target = z.hit;
        freezeActive = true;
        freezePos = pick.dir > 0 ? z.hit : z.z1;
        z.armDown = false;                        // 上膛用掉了：要再演一次得先滑回线外
        z.armUp = false;
        if (pick.dir < 0) wantReverse = false;    // 这一次倒放用掉了
        startLoop();
        return true;
    }

    /* 没在冻结：把 frozenZone 挂在“进度当前所在的那一组”，
       供 render（body.frozen-scroll）和滚动事件里那条兜底判断用。 */
    frozenZone = zoneForProgress(cur);
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

    const arrivals = measured.map(m => introNominal + m.top + m.h / 2 - anchorYOf(m.el, m.h));
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

    frozenZones.sort((a, b) => a.hit - b.hit);
    frozenZone = frozenZones[0] || null;

    /* 上膛状态按“页面此刻停在哪”初始化：
       刷新 / 从链接进来停在半路时，只装上还没经过的那几组。 */
    syncZoneArmsNow();

    /* 把所有非冻结文字放回作者写的静态位置（冻结组自己不动） */
    relaxNonFrozenToAuthored(skippedEls);

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

    const endP = items.reduce((m, it) => (it.skipFrozen ? m : Math.max(m, it.E)), 0);
    console.info(
        `[home] 组件 ${items.length} 个 | 播放速度 ${WHEEL_SPEED} → ${(WHEEL_SPEED * fitScale).toFixed(4)}` +
        `（自适应 ×${fitScale.toFixed(3)}，滚轮需多滚 ${(1 / fitScale).toFixed(2)} 倍）| ` +
        `时间轴 ${Math.round(endP)} / 可用 ${Math.round(limit)} | 整页约 ${rate > 0 ? (limit / rate).toFixed(0) : "∞"}s | ` +
        `到达点前移 ${pulledCount} 个 | ` +
        (frozenZones.length === 0
            ? `冻结区 无`
            : `冻结区 ${frozenZones.length} 组｜` +
              frozenZones
                  .map((z, k) => `#${k} 线 ${Math.round(z.tr)}px` +
                      `（进度 ${Math.round(z.hit)}→${Math.round(z.z1)}，跨 ${Math.round(z.z1 - z.hit)}）`)
                  .join(` ｜ `))
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

        /* ---- 冻结期间这一组独占画面 ----
           所有文字都钉在同一条锚线上（见 pinDy），所以别的文字只要还在自己的窗口里，
           就会和正在演的这一组叠在一起（字压字）。冻结时先把它们收起来；
           被收起来的段落会在解冻时一并跳过（见 resumeProgressAfter），
           免得解冻之后又闪一下。 */
        if (freezeActive && it.freezeZone !== frozenZone) {
            el.style.visibility = "hidden";
            el.style.opacity = "";
            el.style.transform = "none";
            return;
        }

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
        const dy = pinDy(el, sa, h, top);

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
        const useDy = frozenHere ? pinDy(el, clamp(frozenAt, 0, pageMaxScroll()), h, top) : dy;

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

    /* 先定这一帧的阶段：普通滚动（滚轮驱动），还是冻结播放（滚轮推动文字） */
    updateFreeze();

    if (freezeActive) {
        /* ---- 冻结播放：页面一步不走，进度也不推进 ----
           ★ 冻结这几段文字和页面滚动【完全解耦】：
             cur 停在触发线上（页面因此钉在 frozenAt 一点不动），
             文字进度走 freezePos，由滚轮直接驱动（见 addTarget）。
             滚轮停手文字就停在当前状态（该停留的停留）。
           ★ 这一组演完【不消耗页面行程】：解冻时 cur / target 只是回到触发线
             （见 updateFreeze 的出口），页面还是原来那一屏，不会跳、也不欠账。
             后续文字都按作者写的静态位置出场（见 relaxNonFrozenToAuthored），
             所以继续滚就是普通的出场方式。 */
    } else {
        const k = 1 - Math.pow(1 - SMOOTHING, dt / 16.67);
        cur += (target - cur) * k;

        if (Math.abs(target - cur) < 0.1) cur = target;

        /* 箭头下拉到位（或用户中途用滚轮改了目标、已经走到）就解除锁定，
           之后滚动事件恢复正常的“按位置回写进度”兜底。 */
        if (autoScroll && Math.abs(target - cur) < 0.5) autoScroll = false;
    }

    /* 冻结时页面钉在触发线上（一点不动）；其余情况走普通映射 */
    /* ★★★ left: 0 必须写，这是“刷新后整页左移、右边空出一条、看起来像被宝剑进度条占了”
       这个毛病的【第二道】保险。原因链条（三个文件合起来才成立，缺一条都不会犯）：
         ① 页面确实存在【横向可滚动区域】：2.css 里 .bg-video-wrap-falls-1 用了
            right: -10%，那个绝对定位的背景视频右边缘伸到页面右边界外面 10% 页宽，
            于是 scrollWidth = clientWidth + 0.1 × 页宽（1440 宽时约 144px）。
            （另一条更大的来源见 4.js 的 PEAK_DESIGN_PX：以前写死 304px，窄屏能撑到 1300+。）
         ② overflow-x: hidden（1.css 的 body）只让【用户】滚不动，按规范
            “可滚动区域”还在：浏览器自己仍然能把它滚走 —— 滚动位置恢复、焦点进视口、
            页面内查找、以及某些 UA 对超出视口的元素做对齐，都会写 scrollLeft。
         ③ 这里以前只写 top：按 CSSOM 规范，scrollTo 里没给的 left 会【保留当前值】，
            所以一旦横向被别人滚歪过一次，之后每帧都只是“保持歪着”。
            结果：底图（body 背景，background-position-x 固定为 0）和所有按 % 定位的
            文字一起左移，右侧露出白边；而宝剑是 position: fixed，不跟着文档滚，
            仍然稳稳贴在视口右边缘 —— 看上去就是“进度条占了页面右边那条宽度”。
       把 left 钉成 0：横向偏移每帧都被拉回，刷新恢复过来的旧偏移也会在下一帧消失。
       纵向一点没变（top 还是 pageTopFor(cur)），不牵动任何其他效果。
       ★★★ 根治不在这里：1.css 里那段 @supports (overflow: clip) 直接把【可滚动区域】
       清零了（clip 不产生滚动容器 ⇒ scrollLeft 永远写不进去）。这里只是第二道保险，
       所以留着它，别删。 */
    window.scrollTo({ left: 0, top: pageTopFor(cur), behavior: "instant" });
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

/* 空白段速度倍率：p 处离“最近的有字地方”越远，倍率越高（最高 GAP_SPEED_BOOST）。
   “有字的地方” = 任一段【随页面滚动】的文字的 [A, E] 区间，或任一条冻结触发线。
   ★ 冻结组的 [A, E] 不算（用 it.skipFrozen 排掉）：它们的演出不占页面行程、
     只在冻结时绘制，把它们算进来会让“刚解冻之后”那一大段空白完全不加成。
   ★ 触发线也算：于是快接近冻结点时速度已经回到 1 倍，
     页面不会以 2 倍速冲到线上（锁定位置就不用往回拽了）。 */
function gapSpeedFactor(p) {
    if (GAP_SPEED_BOOST <= 1 || items.length === 0) return 1;

    let d = Infinity;                          // 到最近“有字的地方”的距离
    items.forEach(it => {
        if (it.skipFrozen) return;             // 冻结组：窗口是虚拟的，不算
        if (p > it.A && p < it.E) d = 0;       // 正落在某段文字身上 → 原速
        else d = Math.min(d, p <= it.A ? it.A - p : p - it.E);
    });
    frozenZones.forEach(z => { d = Math.min(d, Math.abs(p - z.hit)); });

    if (d === Infinity) return GAP_SPEED_BOOST;
    const t = clamp(d / Math.max(1e-6, GAP_SPEED_EASE));
    return 1 + (GAP_SPEED_BOOST - 1) * t;
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
         页面因此钉在 frozenAt 上，解冻后也从这一屏继续（不欠账、不跳转）。
         如果这里还累加 target，解冻那一帧页面会朝着远处的 target 猛冲。
       FREEZE_WHEEL_RATE：滚轮 → 文字进度的倍率（见文件头部）。
       ★ 正放和倒放用同一个倍率 —— 两边的手感必须一致。 */
    if (freezeActive && frozenZone) {
        freezePos = clamp(freezePos + delta * FREEZE_WHEEL_RATE, frozenZone.hit, frozenZone.z1);
        startLoop();
        return;
    }

    /* 空白段加速：滚轮一格在空白区间里走 GAP_SPEED_BOOST 倍远，有字的地方仍是 1 倍。
       ★ 顺序上乘在 zoneSpeedFactor（SLOW_ZONES，默认空）之后，两者互不影响。 */
    const speed = zoneSpeedFactor(target) * gapSpeedFactor(target);
    target = clamp(target + delta * speed, 0, maxProgress());
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
            freezePos = clamp(freezePos + d * TOUCH_SPEED * fitScale * inputScale, frozenZone.hit, frozenZone.z1);
            startLoop();
        } else {
            armFreeze();
            addTarget(d * TOUCH_SPEED * fitScale * inputScale);
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
    const step = KEY_STEP * fitScale * inputScale;

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
    /* ★ 横向兜底归零（见 tick 里那段说明）：只要发现横向被滚走了就立刻拉回 0。
       只在真的不为 0 时才动手，所以不会和页面自己的滚动互相打架；
       刷新后浏览器把上次的横向偏移恢复回来时，也是靠这一下当场修正。 */
    if (window.scrollX) {          /* 0 / undefined 都不动，只有真的歪了才修 */
        window.scrollTo({ left: 0, top: window.scrollY, behavior: "instant" });
    }

    /* 冻结播放期间页面位置是我们自己钉死的常量，进度也是时间驱动的：
       绝不能让浏览器的滚动事件反过来改进度，否则这段会被打乱。 */
    if (freezeActive) {
        render();
        return;
    }

    /* 点箭头自动下拉期间（见 scrollPastTopVideo）：位置是 tick 自己推的，
       这里只重绘，绝不能用滚动事件回写 cur / target —— 否则动画会被拉回当前位置、半路停住。 */
    if (autoScroll) {
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
    document.body.style.backgroundImage = `url("${BG_URL}")`;
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

        /* ★ 刷新 / 从链接进来时，浏览器会把上次的滚动位置一起恢复回来（横向也算）：
           这里先归零一次 —— 只动横向，纵向保持原样，所以不会把人从半路弹回顶部。
           （之后由 tick 每帧、以及 scroll 监听里的兜底持续保证横向为 0。） */
        window.scrollTo({ left: 0, top: window.scrollY, behavior: "instant" });

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
    /* 底图拿不到（断网 / 被拦截 / 路径写错）时页面会完全空白：
       body 高度是 0、文字全是 visibility:hidden —— 至少先在控制台喊一声。 */
    console.error("底图加载失败，请检查路径：", bgImg.src);
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
    /* 输入倍率：5.js 在手机断点里调成 5（同样的滑动距离，页面走 5 倍远），
       切回桌面时它会再设回 1。★ 只影响“输入 → 进度”，不动时间轴。 */
    setInputScale(v) {
        const n = Number(v);
        inputScale = isFinite(n) && n > 0 ? n : 1;
        return inputScale;
    },
    get inputScale() { return inputScale; },
    layout,
    render
};

/* ============================ 10. 页面顶部的视频（title.mp4：播一遍 → 定格最后一帧 → 点播放键重播） ============================ */
/* 位置：页面最顶端、和页面等宽；底图（map.png）从视频下沿开始，视频不盖住底图。
   怎么做到“底图接在视频下面”且不错位：
      用 2.css 现成的“引导段”变量 --lead-in（= 视频高度）把【底图 + 文字 + 图片 +
      2.js 的人物视频与轨迹点】一起下移一个视频的高度。它本来就是为这件事写的：
      底图挪 background-position，其余元素挪 margin-top / top，所以谁和谁的相对位置都
      不变（2.js 读到的轨迹点 y 也会跟着含进这段偏移，坐标参照系仍然一致）。
   ★ 不要改成给 body 加 margin-top：那不会改 2.js 读到的 offsetTop / 点盒子 top，
      人物会整体偏掉一个视频高度。
   ★ 视频和整块容器都是 pointer-events: none（见 1.css）：
      这一页是纯滚轮驱动的（2.css 里 .bg-video-wrap 一直 pointer-events: none 也是这个原因），
      所以【播放过程中随时可以下滑】，视频绝不会拦住滚轮；
      只有左下角的播放三角和右下角的提示箭头是可点的。
   交互：
      加载：自动从头播放一遍（title.mp4 没有音轨，且已设 muted=true，浏览器才会放行；
            首帧是白场，不自动播的话顶部会一直空着）；自动播放被拦时退回“显示播放按钮”。
      播完：ended 里只摘掉 .is-playing，不 seek、不重置、不隐藏 video ——
            画面就停在最后一帧，左下角的播放三角重新出现；
            同时给 wrap 加 .is-ended → 视频右下角常驻“向下滑”提示箭头
            （.top-video-scroll-hint，颜色 465E77，跟着视频本体的相对位置走，见 1.css）；
      再点：currentTime 归零，先摘掉 .is-ended（右下角箭头消失），从头再播一遍；
            这一遍 ended 时箭头又回来 —— 也就是“重播时消失、播完再出现”。
      点右下角箭头：页面下拉到“视频底部贴住视口顶部”（scrollPastTopVideo，落点 = 视频高度）。
   想换成原生控件（暂停 / 音量 / 进度 / 全屏）：把 1.css 里 .top-video-media 的
   pointer-events 改成 auto，代价是鼠标停在视频区域时滚轮不再驱动页面。
   以后换成有音轨的素材、想让声音外放：把下面 topVideo.muted 改成 false（自动播放可能被拦）。 */
const TOP_VIDEO_SRC = "./title.mp4";

const topVideoWrap = document.createElement("div");
topVideoWrap.className = "top-video-wrap";

const topVideo = document.createElement("video");
topVideo.className = "top-video-media";
/* ★ 先静音：Chrome / Safari 只放行“静音素材”的自动播放。
   title.mp4 本来就没有音轨（ffmpeg 里只有 video + tmcd），所以 muted 不会丢声音；
   以后换成有音轨的素材、又想自动播放时，把这里改成 false 的代价是可能被浏览器拦。 */
topVideo.muted = true;
topVideo.defaultMuted = true;
topVideo.setAttribute("muted", "");
topVideo.src = TOP_VIDEO_SRC;
topVideo.preload = "auto";          /* 预取数据：初始画面直接是第一帧，不用再挂封面图 */
topVideo.playsInline = true;        /* iOS 上不要一播就强制全屏 */
topVideo.setAttribute("playsinline", "");
topVideo.setAttribute("webkit-playsinline", "");
topVideo.controls = false;          /* 不要原生控件条：它会拦滚轮，这里也只需要“播一遍” */
topVideo.loop = false;              /* ★ 不循环：播完停在最后一帧 */
topVideo.setAttribute("disablepictureinpicture", "");
topVideo.setAttribute("aria-label", "Sting 标题动画");
topVideo.addEventListener("error", () => {
    console.error("顶部视频加载失败，请检查文件是否存在：", TOP_VIDEO_SRC);
});

const topVideoPlay = document.createElement("button");
topVideoPlay.type = "button";
topVideoPlay.className = "top-video-play";
topVideoPlay.setAttribute("aria-label", "播放视频");
topVideoPlay.innerHTML = '<span class="top-video-play-icon"></span>';   /* 侧三角形，颜色见 1.css（#465E77） */

/* 播完一遍后常驻在视频右下角的“向下滑”提示箭头（可点：点一下跳到视频下方）。
   ★ 挂在 topVideoWrap 里面（不是 body、也不是 fixed）：它跟着视频本体走，
     视频滚上去它就一起滚上去，相对位置永远是“视频右下角”。
   ★ 显隐只靠 wrap 上的 .is-ended（1.css）：ended 时加 → 常驻；点播放键重播时摘掉 → 消失，再播完再出现。
   ★ 用 <button>：没出现时 visibility: hidden + pointer-events: none（点不到），
     出现后可点，点击 = scrollPastTopVideo()（把页面拉到视频底部）。 */
const topVideoHint = document.createElement("button");
topVideoHint.type = "button";
topVideoHint.className = "top-video-scroll-hint";
topVideoHint.setAttribute("aria-label", "向下滑动，跳到视频下方");
topVideoHint.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M12 3v15" /><path d="M5 12.5 12 19.5 19 12.5" />' +
    "</svg>";

topVideoWrap.appendChild(topVideo);
topVideoWrap.appendChild(topVideoPlay);
topVideoWrap.appendChild(topVideoHint);
document.body.appendChild(topVideoWrap);

/* 视频高度 = 页面宽度 × 9/16（title.mp4 是 1280×720），并用 2.css 的“引导段”变量 --lead-in
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

/* 手动播放（自动播放被拦时点播放键 / 播完定格后再点重播）：每次都从头完整播一遍。
   —— 还没播过：currentTime 本来就是 0；
   —— 播完定格后：ended 时 currentTime == duration，先归零再播。 */
function playTopVideo() {
    if (topVideo.ended || (topVideo.duration && topVideo.currentTime >= topVideo.duration - 0.05)) {
        topVideo.currentTime = 0;
    }

    /* 用户选择重播 → 右下角的“向下滑”箭头立刻退场：
       这一遍还没播完，箭头不该还挂着；播完时 ended 会再把它放回来。 */
    topVideoWrap.classList.remove("is-ended");

    topVideoWrap.classList.add("is-playing");   /* 播放中藏起播放按钮（CSS） */

    const p = topVideo.play();
    if (p && typeof p.catch === "function") {
        p.catch(err => {
            /* 播放被浏览器拦下（极少见：这里是点击手势）：退回“按钮可见”的状态，别让视频卡死 */
            topVideoWrap.classList.remove("is-playing");
            console.warn("顶部视频播放失败：", err);
        });
    }
}

/* 点右下角箭头：把页面下拉到“视频底部贴住视口顶部”的那一屏 ——
   也就是 --lead-in 这条线、底图开始的地方（落点 = 视频高度 = topVideoWrap.offsetHeight）。
   ★ 走本页自己的滚动机制（设 target，让 tick 平滑推进），不直接 window.scrollTo：
     否则会和 tick 里每帧的 scrollTo 打架，滚动事件也会把进度打乱。
   ★ 这不是滚轮输入：先关掉 freezeArmed，免得半路越过冻结组的触发线被意外锁住
     （和“刷新 / 从链接进入”是同一套处理）；autoScroll 期间滚动事件只重绘不回写。
   ★ 只往下、不往上：箭头能点到的时候，视频底部一定还在视口下方。 */
function scrollPastTopVideo() {
    freezeArmed = false;

    const videoBottom = topVideoWrap.offsetTop + topVideoWrap.offsetHeight;
    const dest = Math.min(Math.max(window.scrollY, videoBottom), pageMaxScroll());

    autoScroll = true;
    /* 普通映射下 页面位置 = 进度 - introLen()，所以落点的进度 = dest + introLen() */
    target = clamp(introLen() + dest, 0, maxProgress());
    startLoop();
}

/* 页面加载后自动播一遍（标题动画，首帧白场，需要自己动起来）。
   ★ 视频已设 muted=true（title.mp4 没有音轨），Chrome / Safari / Firefox 才允许自动播放。
   ★ 万一被拦（低电量模式 / 严格的自动播放策略）：play() reject → 摘掉 .is-playing，
     播放按钮直接露出来，点一下就能播，不会卡在空白上。 */
function autoplayTopVideo() {
    topVideoWrap.classList.add("is-playing");

    const p = topVideo.play();
    if (p && typeof p.catch === "function") {
        p.catch(err => {
            topVideoWrap.classList.remove("is-playing");
            console.warn("顶部视频自动播放被拦下，已退回播放按钮：", err);
        });
    }
}

/* 播完：什么都不做，画面保持最后一帧（不 seek、不清空 src、不隐藏），
   只把播放按钮放回来 —— 再点就是重播。
   ★ 同时给 wrap 加 .is-ended：右下角的“向下滑”提示箭头由此常驻（1.css 控制显隐）。
     它跟视频本体在同一个容器里，所以永远贴着视频右下角，不随页面脱离视频。 */
topVideo.addEventListener("ended", () => {
    topVideoWrap.classList.remove("is-playing");
    topVideoWrap.classList.add("is-ended");
    topVideoPlay.setAttribute("aria-label", "重新播放视频");
    topVideoPlay.title = "重新播放";
});

topVideoPlay.addEventListener("click", playTopVideo);

/* 右下角箭头：点一下 = 下拉到视频下方（底图顶部对齐视口顶部） */
topVideoHint.addEventListener("click", scrollPastTopVideo);

/* 所有监听都挂好后再自动开播，避免片头刚播完那一下没有 ended 收尾 */
autoplayTopVideo();

/* ============================ 11. 右侧宝剑进度条 ============================
   仿照 description 页的那套装饰（description.css 第 7 节 + description.js
   第 3 / 7 节）搬过来，并按需求【去掉了剑鞘】：

     · 宝剑自己 = 滑块：页面往下滚，剑从「0.5 个剑长」滑到「4 个剑长」
       （= 行程 3.5 个剑长），滑到底正好是页面底部；往上滚就倒着滑。
       （原页面是“剑 = 轨道、剑鞘 = 滑块”，现在只剩宝剑，就让它自己走。）
     · 剑旁的文字：TOP（原来是 BACK TO TOP），点它回页面顶部。
     · 颜色：原来的绿色荧光 #1d9695 字 / 绿色 drop-shadow 换成
       字色 #465E77（正文色）+ hover 泛光 #95c3f1。
     · 剑的素材：https://static.igem.wiki/teams/6059/wiki/home/sword.avif

   互动（都挂在这一把剑上）：
     · 按住剑上下拖 = 拖页面：鼠标走过的距离正好等于剑走过的距离（1px 换 1px）；
     · 点剑身（没拖动过）= 跳到对应进度，算法与 description 页一致
       （剑身上沿 20% 以下那段算有效行程，点得越靠下跳得越靠后）；
     · 点 TOP = 平滑回到页面顶部。
   为了区分“点”和“拖”，按下后先不动页面，鼠标移动超过 DRAG_THRESHOLD 才算拖。

   元素由本段动态创建（index.html 不用改）：
       <div class="scroll-sword-wrap" id="scrollSwordWrap">               容器（唯一 fixed）
           <img class="scroll-sword" id="scrollSword">                    宝剑（滑块）
           <div class="scroll-back-to-top" id="scrollBackToTop">TOP</div> 回到顶部
       </div>
   ★ 本段只给【容器】写 top；剑与 TOP 之间的相对位置全交给 1.css 第 11 节
     （TOP 用 --top-label-x / --top-label-y 相对容器定位），本段不再给 TOP 算坐标。

   ★ 本页的滚动位置是 tick() 每帧自己 scrollTo 出来的（见第 8 节），
     直接改滚动位置会被下一帧覆盖，所以拖动 / 点击都走本页自己的通道
     （和点视频右下角那个箭头一样）：
         autoScroll = true;  target = 目标进度;  startLoop();
     autoScroll 期间滚动事件只重绘、不回写进度，页面就会平滑地滚过去。

   ★ 进度区间（和原页面一一对应）：
     原页面拿主卡片 .main-container 的顶边当“轨道起点”；
     这一页没有卡片，就用【顶部视频的下沿】（= 底图与全部内容的顶端）当起点：
       页面滚到 startScroll = 内容顶端 - 剑的起点 时，剑正好滑到起点（= 0.5 个剑长）；
       之后剑从起点走到终点（= 4 个剑长），走完 = 页面底部。
     起点之前（还在看标题视频）剑跟着内容顶端一起往上滑进视口，
     和原页面“卡片还没到起点时剑跟着卡片顶边走”完全一样。

   想调剑的大小 / 位置：只改 1.css 第 11 节的四个变量
   （剑长 --sword-height / 起点倍数 --sword-start-ratio /
     行程倍数 --sword-travel-ratio / 往右推多少 --sword-shift），
   本段会自动读，不用动这里的任何一行。
   ========================================================================== */
(function () {
    'use strict';

    /* ---- 11.1 素材与文字：想换图 / 改字只动这两行 ---- */
    const SWORD_SRC = 'https://static.igem.wiki/teams/6059/wiki/home/sword.avif';
    const LABEL_TEXT = 'TOP';

    /* 拖动判定阈值（px）：按下后鼠标移动超过它才算“拖”，否则松手就当“点”
       （手抖一两像素不会被当成拖动，点按依然能跳进度） */
    const DRAG_THRESHOLD = 4;

    /* 窄屏不显示（断点与 1.css 第 11.3 节、description 页的 820px 一致） */
    const narrowViewport = window.matchMedia('(max-width: 820px)');
    const isNarrow = () => narrowViewport.matches;

    /* ---- 11.2 造容器 + 两件元素（页面上已有同 id 的元素就复用它，不重复建）----
       结构：容器 .scroll-sword-wrap 里放剑和 TOP。
       ★ 容器是唯一“按滚动写 top”的东西；剑在容器里正常流动、TOP 相对容器绝对定位，
         两者之间的位置全由 CSS（--top-label-x / --top-label-y）控制，
         所以 TOP 天生跟着剑走，本段不用再给它算坐标。 */
    let wrap = document.getElementById('scrollSwordWrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'scrollSwordWrap';
        wrap.className = 'scroll-sword-wrap';
        document.body.appendChild(wrap);
    }

    const sword = document.getElementById('scrollSword') || (function () {
        const img = document.createElement('img');
        img.id = 'scrollSword';
        img.className = 'scroll-sword';
        img.src = SWORD_SRC;
        img.alt = 'Sword Scroll Thumb';
        img.setAttribute('aria-hidden', 'true');
        /* 浏览器默认的“拖图片”会和拖页面打架，直接关掉 */
        img.addEventListener('dragstart', (e) => e.preventDefault());
        return img;
    })();

    let label = document.getElementById('scrollBackToTop');
    if (!label) {
        label = document.createElement('div');
        label.id = 'scrollBackToTop';
        label.className = 'scroll-back-to-top';
        label.textContent = LABEL_TEXT;
        label.title = '回到顶部';
    }

    /* 剑和 TOP 都挂进容器（顺序即叠放顺序：剑在下、TOP 在上） */
    if (sword.parentNode !== wrap) wrap.appendChild(sword);
    if (label.parentNode !== wrap) wrap.appendChild(label);

    /* ---- 11.3 从 1.css 的 CSS 变量里读几何参数 ----
       ★ 约定（1.css 第 11 节）：整组的大小和位置 = 「剑长」的倍数，不再写 vh。
           --sword-height        剑长本身（CSS 里可以写 vh / min() / clamp() / calc()）
           --sword-start-ratio   进度 0%   时剑顶距视口顶 = 剑长 × 这个数
           --sword-travel-ratio  进度 100% 时剑顶再往下走 = 剑长 × 这个数
       所以这里【只量剑的实际渲染高度】，再乘这两个倍数：
         · 不解析 --sword-height，以后它在 CSS 里改成 min(20vh, 260px) 也能用；
         · JS 算的 top 和 CSS 用 calc() 算的初始 top 走同一个算式（剑长 × 倍数），
           所以剑一被 JS 接手不会"跳一下"；
         · 屏幕怎么变、是不是手机，只要剑长定了，整组的旅程就跟着等比缩放。
       ★ 兼容老写法：两个倍数没写时，仍然去读旧的 --sword-top-min / --sword-top-max
         （px / vh / vw / rem 都认）。 */
    function cssPx(el, prop, fallback) {
        const raw = cssRaw(el, prop);
        const m = /^(-?\d*\.?\d+)\s*(px|vh|vw|rem)?$/.exec(raw);
        if (!m) return fallback;

        const n = parseFloat(m[1]);
        if (!isFinite(n)) return fallback;

        if (m[2] === 'vh') return window.innerHeight * n / 100;
        if (m[2] === 'vw') return document.documentElement.clientWidth * n / 100;
        if (m[2] === 'rem') {
            const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            return n * rootFont;
        }
        return n;
    }

    /* 读自定义属性的原样字符串（算不出来 / 没写就是空字符串） */
    function cssRaw(el, prop) {
        try {
            return getComputedStyle(el).getPropertyValue(prop).trim();
        } catch (err) {
            return '';
        }
    }

    /* 纯数字变量（倍数）：只认 0.5 / 3.5 这种，没写或写错就返回 fallback */
    function cssNum(el, prop, fallback) {
        const m = /^(-?\d*\.?\d+)$/.exec(cssRaw(el, prop));
        if (!m) return fallback;
        const n = parseFloat(m[1]);
        return isFinite(n) ? n : fallback;
    }

    /* 剑多长（px）：直接量渲染高度 —— 唯一的"真实尺寸"来源。
       图片还没加载完 / 断点刚切过来量出来可能是 0，就用 CSS 声明的值兜底。 */
    function swordHeightPx() {
        const rect = sword.getBoundingClientRect();
        if (rect.height > 0) return rect.height;
        return cssPx(wrap, '--sword-height', window.innerHeight * 0.20);
    }

    /* geo.swordTopMin / swordTopMax 就是"进度 0% / 100% 时剑顶的 top（px）" */
    const geo = { swordHeight: 0, swordTopMin: 0, swordTopMax: 0 };

    function readGeometry() {
        const h = swordHeightPx();
        geo.swordHeight = h;

        const startRatio = cssNum(wrap, '--sword-start-ratio', NaN);
        const travelRatio = cssNum(wrap, '--sword-travel-ratio', NaN);

        if (isFinite(startRatio) && isFinite(travelRatio)) {
            /* 新写法（1.css 第 11 节当前用的）：位置 = 剑长的倍数 */
            geo.swordTopMin = h * startRatio;
            geo.swordTopMax = geo.swordTopMin + h * travelRatio;
        } else {
            /* 老写法兼容：CSS 直接给了 --sword-top-min / --sword-top-max */
            geo.swordTopMin = cssPx(wrap, '--sword-top-min', h * 0.5);
            geo.swordTopMax = cssPx(wrap, '--sword-top-max', geo.swordTopMin + h * 3.5);
        }

        /* 终点必须在起点下面；写反了 / 写成相等的，就退回"3.5 个剑长"的行程 */
        if (!(geo.swordTopMax > geo.swordTopMin)) {
            geo.swordTopMax = geo.swordTopMin + h * 3.5;
        }
    }

    /* “轨道起点”：顶部视频的下沿（底图 / 全部内容的顶端）。
       以后换掉或删掉顶部视频也不用改这里 —— 找不到就从页面顶端算。 */
    function contentTop() {
        const video = document.querySelector('.top-video-wrap');
        if (!video) return 0;
        return video.offsetTop + video.offsetHeight;
    }

    function bounds() {
        const targetTop = geo.swordTopMin;
        const top = contentTop();
        const maxScroll = pageMaxScroll();
        /* 剑“到起点”的那一屏：内容顶端来到视口 top = 0.5 个剑长 处 */
        const startScroll = Math.min(Math.max(top - targetTop, 0), maxScroll);

        return {
            targetTop,
            contentTop: top,
            maxScroll,
            startScroll,
            scrollRange: Math.max(maxScroll - startScroll, 1)
        };
    }

    /* 让本页自己的滚动机制把页面送到 dest（和 scrollPastTopVideo 是同一套：
       autoScroll 期间，滚动事件只重绘、不回写 cur / target）。 */
    function scrollToPage(dest) {
        autoScroll = true;
        freezeArmed = false;      /* 这一路不是滚轮输入：别在中途误触发冻结区 */
        target = clamp(introLen() + dest, 0, maxProgress());
        startLoop();
    }

    /* ---- 11.4 按滚动位置摆好整组（只动容器） ----
       进度 0~100% 对应 geo.swordTopMin ~ geo.swordTopMax，
       而这两个值 = 剑长 × 0.5 和 剑长 × 4（见 11.3 的 readGeometry），
       所以整组的旅程永远是"3.5 个剑长"，和屏幕多高、是 PC 还是手机无关。
       ★ 剑和 TOP 都挂在容器里，所以这里只写容器的 top 一个值 ——
         TOP 相对容器定位（见 1.css 第 11.3 节），自动跟着剑一起走。 */
    function updatePosition() {
        const { targetTop, contentTop: top, startScroll, scrollRange } = bounds();
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

        if (scrollY < startScroll) {
            /* 还没滚过标题视频：整组跟着内容顶端一起在屏幕上往上滑 */
            wrap.style.top = `${top - scrollY}px`;
        } else {
            /* 到起点之后：按进度从起点（0.5 个剑长）滑到终点（4 个剑长） */
            const progress = clamp((scrollY - startScroll) / scrollRange, 0, 1);
            wrap.style.top = `${geo.swordTopMin + progress * (geo.swordTopMax - geo.swordTopMin)}px`;
        }
    }

    /* ---- 11.5 拖剑 = 拖页面；没拖动就松手 = 点剑跳进度 ----
       鼠标沿剑的行程（= 3.5 个剑长）移动多少，
       剑就走多远、页面就滚多少 —— 也就是剑永远跟手。
       按下后先不动页面，超过 DRAG_THRESHOLD 才当拖动，避免“想点一下跳进度”
       被手抖的两像素吃掉。 */
    let dragging = false;
    let moved = false;
    let dragStartY = 0;
    let dragLatestY = 0;
    let dragStartScroll = 0;
    let dragBounds = null;
    let dragRafId = null;
    /* 按下那一刻记下的“点在剑上的位置”，松手判定为“点”时用它算跳转 */
    let pressOffset = 0;
    let pressHeight = 0;

    sword.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || isNarrow()) return;

        const rect = sword.getBoundingClientRect();

        dragging = true;
        moved = false;
        dragStartY = dragLatestY = e.clientY;
        dragStartScroll = window.scrollY || 0;
        dragBounds = bounds();
        pressOffset = e.clientY - rect.top;
        pressHeight = rect.height;

        document.documentElement.style.scrollBehavior = 'auto';
        sword.classList.add('dragging');
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!dragging || !dragBounds) return;
        dragLatestY = e.clientY;

        /* 还没超过阈值：先什么都不做（这次按下可能只是“点一下”） */
        if (!moved) {
            if (Math.abs(dragLatestY - dragStartY) <= DRAG_THRESHOLD) return;
            moved = true;
        }

        if (dragRafId !== null) return;
        dragRafId = requestAnimationFrame(() => {
            dragRafId = null;
            if (!dragging || !dragBounds) return;

            const travel = Math.max(1, geo.swordTopMax - geo.swordTopMin);
            const scrollDelta = ((dragLatestY - dragStartY) / travel) * dragBounds.scrollRange;
            scrollToPage(clamp(dragStartScroll + scrollDelta, 0, dragBounds.maxScroll));
        });
    });

    /* withClick：松手时没拖动过，就按“点了一下剑身”跳进度；
       鼠标移出窗口（mouseleave）时传 false，只取消拖动、不跳转。 */
    function endPress(withClick) {
        if (!dragging) return;

        const wasDrag = moved;
        const b = dragBounds;
        const offset = pressOffset;
        const height = pressHeight;

        dragging = false;
        moved = false;
        dragBounds = null;
        if (dragRafId !== null) {
            cancelAnimationFrame(dragRafId);
            dragRafId = null;
        }

        document.documentElement.style.scrollBehavior = '';
        sword.classList.remove('dragging');
        document.body.style.userSelect = '';

        if (!withClick || wasDrag || !b || !(height > 0)) return;

        /* 点剑身 = 跳到对应进度：算法与 description 页一致 ——
           剑身上沿 20% 以下那段算有效行程（50% 高度），点得越靠下，跳得越靠后。 */
        const minClickOffset = height * 0.2;
        const effectiveRange = Math.max(1, height * 0.5);
        const progress = clamp((offset - minClickOffset) / effectiveRange, 0, 1);
        scrollToPage(clamp(b.startScroll + progress * b.scrollRange, 0, b.maxScroll));
    }

    window.addEventListener('mouseup', () => endPress(true));
    window.addEventListener('mouseleave', () => endPress(false));

    /* ---- 11.6 点 TOP = 回到页面顶部 ----
       走本页的滚动机制（设 target = 0 让 tick 平滑推进），不直接 window.scrollTo。 */
    label.addEventListener('click', () => {
        autoScroll = true;
        freezeArmed = false;
        target = 0;
        startLoop();
    });

    /* ---- 11.7 监听 & 初始化 ----
       滚动只重摆位置（几何没变）；尺寸 / 断点 / 图片晚到要【重量几何再摆】
       —— 剑长是量渲染高度得来的，剑一变短变长，起点和行程要按新剑长重算。 */
    function refresh() {
        readGeometry();
        updatePosition();
    }

    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', refresh, { passive: true });
    narrowViewport.addEventListener('change', refresh);
    sword.addEventListener('load', refresh);

    refresh();
    /* 图片若走缓存、刚才没触发 load，下一帧再补一次（此时尺寸才是真的） */
    requestAnimationFrame(refresh);

    /* 只读调试接口：控制台 __swordTrack.bounds 看当前的进度区间，
       __swordTrack.geometry 看量到的剑长 / 起点 / 终点，
       __swordTrack.refresh() 手动重摆一次。 */
    window.__swordTrack = {
        get bounds() { return bounds(); },
        get geometry() { return geo; },
        get swordHeight() { return geo.swordHeight; },
        refresh
    };
})();
