(function () {
    "use strict";

    /* ======================= 1. 十八个图标（图片 / 视频链接、出场点在这里改；编号 1、3~11、14~24，2 号已删，12 / 13 号已删） ======================= */
    /* ============ ico5 / ico7 / ico6 的出场时刻（三只都挂在 text-1 上） ============
       text-1 = "Compact is only the" + <br> + "BEGINNING"，它自己有四个时刻（见 1.js）：
           A ──淡入(0.6s)── H ──停留(3s)── B ──淡出(0.6s)── E

       第一行 "Compact is only the" 跟着【整句】一起淡入（A → H）；
       "BEGINNING" 的动效由 4.js 负责（弹出 → 淡入 → 缩回原大小），
       它现在要等 ico7（箭头）的渐入【彻底走完】才出场，
       而 ico6 又要等 BEGINNING 缩回原大小、【整段演完】才出场 ——
       所以这三只的先后是串起来的：

           第一行出现 → ico5 → ico7 → BEGINNING 弹出并缩小 → ico6

       下面这几个数用【淡入窗口的倍数】表示（1 个 FRAC = H - A = 0.6 秒），
       这样改 1.js 的 FADE_IN_SECONDS，整段节奏会自动跟着缩放。
       FRAC 坐标里 A = 0、H = 1.0（真实时间 = 这个数 × 0.6 秒）：

         ico5        起点 0.50（第一行出现的时刻） 淡入 0.40 → 0.90 淡完
         ico7        起点 0.90（ico5 淡入结束）    淡入 0.70 → 1.60 淡完
         BEGINNING   起点 1.60（= ico7 渐入结束）  淡入 0.58 → 2.18，再缩小 1.92 → 4.10 演完
         ico6        起点 4.10（BEGINNING 演完）   淡入 0.50 → 4.60 淡完

       换成秒：ico5 0.30~0.54，ico7 0.54~0.96，BEGINNING 0.96~2.46，ico6 2.46~2.76。
       这三只本来就一直亮到 text-2 淡出，所以就算某段被拖长、和后面的文字同屏，也没关系。

       ★ BEGINNING 的两段时长（APPEAR_SEC / SHRINK_SEC）和“什么时候算演完”都写在 4.js，
         这里不重复抄数：ico6 的起点由下面的 beginningDone() 每帧向 4.js 要。
       三只【一起】在 text-2 完全消失的时候没掉：它们共用 fadeOut ".text-2"，
       从 text-2 开始淡出算起，等到 text-2 淡到 0，它们也正好淡到 0（见 update 里的 outT）。 */
    const FIRST_LINE_FRAC = 0.5;    /* 第一行“出现”的时刻：淡入窗口走一半 ——
                                       easeOut 曲线下这时已经 87% 不透明，第一行看得清了 */
    const ICO5_FADE_FRAC  = 0.4;    /* ico5 淡入时长：0.4 × 0.6s ≈ 0.24s */
    const ICO5_AT         = FIRST_LINE_FRAC;              /* ico5 起点 = 第一行出现的那一刻 */
    const ICO7_AT         = ICO5_AT + ICO5_FADE_FRAC;     /* ico7 起点 = ico5 淡入结束（≈ 0.54s） */
    const ICO7_FADE_FRAC  = 0.7;    /* ico7（箭头）淡入时长：0.7 × 0.6s ≈ 0.42s（从左往右扫开） */
    const ICO6_FADE_FRAC  = 0.5;    /* ico6 淡入时长：0.5 × 0.6s ≈ 0.30s */

    /* 把 ico5 / ico7 的时刻表报给 4.js：它要拿 ico7End 定 BEGINNING 的出场点。
       ★ 4.js 在 3.js 之后加载（见 index.html），所以它加载时这里一定已经建好了；
         反过来，ico6 的起点要读 4.js 的 window.__beginning（见 beginningDone）。 */
    const TIMELINE = {
        ico5At: ICO5_AT,
        ico5Fade: ICO5_FADE_FRAC,
        ico7At: ICO7_AT,
        ico7Fade: ICO7_FADE_FRAC,
        ico7End: ICO7_AT + ICO7_FADE_FRAC,   /* = 1.60：ico7 渐入彻底结束 → BEGINNING 该出场了 */
        ico6Fade: ICO6_FADE_FRAC
    };

    /* ---- 图标 1 / 3 / 4 的出场顺序（三只一起认 text-5 的淡出区间退场）----
         1 = text-4【开始出现】（它的 A）→ 跟着 text-4 一起淡入
         3 = text-4【开始淡出】（它的 B）→ 在 text-4 暗下去的同时淡入
         4 = text-5【淡入结束】（它的 H）→ 等 text-5 完全亮起来之后才淡入
       三只都在 text-5【开始淡出】（它的 B）的时候一起淡出（见各自的 fadeOut，
       默认的淡出宿主 .text-6 对它们不再生效）。
       时刻记号：A = 开始淡入，H = 淡入结束，B = 开始淡出，E = 完全消失（见 1.js）。 */
    const ICONS = [
        {
            cls: "bug-icon-1",
            host: ".text-4",
            src: "./B. subtilis.webm",                 /* ★ 视频素材：自动用 <video muted autoplay loop> 建节点 */
            name: "Bacillus subtilis",
            label: "B. subtilis",
            /* text-4 一淡入就跟着淡入，时长 = text-4 的淡入区间 */
            start: { from: ".text-4", mark: "A" },
            /* ★ text-5【开始淡出】时一起暗下去（不再等到默认的 .text-6） */
            fadeOut: ".text-5"
        },
        {
            cls: "bug-icon-3",
            host: ".text-4",
            src: "https://static.igem.wiki/teams/6059/wiki/home/p-putida.avif",
            name: "Pseudomonas putida",
            label: "P. putida",
            /* text-4【开始淡出】的时候淡入（mark: B）；时长仍然和图标 1 一样 */
            start: { from: ".text-4", mark: "B" },
            /* ★ text-5【开始淡出】时一起暗下去 */
            fadeOut: ".text-5"
        },
        {
            cls: "bug-icon-4",
            host: ".text-5",
            src: "https://static.igem.wiki/teams/6059/wiki/home/e-coli-1.avif",
            name: "Escherichia coli (2)",
            label: "E. coli",
            /* text-5【完全淡入】之后才开始淡入（mark: H），时长仍然和图标 1 一样 */
            start: { from: ".text-5", mark: "H" },
            /* ★ text-5【开始淡出】时一起暗下去 */
            fadeOut: ".text-5"
        },

        /* ---- 下面三只【不飘动】，钉在屏幕上（pin: true）----
           ★ 位置在 3.css 的 .bug-icon-5 / .bug-icon-6 / .bug-icon-7 里改（left / bottom）
           ★ 它们【只活到 text-2 消失为止】：fadeOut 都写 ".text-2"，
             text-2 开始淡出时它们跟着暗下去，text-2 完全消失时它们也正好没了。
             （图标 1 / 3 / 4 各有自己的 fadeOut：".text-5"，跟着 text-5 一起退场。）
           ★ 三只的出场顺序（时刻全部相对 text-1 的淡入窗口，见文件顶上那组常数）：
                ico5 → text-1 的第一行出现之后
                ico7 → ico5 淡入结束之后（它的渐入走完 = BEGINNING 的出场时刻，见 4.js）
                ico6 → BEGINNING 缩回原大小、【整段演完】之后
             想让它们整体早一点 / 晚一点：只改文件顶上的 FIRST_LINE_FRAC 和
             ICO5_FADE_FRAC / ICO7_FADE_FRAC / ICO6_FADE_FRAC，
             以及 4.js 的 APPEAR_SEC / SHRINK_SEC。 */
        {
            cls: "bug-icon-5",
            host: ".text-1",
            src: "https://static.igem.wiki/teams/6059/wiki/home/crispr-1.avif",
            name: "CRISPR",
            pin: true,                      /* ★ 不飘动：位置由 3.css 决定 */
            fadeOut: ".text-2",             /* ★ text-2 完全消失时一起消失 */
            /* ★ text-1 的【第一行出现之后】才开始淡入：
                 起点 = A + FIRST_LINE_FRAC × (H - A)，这时第一行已经 87% 不透明 */
            start: { from: ".text-1", mark: "A", shift: item => (item.H - item.A) * ICO5_AT },
            fadeScale: ICO5_FADE_FRAC       /* ★ 淡入时长 ≈ 0.24s（见文件顶上那组常数） */
        },
        {
            cls: "bug-icon-6",
            host: ".text-1",
            src: "https://static.igem.wiki/teams/6059/wiki/home/tnpb-3.avif",
            name: "TnpB",
            pin: true,                      /* ★ 不飘动：位置由 3.css 决定 */
            fadeOut: ".text-2",             /* ★ text-2 完全消失时一起消失 */
            /* ★ 等 BEGINNING【弹出 → 淡入 → 缩回原大小】整段演完才淡入：
                 那两段的时长由 4.js 算（它负责 BEGINNING 的动画），
                 这里每帧向它要“演完那一刻的进度”，见下面的 beginningDone()。 */
            start: { from: ".text-1", mark: "H", shift: item => beginningDone(item) - item.H },
            fadeScale: ICO6_FADE_FRAC       /* ★ 淡入时长 ≈ 0.30s */
        },
        {
            cls: "bug-icon-7",
            host: ".text-1",
            src: "https://static.igem.wiki/teams/6059/wiki/home/arrow-1.avif",
            name: "Arrow",
            pin: true,                      /* ★ 不飘动：位置默认由下面的 between 自动算 */
            fadeOut: ".text-2",             /* ★ 和图标 5 / 6 一起消失（text-2 完全消失时） */
            /* ★ ico5 淡入结束之后【紧接着】出现：
                 起点 = ico5 的起点 + ico5 的淡入时长（见文件顶上那组常数）。
                 这一段的渐入【彻底走完】= BEGINNING 的出场时刻（TIMELINE.ico7End，4.js 读它）。 */
            start: { from: ".text-1", mark: "A", shift: item => (item.H - item.A) * ICO7_AT },
            /* ★ 淡入时【左半边先出现、右半边后出现】：
               用一条从左往右扫开的柔性遮罩，实现见下面的 paintReveal()。 */
            reveal: { feather: 0.42 },
            /* ★ 淡入时长 ≈ 0.42s：调大 = 箭头扫得更慢，BEGINNING 的出场也会跟着一起往后推 */
            fadeScale: ICO7_FADE_FRAC,
            /* ★ 位置：默认对准图标 5 / 6 两只图标的【正中间】（见 placeBetween）；
               想手动钉死就删掉这一行，然后改 3.css 的 .bug-icon-7。 */
            between: [".bug-icon-5", ".bug-icon-6"]
        },
        {
            cls: "bug-icon-8",
            host: ".text-7",
            src: "https://static.igem.wiki/teams/6059/wiki/home/ctac.avif",
            name: "CTAC",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-8 决定 */
            /* ★ text-8【淡入区间】里跟着一起淡入 ——
               这两段在冻结组里，时钟会自动切到滚轮驱动的 freezePos（见 resolveWindow），
               所以“text-8 刚开始淡入”这一刻是准的。 */
            start: { from: ".text-7", mark: "A" },
            /* ★ text-9 淡出时一起消失；往上滑倒放时也会对称地亮回来 */
            fadeOut: ".text-8",

            /* ★★ 新增：text-8【淡入完全结束】之后，在同一个位置插入一段视频 ★★
               · src 写【相对路径】：./CTAC.webm（和 index.html 放在同一个目录）；
               · 只播一次（不循环）；播完就把视频收起来、露出原来那张静态图 ——
                 也就是“定格在现在的图片上”；
               · 播的这 2.1 秒里，下面那张静态图会先收起来：
                 两段素材的长宽比不一样（ctac.avif 是 4000×770、CTAC.webm 是 2460×686），
                 同时显示会看到两个大小不同的同一个图案；
               · 位置 / 大小在 3.css 的 .bug-icon-8 .bug-icon-video 里调
                 （默认和静态图【同中心、同高度】；只想挪一点就改 --video-dx / --video-dy）；
               · 想让视频停在自己的最后一帧、播完不回到静态图：在这里加一行 hold: true。 */
            video: { src: "./CTAC.webm" }
        },

        /* ---- 图标 9（tnpb-1.avif）—— text-7 淡入时出现，跟 text-7 一起消失 ----
           ★ 位置 / 大小在 3.css 的 .bug-icon-9 里改：
             现在是【屏幕竖直中心、水平 30%】（那里的 left / top 指的是盒子中点），
             并且是画框里最底层的一只（飘来飘去的图标 1 / 3 / 4 压在它上面）。
           ★ 图层：它在 .bug-icons 这个画框里，画框本身是 z-index 3，
             文字是 1~33（按出场顺序递增），所以它【一定在文字下面】。 */
        {
            cls: "bug-icon-9",
            host: ".text-6",
            src: "https://static.igem.wiki/teams/6059/wiki/home/tnpb-1.avif",
            name: "TnpB",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-9 决定 */
            /* ★ 跟着 text-7 的【淡入区间】一起淡入（它的 A → H） */
            start: { from: ".text-6", mark: "A" },
            /* ★ 跟着 text-7 的【淡出区间】一起消失（它的 B → E），
               往上滑倒放时会对称地跟着亮回来 */
            fadeOut: ".text-6"
        },

        /* ---- 图标 10（title.mp4）—— text-10 淡入时出现，跟 text-10 一起消失 ----
           ★ 它【本身就是一个视频】（src 写成 .mp4，下面第 2 节会自动用 <video> 建节点），
             不是“图片上盖视频”那种。
           ★ 三个关键开关：
               · autoplay: false —— 不要一进页面就播（那点时间早就放完了）；
                 等这只图标随 text-10 亮起来，才由 mediaLive() 开始播；
               · loop: false     —— 只播一次，播完就停在最后一帧，不从头再来；
               · fadeOut        —— 跟 text-10 的淡出区间一起消失。
             所以整段看起来就是：text-10 淡入 → 视频跟着出现并放一遍 → 定格在最后一帧。
           ★ 位置 / 大小在 3.css 的 .bug-icon-10 里（默认在文字下方、屏幕竖直 65% 处）。 */
        {
            cls: "bug-icon-10",
            host: ".text-9",
            src: "./editing.webm",
            name: "Title",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-10 决定 */
            autoplay: false,                /* ★ 亮起来才播（见 createIconVideo / mediaLive） */
            loop: false,                    /* ★ 只播一次，播完定格在最后一帧 */
            start: { from: ".text-9", mark: "A" },   /* 跟着 text-10 的淡入区间出现 */
            fadeOut: ".text-9"                        /* 跟着 text-10 的淡出区间一起消失 */
        },

        /* ---- 图标 11（answer.webm）—— 跟 text-11 同步淡入 / 淡出 ----
           ★ 素材用【相对路径】./answer.webm（和 index.html 放在同一个目录）。
           ★ 只播一次、播完就【定格在最后一帧】（和图标 10 一个用法：
             autoplay: false 让它等这只图标亮起来才播，loop: false 让它不从头再来）。
           ★ 图层：它待在 .bug-icons 这个 z-index: 3 的画框里，而 text-11 的 z-index
             比 3 高（1.js 按出场顺序写的内联值），所以它【天然叠在文字下面】——
             不需要、也不要给它单独写 z-index；它也没有 hover 名字，
             3.css 里另有 pointer-events: none，不会挡住文字的选中 / 悬停。
           ★ 位置 / 大小在 3.css 的 .bug-icon-11 里调（left / top / --icon-height）。 */
        {
            cls: "bug-icon-11",
            host: ".text-10",
            src: "./answer.webm",                    /* ★ 相对路径：和 index.html 同目录 */
            name: "Answer",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-11 决定 */
            autoplay: false,                /* ★ 亮起来才播（不然进页面就播完了） */
            loop: false,                    /* ★ 只播一次，播完定格在最后一帧 */
            start: { from: ".text-10", mark: "A" },   /* ★ text-11【淡入】时跟着淡入，时长同它 */
            fadeOut: ".text-10"                        /* ★ text-11【淡出】时跟着消失 */
        },

        /* ======================================================================
           图标 14 —— ★★ 原来的【suicide.webm + Kill Switch 开关】整段注释掉 ★★
           ----------------------------------------------------------------------
           原因：按需求，text-12 不再配那段视频和开关按钮，换成一张【静态图片】
                 platform.avif（见下面紧跟着的那一条 ico14）。
           所以下面这些行（每行开头都加了 //）现在【不执行】：
                 · 不再生成 <video src="./suicide.webm">；
                 · 不再生成 .bug-toggle 那颗开关，也不再生成 “Kill Switch” 那行字；
                 · 3.css 里对应的样式也整段注释掉了（见 3.css 的 .bug-icon-14 那一段）。
           ★ 想恢复原来的组件：把下面每行开头的 //  去掉，并把紧跟着的静态图那一条
             也一起注释掉 —— 两条都留着会叠在同一个位置。
           ★ 开关引擎本身（下面第 3.x 节的 switchEnd / switchRest / paintToggle /
             switchAnimate / toggleSwitch / switchTick / mediaOrSwitch）还留在文件里：
             没有图标写 toggle 时它一个分支都不会进（等于死代码，页面表现无影响），
             留着是为了恢复方便（mediaOrSwitch 引用了它，删掉要一起改）。
           ----------------------------------------------------------------------
           以下是原始配置（备份，逐行 // 注释）：
           ====================================================================== */
//        /* ---- 图标 14（suicide.webm）—— text-17 淡入时出现，text-18 淡出之后消失 ----
//           ★ 右边带一个【开关按钮】（见下面的 toggle）：绿 = 开、灰 = 关。
//             按钮【上方】还有一行字 “Kill Switch”（toggle.label）：
//             字体 / 颜色跟正文一样，样式在 3.css 的 .bug-icon-14 .bug-toggle-label。
//             视频不再自己播，完全由开关控制（所以 autoplay / loop 都写 false，
//             mediaLive() 对这只图标不生效，改由 switchTick() 管）：
//                关 → 开：正放（0 → 最后一帧），细菌一点点变灰死掉，停住后【开 = 灰/最后一帧】
//                开 → 关：倒放（最后一帧 → 0），细菌变回彩色，停住后【关 = 彩/第一帧】
//             不点击的时候就是上面那两个静止帧。 */
//        {
//            cls: "bug-icon-14",
//            host: ".text-12",
//            src: "./suicide.webm",                   /* ★ 相对路径：和 index.html 同目录 */
//            name: "Suicide",
//            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-14 决定 */
//            autoplay: false,                /* ★ 由开关控制，不自己播 */
//            loop: false,                    /* ★ 不循环：播到头 / 退到头就停 */
//            /* ★ 跟着 text-17 的【淡入区间】一起淡入（它的 A → H） */
//            start: { from: ".text-12", mark: "A" },
//            /* ★ 跟着 text-18 的【淡出区间】一起消失（它的 B → E），倒放时对称亮回来 */
//            fadeOut: ".text-12",
//            /* ★★ 开关按钮（3.css 的 .bug-icon-14 .bug-toggle 调样式 / 位置）★★
//               end = 视频【画面】真正结束的时刻（不是容器时长）：
//                     这个 webm 的容器时长 2.51s，但画面在 1.545s 就结束了
//                     （后面是静音的音频尾巴，视频流只有 86 帧 / 60fps）。
//                     ★ 换素材后必须重新量一次，否则正放会在中途停住（看起来“只播了一半”）。
//                       量法：ffmpeg -hide_banner -i xxx.webm -map 0:v:0 -f null -
//                       看最后一行 time=…，或看 showinfo 里最后一帧的 pts_time。
//                     写 0 或删掉 = 用容器时长（video.duration）：动画一定能放完，
//                     只是最后会在静止的最后一帧上多等约 1 秒，倒放时也会先空转一会儿。
//               label = 按钮【上方】那行说明文字（现在是 "Kill Switch"）。
//                       字形 / 颜色跟正文一样，位置 / 字号在 3.css 的
//                       .bug-icon-14 .bug-toggle-label 里调；不想显示就删掉这一项。 */
//            toggle: { end: 1.55, label: "Kill Switch" }
//        },

        /* ---- 图标 14（platform.avif）—— ★ 静态图片版 ★
           跟着 text-12 一起淡入 / 一起淡出（原来那段视频 + 开关已注释在上面）：
             · start   = text-12 的【淡入起点】（A）；淡入时长默认就取 text-12 的淡入窗口，
                         曲线也是 1.js 画文字用的那条 easeOut —— 所以是同步亮起来的；
             · fadeOut = ".text-12" → 在 text-12 的【淡出区间】（它的 B → E）里一起暗下去，
                         text-12 完全消失时它正好也没了；往上滑倒放时会对称地亮回来；
             · fadeOutEase: true → 淡出也用文字那条曲线（1 - easeOut(t)），
                         不是图标默认的线性 —— 不加的话最后一段它会比文字亮一点，
                         看起来像“文字先没了、图还挂着”。
           ★ 位置 / 大小在 3.css 的 .bug-icon-14 里改（left / top / --icon-height），
             这一条配置不用再碰。
           ★ 它是一张 .avif 图片，所以不需要 autoplay / loop 那些视频开关。 */
        {
            cls: "bug-icon-14",
            host: ".text-12",
            src: "https://static.igem.wiki/teams/6059/wiki/home/platform.avif",
            name: "Platform",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-14 决定 */
            /* ★ 跟着 text-12 的【淡入区间】一起淡入（它的 A → H） */
            start: { from: ".text-12", mark: "A" },
            /* ★ 跟着 text-12 的【淡出区间】一起消失（它的 B → E），倒放时对称亮回来 */
            fadeOut: ".text-12",
            /* ★ 淡出也用文字那条曲线，和 text-12 逐帧一致（见上面说明） */
            fadeOutEase: true
        },

        /* ---- 图标 15（understand-1.avif）—— text-20 淡入时出现，跟 text-20 一起淡出 ----
           ★ 现在【只留这一只】，而且改成 pin: true：
               · 它的位置不再交给随机飘动，而是由 4.js 的 “text-20：ico15 弹跳敲字”
                 那一段每帧写 transform ——
                 从上方飞进来 → 在文字之间弹跳 → 依次敲 S / T / I / N / G → 从右侧飞出；
               · 3.js 这边只负责它的【淡入 / 淡出】（start / fadeOut 都跟 text-20 走）；
               · 所以 area / randomDir 都不需要了（pin 的图标不参与飘动和互撞）。
           ★ 图标 16 / 17 / 18 暂时不用（注释掉了，要用时把这三条取消注释即可）。 */
        {
            cls: "bug-icon-15",
            host: ".text-20",
            src: "https://static.igem.wiki/teams/6059/wiki/home/understand-1.avif",
            name: "Understand (1)",
            pin: true,                                 /* ★ 位置由 4.js 的弹跳动画控制 */
            start: { from: ".text-20", mark: "A" },    /* 跟着 text-20 的淡入区间出现 */
            fadeOut: ".text-20"                        /* 跟着 text-20 的淡出区间消失 */
        },

        /*
        {
            cls: "bug-icon-16",
            host: ".text-20",
            src: "https://static.igem.wiki/teams/6059/wiki/home/understand-1.avif",
            name: "Understand (2)",
            start: { from: ".text-20", mark: "A" },
            fadeOut: ".text-20",
            area: { left: 40, right: 100, top: 0, bottom: 100 },
            randomDir: true
        },
        {
            cls: "bug-icon-17",
            host: ".text-20",
            src: "https://static.igem.wiki/teams/6059/wiki/home/understand-1.avif",
            name: "Understand (3)",
            start: { from: ".text-20", mark: "A" },
            fadeOut: ".text-20",
            area: { left: 40, right: 100, top: 0, bottom: 100 },
            randomDir: true
        },
        {
            cls: "bug-icon-18",
            host: ".text-20",
            src: "https://static.igem.wiki/teams/6059/wiki/home/understand-1.avif",
            name: "Understand (4)",
            start: { from: ".text-20", mark: "A" },
            fadeOut: ".text-20",
            area: { left: 40, right: 100, top: 0, bottom: 100 },
            randomDir: true
        },
        */

        /* ---- 图标 19（expand.webm）—— text-15 淡入时出现，text-16 淡出时消失，一直循环播放 ----
           ★ 素材用【相对路径】./expand.webm（和 index.html 放在同一个目录）。
           ★ 循环播放：这里【故意不写】autoplay / loop，全用默认值
             （autoplay: true、loop: true，见上面的 createIconVideo），
             所以它一出现就一直在放、放完自动从头再来；
             只有跟着文字暗下去的那一刻才暂停（mediaLive），再亮起来接着放，
             不会白烧 CPU，也不会每次出现都从第一帧重演。
           ★ 全程不闪：从 text-15 的淡入起点（A）一直亮到 text-16 的淡出区间（B → E），
             中间“text-15 自己淡出、text-16 还没上来”的那一段也保持全亮 ——
             这正是“text-15 出现，text-16 没了才收”的意思。
           ★ 图层：它仍然待在 .bug-icons 这个 z-index: 3 的画框里，而 text-15 / text-16
             的内联 z-index 早就不止 3，所以它【天然叠在文字下面】——
             不需要、也不要给它单独写 z-index。
           ★ 位置 / 大小在 3.css 的 .bug-icon-19 里调（left / top / --icon-height）。
           ★ 它没有 hover 名字 → 3.css 里另有 pointer-events: none，不挡底下文字。 */
        {
            cls: "bug-icon-19",
            host: ".text-15",
            src: "./expand.webm",                    /* ★ 相对路径：和 index.html 同目录 */
            name: "Expand",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-19 决定 */
            /* ★ 跟着 text-15 的【淡入区间】一起淡入（它的 A → H） */
            start: { from: ".text-15", mark: "A" },
            /* ★ 跟着 text-16 的【淡出区间】一起消失（它的 B → E），
               往上滑倒放时会对称地跟着亮回来 */
            fadeOut: ".text-16"
        },

        /* ---- 图标 20（standing.webm）—— text-13 淡入时出现，text-14 淡出时消失 ----
           ★ 素材用【相对路径】./standing.webm（和 index.html 放在同一个目录）。
           ★ 只播一次、播完就【定格在最后一帧】（和图标 10 / 11 一个用法）：
               · autoplay: false —— 不跟着进页面就播，等这只图标随 text-13 亮起来才播；
               · loop: false     —— 不循环，走到头就停住。
             因为是一次性视频，mediaLive() 只在它亮起来时踢一下 play()，
             暗下去【不会】暂停它（否则滚走了就永远走不到结尾，“定格”也就不会发生）。
             已经播完再滚回来 → 从头再演一遍（见 mediaLive 里那一段）。
           ★ 图层：仍在 .bug-icons 这个 z-index: 3 的画框里，而 text-13 / text-14 的
             内联 z-index 比 3 高，所以它【天然在文字下面】。
           ★ 位置 / 大小在 3.css 的 .bug-icon-20 里调（left / top / --icon-height）。
           ★ 它没有 hover 名字 → 3.css 里另有 pointer-events: none，不挡底下文字。 */
        {
            cls: "bug-icon-20",
            host: ".text-13",
            src: "./standing.webm",                  /* ★ 相对路径：和 index.html 同目录 */
            name: "Standing",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-20 决定 */
            autoplay: false,                /* ★ 亮起来才播（不然进页面就播完了） */
            loop: false,                    /* ★ 只播一次，播完定格在最后一帧 */
            /* ★ text-13【淡入】时跟着淡入（它的 A → H），时长和 text-13 一样 */
            start: { from: ".text-13", mark: "A" },
            /* ★ text-14【淡出】时跟着消失（它的 B → E），往上滑倒放时会对称亮回来 */
            fadeOut: ".text-14"
        },

        /* ---- 图标 21（model.webm）—— text-17 淡入时出现，text-19 淡出时消失 ----
           ★ 素材用【相对路径】./model.webm（和 index.html 放在同一个目录）。
           ★ 只播一次、播完就【定格在最后一帧】（和图标 10 / 11 / 20 一个用法）：
               · autoplay: false —— 不跟着进页面就播，等它随 text-17 亮起来才播；
               · loop: false     —— 不循环，走到头就停住。
             一次性视频不会因为暗下去就暂停（否则滚走了永远走不到结尾），
             已经播完再滚回来会从头再演一遍（见 mediaLive）。
           ★ 横跨三段文字：从 text-17 的【淡入起点】（A）一直亮到 text-19 的
             【淡出区间】（B → E）—— 中间 text-17 淡出、text-18 / text-19 依次上来的
             那几段都保持全亮，也就是“text-17 出现，text-19 没了才收”。
             往上滑倒放时会对称地亮回来。
           ★ 图层：仍在 .bug-icons 这个 z-index: 3 的画框里，而 text-17 / 18 / 19
             的内联 z-index 都比 3 高，所以它【天然在文字下面】。
           ★ 位置 / 大小在 3.css 的 .bug-icon-21 里调（right / top / --icon-height）。
           ★ 它没有 hover 名字 → 3.css 里另有 pointer-events: none，不挡底下文字。 */
        {
            cls: "bug-icon-21",
            host: ".text-17",
            src: "./",                     /* ★ 相对路径：和 index.html 同目录 */
            name: "Model",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-21 决定 */
            autoplay: false,                /* ★ 亮起来才播（不然进页面就播完了） */
            loop: false,                    /* ★ 只播一次，播完定格在最后一帧 */
            /* ★ 跟着 text-17 的【淡入区间】一起淡入（它的 A → H） */
            start: { from: ".text-17", mark: "A" },
            /* ★ 跟着 text-19 的【淡出区间】一起消失（它的 B → E） */
            fadeOut: ".text-19"
        },

        /* ---- 图标 22（laptop.avif）—— text-17 淡入时出现，text-19 淡出时消失 ----
           ★ 和图标 21 一样【横跨 text-17 / 18 / 19】这三段文字：
                start   = text-17 的淡入起点（A）→ 跟着 text-17 一起淡入；
                fadeOut = text-19 → 在 text-19 的【淡出区间】（它的 B → E）里一起暗下去，
                          text-19 完全消失时它正好也没了。
              中间 text-17 淡出、text-18 / text-19 依次上来的那几段都保持全亮，
              往上滑倒放时会对称地亮回来。
           ★ 它是一张图片（.avif），所以不需要 autoplay / loop 那些视频开关。
           ★ 图层：仍在 .bug-icons 这个 z-index: 3 的画框里，而 text-17 / 18 / 19
              的内联 z-index 都比 3 高，所以它【天然在文字下面】。
           ★ 位置 / 大小在 3.css 的 .bug-icon-22 里调（left / top / --icon-height）。 */
        {
            cls: "bug-icon-22",
            host: ".text-17",
            src: "https://static.igem.wiki/teams/6059/wiki/home/computer.avif",
            name: "Computer",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-22 决定 */
            /* ★ 跟着 text-17 的【淡入区间】一起淡入（它的 A → H） */
            start: { from: ".text-17", mark: "A" },
            /* ★ 跟着 text-19 的【淡出区间】一起消失（它的 B → E） */
            fadeOut: ".text-19",

            /* ★★ 图标里再叠一段视频（本地文件 model.mp4）★★
               · 视频以【这个图标为容器】：位置 / 大小全部相对图标盒子算，
                 在 3.css 的 .bug-icon-22 .bug-icon-video 里调
                 （--video-w / --video-h / --video-dx / --video-dy）；
               · 只播一次，播完【停在最后一帧】不动 —— hold: true 就是让它在
                 ended 之后既不收起、也不回到第一帧（对比图标 8 默认的“收起来露静态图”）；
               · 图标亮起来时自动播一次；
               · 右下角有一颗【播放 / 暂停 / 重播】键（replay: true），图形是 power.avif
                 （白色的电源符号；白 ↔ 蓝荧光呼吸、压扁贴台面这些效果都还在）：
                 位置 / 大小（都是相对图标容器的百分比）都在 3.css 的
                 .bug-icon-22 .bug-replay 里调，想换图只改那里的 --replay-icon 一行；
                 按下去做什么，看视频【此刻】的状态（逻辑见 toggleOverlayPlay）：
                   正在播         → 停在【当前帧】（再按一次就从这一帧接着播到结尾）
                   暂停着         → 从当前帧接着播到结尾（不会跳回第一帧）
                   停在最后一帧   → 从第一帧重新播一次
               ★ 两个都不能删：hold 少了会在播完后收起来，replay 少了就没有那颗按钮。 */
            video: { src: "./model.mp4", hold: true, replay: true }
        },

        /* ---- 图标 23（tool.webm）—— 跟 text-11 同步淡入 / 淡出 ----
           ★ 素材用【相对路径】./tool.webm（和 index.html 放在同一个目录）。
           ★ 用法和图标 10 / 11 / 20 一样：只播一次、播完就【定格在最后一帧】——
                · autoplay: false → 不跟着进页面就播，等它随 text-11 亮起来才播；
                · loop: false     → 不循环，走到头就停住。
              想让它像图标 19（expand.webm）那样【一直循环】：把下面 autoplay / loop
              这两行删掉即可（不写 = 默认自动播 + 循环），别的一个字都不用改。
           ★ 出场 / 退场：
                start   = text-11 的淡入起点（A）→ 跟着 text-11 一起淡入；
                fadeOut = ".text-11" → 在 text-11 的【淡出区间】（B → E）里一起淡出，
                          text-11 完全消失时它正好也没了；
                往上滑倒放时会对称地跟着亮回来。
           ★ 图层：仍在 .bug-icons 这个 z-index: 3 的画框里，而 text-11 的内联
              z-index 比 3 高，所以它【天然在文字下面】—— 不要给它单独写 z-index。
           ★ 位置 / 大小在 3.css 的 .bug-icon-23 里调（left / top / --icon-height）。
           ★ 它没有 hover 名字 → 3.css 里另有 pointer-events: none，不挡底下文字。 */
        {
            cls: "bug-icon-23",
            host: ".text-11",
            src: "./tool.webm",                      /* ★ 相对路径：和 index.html 同目录 */
            name: "Tool",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-23 决定 */
            /* ★★ 图层：它在文字【上面】★★
               这一只不走 .bug-icons（z-index: 3）那一层，而是挂到 3.js 另建的
               .bug-icons-top（z-index: 11）里 —— 于是这段视频压在 text-11（内联 z-index 11）
               上面、又在 text-12 及之后（≥12）下面。效果就是：文字从小弹出时，
               先被视频里的机器挡住，长大之后才从视频里“冒”出来压到最前面。
               想改回“视频在文字下面”：删掉这一行即可。 */
            topLayer: true,
            autoplay: false,                /* ★ 亮起来才播（不然进页面就播完了） */
            loop: false,                    /* ★ 只播一次，播完定格在最后一帧 */
            /* ★ 跟着 text-11 的【淡入区间】一起淡入（它的 A → H），时长和它一样 */
            start: { from: ".text-11", mark: "A" },
            /* ★ 跟着 text-11 的【淡出区间】一起消失（它的 B → E） */
            fadeOut: ".text-11"
        },

        /* ---- 图标 24（End.webm）—— 跟 text-23 同步淡入 / 淡出 ----
           ★ 素材用【相对路径】./End.webm（和 index.html 放在同一个目录）。
           ★ 只播一次、播完就【定格在最后一帧】（和图标 10 / 11 / 20 / 21 / 23 一个用法）：
                · autoplay: false → 不跟着进页面就播，等它随 text-23 亮起来才播；
                · loop: false     → 不循环，走到头就停住。
              一次性视频暗下去【不会】暂停（否则滚走了就永远走不到结尾，
              “定格在最后一帧”也就不会发生）；已经播完再滚回来会从头再演一遍
              （见 mediaLive 里那一段）。
           ★ 出场 / 退场【整段都跟着 text-23】：
                start   = text-23 的淡入起点（A），淡入时长也取 text-23 的淡入时长
                          （默认 = host 的 H - A，两个曲线用的是同一条 easeOut，所以是同步亮起来的）；
                fadeOut = ".text-23" → 在 text-23 的【淡出区间】（它的 B → E）里一起淡出，
                          text-23 完全消失时它正好也没了；
                往上滑倒放时会对称地跟着亮回来。
           ★ 图层：仍在 .bug-icons 这个 z-index: 3 的画框里，而 text-23 的内联
              z-index 比 3 高，所以它【天然在文字下面】—— 不要给它单独写 z-index。
           ★ 位置 / 大小在 3.css 的 .bug-icon-24 里调（right / top / --icon-height）。
           ★ 它没有 hover 名字 → 3.css 里另有 pointer-events: none，不挡底下文字。 */
        {
            cls: "bug-icon-24",
            host: ".text-23",
            src: "./end.webm",                       /* ★ 相对路径：和 index.html 同目录 */
            name: "End",
            pin: true,                      /* ★ 不飘动：位置由 3.css 的 .bug-icon-24 决定 */
            autoplay: false,                /* ★ 亮起来才播（不然进页面就播完了） */
            loop: false,                    /* ★ 只播一次，播完定格在最后一帧 */
            /* ★ 跟着 text-23 的【淡入区间】一起淡入（它的 A → H），时长和它一样 */
            start: { from: ".text-23", mark: "A" },
            /* ★ 跟着 text-23 的【淡出区间】一起消失（它的 B → E） */
            fadeOut: ".text-23",
            /* ★ 淡出也用文字那条曲线：1.js 画文字淡出用的是 1 - easeOut(t)，
               而图标默认是线性的 1 - t —— 不改的话最后一段图标会比文字亮、
               看起来像“文字先没了、视频还挂着”。写上这一行，两者逐帧一致。 */
            fadeOutEase: true
        }
    ];

    /* 没写 fadeOut 的图标统一在它的淡出区间里一起消失（默认 .text-6）；
       写了 fadeOut 的各自认自己的宿主：图标 1 / 3 / 4 跟 .text-5（三只一起退场）、
       图标 5 / 6 / 7 跟 .text-2、图标 8 跟 .text-9、图标 9 跟 .text-7、
       图标 10 跟 .text-10、图标 11 跟 .text-10、
       图标 14（现在是静态图 platform.avif）跟 .text-12、图标 15 / 16 / 17 / 18 跟 .text-21、
       图标 19 跟 .text-16、图标 20 跟 .text-14、图标 21 跟 .text-19、
       图标 22 跟 .text-19、图标 23 跟 .text-11、图标 24 跟 .text-23
       （图标 12 / 13 已删除，不再有它们的事） */
    const FADE_OUT_HOST = ".text-6";

    /* ======================= 飘动（图标“出现在页面里”的那段时间在飘） =======================
       现在的运动模型 = 台球 / 光反射：
         · 每个图标有一个【恒定速度】，沿当前直线一直往前（匀速，不加速不减速）；
         · 撞到【运动区域】的边框 → 按反射定律弹回：
           撞左右边框翻 vx，撞上下边框翻 vy，撞角落两个都翻；
         · 撞到另一个图标（按两个盒子的边缘算，不是中心点）→ 两个一起弹开，
           沿分离轴把速度分量按反射交换（等质量弹性碰撞），并把重叠推开，绝不卡在一起。
       ★ 运动区域默认由下面的 DRIFT.area 决定，现在是【左侧 0%~60%】：
         判定用的是【图片边缘】，所以图标的外沿最多到 60% 那条线，不会越过去。
         ★ 单个图标可以在 ICONS 那一条里写 area 覆盖它（图标 15 ~ 18 就各自写了
           top 0~100% / right 0~60%，见 areaOf()），互不影响。
       ★ 【初始位置是随机的】：图标 1 / 3 / 4 / 15 ~ 18 每次刷新都在运动区域里随机落点
          （DRIFT.randomStart，见下面 pickStart），并且尽量互不重叠；
          想恢复以前那三个写死的位置，把 randomStart 改成 false 即可。
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

        /* ---- 初始落点：随机 ----
           true  = 每次刷新都在【运动区域 area 里】随机挑一个落点，
                   并且尽量不和别的图标重叠（见下面 pickStart）；
           false = 用下面 seed 里写死的那三个固定落点（只有 1 / 3 / 4 号会用到，想复现老样子就切成 false）。
           ★ 随机落点一定会被夹进 area，所以图标的初始位置永远在运动范围内。 */
        randomStart: true,
        startTries: 240,     /* 随机试几次：取第一个“完全不重叠”的，试不到就用重叠最少的那个 */
        startGap: 1.5,       /* 两个图标的初始落点之间至少留多宽的空隙（视口百分比，0 = 贴着也行） */
        /* ---- 初始方向 ----
           false = 用 seed.dir 里写好的固定方向（默认，老样子）；
           true  = 每个图标随机一个角度，每次刷新飞向都不一样。 */
        randomDir: false,
        /* ★ 只有在 randomStart = false 时才用这里的固定落点；
           randomStart = true（默认）时它只是“区域比图还窄”那种极端情况的兜底。
           left / top = 图标【左上角】的视口百分比，dir = 初始方向（单位向量）。 */
        seed: [
            { left: 16, top: 30, dir: [0.85, 0.53] },
            { left: 44, top: 45, dir: [0.60, -0.80] },
            { left: 36, top: 3,  dir: [-0.78, 0.63] }
        ]
    };

    /* 和 1.js 的 render() 用同一条缓动（easeOut cubic），所以图标和文字是一起“亮”起来的 */
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const rand = (a, b) => a + Math.random() * (b - a);
    const len = d => Math.sqrt(d.x * d.x + d.y * d.y);

    /* ======================= 2. 建 DOM：一个铺满屏幕的容器 + 二十个“图标位” =======================
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
         这里取 3：盖得住底图和那些视频，而所有挂了图标的文字都压在它上面 ——
         text-1 / text-2 / text-3 在 3.css 里被抬到 4（!important），
         text-4 起的内联值本来就 ≥ 4，所以【图标永远叠在文字下面】。
       ★ 画框只有一层 z-index: 3，所以 4 就能压住里面全部图标 / 视频。
       ★ 图标 1 / 3 / 4 各自独立定位、各自沿自己的方向飞（见下面飘动引擎）；
         图标 5 / 6 是 pin 的：不参与飘动，位置完全由 3.css 里那两条决定。 */
    const row = document.createElement("div");
    row.className = "bug-icons";
    row.setAttribute("aria-hidden", "true");     /* 纯装饰，读屏器跳过 */

    /* ★ 图标 23 的【专属图层】（需求：这段视频的图层要在 text-11 上面）★★
       .bug-icons 整层是 z-index: 3，所以里面的图标怎么调都只能待在文字【下面】——
       一只子元素是逃不出父级那层 z-index 的，这就是“视频盖不住文字”的原因。
       所以给 23 号单开一层 .bug-icons-top（样式在 3.css）：
         · 位置 / 大小 / pointer-events 和 .bug-icons 一模一样（铺满视口、fixed、不吃鼠标）；
         · 唯一区别是 z-index = 11 —— 正好压在 text-11（内联 z-index 也是 11）上面，
           又低于 text-12 及之后的文字（≥12），不会影响后面那些句子；
         · 只有 ICONS 里写了 topLayer: true 的图标（现在只有 23 号）才会被放进这一层，
           其余图标照旧待在 z-index: 3 的那一层里，永远在文字下面。
       ★ 想让它回到“在文字下面”：把 ICONS 里 ico23 的 topLayer: true 删掉即可
         （或者改 3.css 里 .bug-icons-top 的 z-index，改回 3 就等于不单独分层了）。 */
    const topRow = document.createElement("div");
    topRow.className = "bug-icons-top";
    topRow.setAttribute("aria-hidden", "true");

    /* ---- 图标素材：图片用 <img>，视频用 <video> ----
       ★ 为什么不能一律用 <img>：<img> 只会去“解码一张图”，把 .webm / .mp4
         写进 img.src，浏览器既不会解码也不会画第一帧，只会立刻触发 error
         （控制台那句“图标加载失败，请检查链接”就是这么来的）。
       ★ 视频要自动播放，必须【静音 + playsinline + autoplay】同时成立：
         少一个（尤其没静音、或者 iOS 没 playsinline）浏览器就会拦下来，
         元素一直是空白的 —— 那看起来也像“加载不出来”。
       ★ 两个节点都挂同一个 .bug-icon 类，所以 3.css 里的大小 / 层级规则不用分两套。 */
    const VIDEO_EXT = /\.(webm|mp4|m4v|ogv|ogg|mov)(?:[?#]|$)/i;
    const isVideoSrc = src => VIDEO_EXT.test(String(src || ""));

    function iconErrorHandler(cfg) {
        return () => {
            console.error("[home] 图标加载失败，请检查链接：", cfg.name, cfg.src);
        };
    }

    function createIconImage(cfg) {
        const img = document.createElement("img");
        img.className = "bug-icon";
        img.src = cfg.src;
        img.alt = cfg.label || "";                     /* 名字也放 alt，读屏 / 图片挂了时也认得 */
        img.decoding = "async";
        img.draggable = false;
        img.addEventListener("error", iconErrorHandler(cfg));
        return img;
    }

    function createIconVideo(cfg) {
        const v = document.createElement("video");
        v.className = "bug-icon";
        /* ★ 默认是“一进页面就自动播”（图标 1 / 2 那种循环素材）；
             在 ICONS 那一条里写 autoplay: false，就变成“等它亮起来再播” ——
             图标 10 的 title.mp4 就是这么用的（它一进页面就播的话，等滚到 text-10
             早就放完了，只会看到一个不动的最后一帧）。 */
        const autoStart = cfg.autoplay !== false;
        /* ★ muted / autoplay 要在 src 之前设好，浏览器才会把它当“允许静音自动播放”的素材 */
        v.muted = true;
        v.defaultMuted = true;
        v.autoplay = autoStart;
        v.loop = cfg.loop !== false;                   /* 想只播一次就在 ICONS 那一条里写 loop: false */
        v.playsInline = true;
        v.setAttribute("muted", "");
        if (autoStart) v.setAttribute("autoplay", "");
        if (v.loop) v.setAttribute("loop", "");
        v.setAttribute("playsinline", "");
        v.setAttribute("webkit-playsinline", "");      /* 老 iOS 认这个前缀 */
        v.setAttribute("preload", "auto");
        v.setAttribute("disablepictureinpicture", "");
        /* ★ 千万别写 setAttribute("controls", ...)：只要这个属性出现（哪怕值是 "false"）
             浏览器就会画出一条原生控制条。要关掉就保持它不存在。 */
        v.controls = false;
        v.src = cfg.src;
        v.addEventListener("error", iconErrorHandler(cfg));

        /* autoplay: false 的那种不在这里踢它，等 update() 里 mediaLive() 发话 */
        if (!autoStart) return v;

        /* 个别浏览器（省电模式 / 节点刚插进 DOM）会把第一次 play() 拒掉，能播了再补一次 */
        const kick = () => {
            const p = v.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
        };
        v.addEventListener("loadeddata", kick, { once: true });
        v.addEventListener("canplay", kick, { once: true });
        kick();
        return v;
    }

    /* ---- 叠在某个图标上的“一次性视频”（现在只有图标 8 用，见 ICONS 里 ico8 的 video）----
       ★ 和 createIconVideo() 的区别就三点：
          1) 【不自动播】：什么时候开始由 update() 按时间轴决定 ——
             等 text-8 的淡入完全走完（p 走过 win.b）才 play()；
          2) 【不循环】：只播一次，播完怎么收尾见 overlayLive()（默认收起来、
             露出原来那张静态图 = 定格在现在的图片上；写 hold: true 才停在自己的最后一帧）；
          3) preload 用 metadata：先只拉个头（宽高 / 时长），
             大头等真正开始播的时候再下，不会在首屏跟主图 / 背景视频抢带宽。
       ★ 静音 + playsinline 仍然必须：不然浏览器会拦掉那次 play()。
       ★ 位置 / 大小全部交给 3.css 的 .bug-icon-8 .bug-icon-video，
         这里只负责把节点建出来、把 src 塞进去。 */
    function createOverlayVideo(cfg, spec) {
        const v = document.createElement("video");
        v.className = "bug-icon bug-icon-video";     /* 仍然挂 .bug-icon：高度等基础样式共用 */
        v.muted = true;
        v.defaultMuted = true;
        v.autoplay = false;                          /* ★ 关键：不是自动播，等时间轴发话 */
        v.loop = false;                              /* ★ 关键：只播一次，播完定格 */
        v.playsInline = true;
        v.setAttribute("muted", "");
        v.setAttribute("playsinline", "");
        v.setAttribute("webkit-playsinline", "");    /* 老 iOS 认这个前缀 */
        v.setAttribute("preload", "metadata");
        v.setAttribute("disablepictureinpicture", "");
        /* ★ 同样绝对不能出现 controls 属性（哪怕是 "false"），否则会画出一条控制条 */
        v.controls = false;
        v.src = spec.src;
        v.addEventListener("error", iconErrorHandler({ name: cfg.name + "（视频）", src: spec.src }));
        return v;
    }

    const nodes = ICONS.map(cfg => {
        const slot = document.createElement("div");
        slot.className = "bug-icon-slot " + cfg.cls + (cfg.pin ? " is-pinned" : "");

        const isVideo = isVideoSrc(cfg.src);
        const el = isVideo ? createIconVideo(cfg) : createIconImage(cfg);
        slot.appendChild(el);

        /* ★ 图标 8：那个“淡入之后才插入的视频” ——
           建好就放在【同一个 slot】里、盖在静态图上面，
           位置 / 大小完全由 3.css 的 .bug-icon-8 .bug-icon-video 决定；
           现在它是藏着的（CSS 里 opacity: 0），什么时候播由 update() 按时间轴说了算
           （见下面的 overlayLive）。 */
        let overlay = null;
        if (cfg.video && cfg.video.src) {
            overlay = createOverlayVideo(cfg, cfg.video);
            slot.appendChild(overlay);
        }

        /* ★ “播放 / 暂停 / 重播”按钮（ICONS 里写了 video.replay: true 才有，现在只有图标 22）：
            建在【同一个 slot】里，位置写在 3.css 的 .bug-icon-22 .bug-replay 上，
            所以视频 / 图标挪到哪儿、放大缩小，它都跟着走。
            · 用 <button> 而不是 <div>：键盘 Tab 能聚焦、空格 / 回车能按，读屏器认得；
            · 里面不放字（图形是 CSS 的 ::after 拿 power.avif 当遮罩画的），
              所以按钮叫什么全靠 aria-label —— 它会跟着视频状态变
              （“暂停视频 / 继续播放视频 / 重新播放视频”，见 paintReplay）；
            · pointer-events 由 CSS 管（图标亮着时才可点，暗着的时候不挡鼠标）。
            ★ 点一下做什么由 toggleOverlayPlay 按视频当前状态决定，不是固定的“重播”。 */
        let replay = null;
        if (cfg.video && cfg.video.replay) {
            replay = document.createElement("button");
            replay.type = "button";
            replay.className = "bug-replay";
            /* 初始文案；真实状态由 paintReplay() 在视频 metadata / play / pause / ended 时改写 */
            replay.setAttribute("aria-label", (cfg.name || "icon") + " 播放 / 暂停视频");
            slot.appendChild(replay);
        }

        /* hover 显示的名字：没有名字的图标（比如图标 5 / 6）就不生成这个 span。
           ★ 图标 1 / 3 / 4 的名字在 3.css 里被设成【斜体】。
             这三只的出场：1 跟 text-4 一起淡入、3 在 text-4 淡出时淡入、
             4 在 text-5 淡入之后淡入；三只都随 text-5 淡出。 */
        let label = null;
        if (cfg.label) {
            label = document.createElement("span");
            label.className = "bug-label";
            label.textContent = cfg.label;
            slot.appendChild(label);
        }

        /* ★ 开关按钮（ICONS 里写了 toggle 才会有）：
           ★★ 现在【没有任何图标写 toggle】：ico14 已经换成静态图（见上面的注释），
              所以下面这一段永远不执行、也不会生成任何节点 —— 留着只是为了恢复方便。
           建在【同一个 slot】里，用 CSS 的 left:100% 挂到视频右边 ——
           所以视频挪到哪儿、放大缩小，它都跟着走（位置 / 样式都在 3.css 的
           .bug-icon-14 .bug-toggle 里调）。
           · 用 <button> 而不是 <div>：键盘 Tab 能聚焦、空格 / 回车能按，读屏器认得；
           · role="switch" + aria-checked 让读屏器念“开 / 关”；
           · pointer-events 由 CSS 管（图标亮着时才可点，暗着的时候不挡鼠标）。 */
        let toggle = null;
        if (cfg.toggle) {
            toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "bug-toggle";
            toggle.setAttribute("role", "switch");
            toggle.setAttribute("aria-checked", "false");
            toggle.setAttribute("aria-label", (cfg.name || "icon") + " 开关");
            slot.appendChild(toggle);

            /* ★ 按钮上方那行字（ICONS 的 toggle.label，现在是 "Kill Switch"）：
               用 <span> 而不是写进按钮里 —— 它只是说明文字，不该参与“开关”的
               可点区域 / 读屏器的按钮名（按钮名仍由上面的 aria-label 决定）。
               位置 / 字号 / 颜色全在 3.css 的 .bug-icon-14 .bug-toggle-label 里调；
               它在 slot 里面，所以跟着视频一起出现 / 淡出，也会跟着按钮一起挪。 */
            if (cfg.toggle.label) {
                const tlabel = document.createElement("span");
                tlabel.className = "bug-toggle-label";
                tlabel.textContent = cfg.toggle.label;
                tlabel.setAttribute("aria-hidden", "true");   /* 纯装饰，读屏器跳过 */
                slot.appendChild(tlabel);
            }
        }

        /* ★ 写了 topLayer 的（现在只有 23 号这条视频）挂到【文字上面】那一层去，
           其余图标照旧挂在 z-index: 3 的 row 里（永远在文字下面），见上面 topRow 的说明。 */
        (cfg.topLayer ? topRow : row).appendChild(slot);

        return {
            cfg,
            el,                     /* <img> 或 <video>，取决于 cfg.src */
            isVideo,                /* true = 这个图标是视频（见 createIconVideo） */
            slot,
            label,
            pinned: !!cfg.pin,      /* true = 钉在屏幕上，不飘动 */
            playing: false,         /* 视频图标：现在是不是在解码播放（见 mediaLive） */
            overlay,                /* 叠在图标上的“一次性视频”（图标 8 的 CTAC.webm、图标 22 的 model.mp4） */
            overlayOn: false,       /* 这段视频现在是不是处在“该显示 / 该播”的状态（见 overlayLive） */
            overlayTries: 0,        /* play() 被拒的次数：连续失败就放弃，不再每帧重试 */
            overlayBroken: false,   /* true = 这段视频加载 / 解码不出来（文件路径不对等），彻底不管它 */
            replay,                 /* “播放 / 暂停 / 重播”按钮（<button>；只有写了 ICONS 的 video.replay 才有） */
            replayState: null,      /* 按钮上一帧画的是哪种状态（"pause" / "play" / "replay"，见 paintReplay） */
            toggle,                 /* 开关按钮（<button>；只有写了 ICONS 的 toggle 才有） */
            sw: {                   /* 开关 / 正放 / 倒放的状态机（见下面的 switchTick） */
                on: false,              /* false = 关（灰）· true = 开（绿） */
                anim: 0,                /* 0 = 没在动 · 1 = 正放中 · -1 = 倒放中 */
                raf: null,              /* 收尾监视 / 倒放用的 rAF 句柄 */
                live: false,            /* 上一帧这只图标是不是亮的（用来判断“刚亮起 / 刚暗下”） */
                ready: false            /* 静止帧有没有摆过（metadata 到位后才摆得动） */
            },
            drift: null,
            lastX: null,
            lastY: null
        };
    });

    /* ★ 叠加视频自己出错（文件没放对 / 浏览器不支持这种编码 / 网络断了）→ 记一笔：
       之后 overlayLive() 就再也不去 play() 它了（错误信息由 createOverlayVideo 里
       挂的 iconErrorHandler 打给控制台），静态图照旧显示在原位，页面不会因此坏掉。 */
    nodes.forEach(n => {
        if (!n.overlay) return;
        n.overlay.addEventListener("error", () => {
            n.overlayBroken = true;
            n.overlay.style.opacity = "0";
        });

        /* ★ 可选：ICONS 里写 video: { src: "...", hold: true }，
             播完就让视频停在自己的最后一帧、不回到静态图。
             默认（不写 hold）是下面这一支：收起视频、露出原来那张静态图。 */
        if (n.cfg.video && !n.cfg.video.hold) {
            n.overlay.addEventListener("ended", () => {
                /* ★ 只播一次，播完【定格在现在这张静态图上】：
                   收起视频、把静态图放回来（CSS 的 .is-overlay-video 一摘就恢复）。 */
                n.overlay.style.opacity = "0";
                n.slot.classList.remove("is-overlay-video");
            });
        }

        /* ★ 视频真的开始出画面了，才把下面那张静态图藏起来：
           数据还没到时视频是透明的，前面露出来的仍然是静态图，不会空一片。
           （两段素材长宽比不同，静态图一直亮着会看到两个大小不同的图案。）
           ★ 带电源按钮的那种（replay: true，图标 22）不做这一手：
             视频是【叠在图标上】的，图标本来就是它的底，藏掉反而会露出空框。 */
        if (!(n.cfg.video && n.cfg.video.replay)) {
            n.overlay.addEventListener("playing", () => {
                if (n.overlayOn) n.slot.classList.add("is-overlay-video");
            });
        }
    });

    /* ★ 开关按钮（★ 现在【没有】图标写 toggle：ico14 已换成静态图，所以这一段
       一次都不会命中，只是备用）：连上点击 + 先把按钮画成“关”的样子。
       点击只负责翻状态并触发正放 / 倒放（见 toggleSwitch）；
       “亮起来 / 暗下去时该停在哪一帧”由 update() 每帧调的 switchTick() 管。
       <button> 自己会把 空格 / 回车 转成 click，所以这里只监听 click 就够了。 */
    nodes.forEach(n => {
        if (!n.toggle) return;
        n.toggle.addEventListener("click", e => {
            /* 别让点击顺带触发页面滚动 / 其它默认行为（按钮在 fixed 画框里，本来也不该滚） */
            e.preventDefault();
            e.stopPropagation();
            toggleSwitch(n);
        });
        paintToggle(n);
    });

    /* ★ 电源按钮（现在只有图标 22 的 model.mp4 有）：
       一颗按钮管三件事，按下去做什么看视频【此刻】的状态（见 toggleOverlayPlay）：
           正在播 → 停在当前帧；暂停着 → 接着播到结尾；停在最后一帧 → 从头再播一次。
       <button> 自己会把 空格 / 回车 转成 click，所以这里只监听 click 就够了。 */
    nodes.forEach(n => {
        if (!n.replay) return;
        n.replay.addEventListener("click", e => {
            /* 别让点击顺带触发页面滚动 / 其它默认行为（按钮在 fixed 画框里，本来也不该滚） */
            e.preventDefault();
            e.stopPropagation();
            toggleOverlayPlay(n);
        });

        /* ★ 按钮的无障碍标签跟着视频状态走：播起来 / 停下来 / 播完
           （还有 metadata 晚到）都重算一次，键盘和读屏用户在按之前就知道会发生什么。
           ★ data-state 同时写在按钮上（"pause" / "play" / "replay"），
             想给某一种状态换样式就直接用 CSS 选它，见 3.css 那一段的说明。 */
        if (n.overlay) {
            ["play", "pause", "ended", "loadedmetadata"].forEach(ev => {
                n.overlay.addEventListener(ev, () => paintReplay(n));
            });
        }
        paintReplay(n);
    });

    function mount() {
        if (!document.body) return false;
        if (!row.isConnected) document.body.appendChild(row);
        /* ★ 文字上面那一层也要挂上（图标 23 在里面）：
           它排在 row 后面挂，所以和 text-11 打平时（都 11）靠 DOM 顺序压住文字。 */
        if (!topRow.isConnected) document.body.appendChild(topRow);
        return true;
    }

    mount();
    if (!row.isConnected) document.addEventListener("DOMContentLoaded", mount, { once: true });

    /* 先把【会飘动的】那几个图标的初始落点和初始方向定好（视口百分比），
       免得第一帧之前它们全都堆在画框左上角闪一下。
       ★ 落点是【随机】的（resetDrift → pickStart），每次刷新都不一样；
         这里立刻写进内联样式，所以 3.css 里 .bug-icon-1 / -3 / -4 的 left / top
         只是脚本还没跑起来时的兜底，正常不会看到。
       ★ pin 的图标不写内联位置：它们的位置由 3.css 的 .bug-icon-5 / -6 决定，
         写了内联样式反而会盖住 CSS，位置就改不动了。 */
    nodes.forEach(n => {
        if (n.pinned) return;
        resetDrift(n);
        n.slot.style.left = n.drift.pos.x + "%";
        n.slot.style.top = n.drift.pos.y + "%";
    });

    /* 素材加载完成时补一次“按真实尺寸摆位置”：
       刚进页面时素材还没下载完，driftHalfSize() 只能返回兜底尺寸，随机落点是按
       那个尺寸挑的，可能有一块会露在运动区域外面。素材一就绪就在这里修正：
         · 还没亮起来（最常见）→ 按真实尺寸重新随机一个落点，用户看不到任何跳动；
         · 已经亮着（素材很慢才加载完）→ 只更新尺寸并夹回运动区域，不重挑落点。
       ★ 图片的“就绪”事件是 load；<video> 从来不触发 load，要听 loadedmetadata
         （拿到宽高 / 时长的那一刻）。听错事件，视频图标的尺寸就永远停在兜底值上。
       ★ 拿不到真实尺寸、或者已经量过（drift.measured）时，这里什么都不做。 */
    nodes.forEach(n => {
        if (n.pinned || !n.el) return;
        n.el.addEventListener(n.isVideo ? "loadedmetadata" : "load", () => {
            if (!n.drift || n.drift.measured) return;
            const size = driftHalfSize(n);
            if (!size.measured) return;
            n.drift.half = size;
            n.drift.measured = true;
            if (n.drift.vis) {
                const R = startRange(size, n);
                n.drift.pos.x = clamp(n.drift.pos.x, R.minX, R.maxX);
                n.drift.pos.y = clamp(n.drift.pos.y, R.minY, R.maxY);
            } else {
                n.drift.pos = pickStart(n, size);
            }
            n.lastX = n.lastY = null;
            driftPaint(n);
        });
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

    /* ---- ico6 的起点：BEGINNING 整段演完（弹出淡入 + 缩回原大小）那一刻 ----
       BEGINNING 的动画归 4.js 管，它把两个时间点挂到 window.__beginning 上：
           start(item) —— 开始出现      done(item) —— 缩回原大小、整段结束
       两段时长会按“这句还能在画面上待多久”整体压缩（MIN_FIT），所以
       done 不能在这里用秒数硬算，必须问 4.js（每帧调用，1.js 重建时间轴后也自动跟上）。
       ★ 4.js 还没加载 / 被删掉时（只有本文件在跑）退回一个合理的兜底：
         ico7 结束在 1.6、BEGINNING 两段合计 2.5，合起来是 H 往后再 3.1 个窗口
         （= 1.86 秒），和 4.js 正常运行时的时刻基本对齐。 */
    function beginningDone(item) {
        const b = window.__beginning;
        if (b && typeof b.done === "function") {
            const v = b.done(item);
            if (typeof v === "number" && isFinite(v)) return v;
        }
        return item.H + (item.H - item.A) * 3.1;
    }

    /* ---- 把 ICONS 里的 start / end 翻译成时间轴上的绝对进度 ----
       一段文字的四个时刻（1.js 的时间轴里就这么叫）：
           A = 开始淡入     H = 淡入结束（完全看清）
           B = 开始淡出     E = 完全消失
       返回 { a, b, clock }
           a / b = 淡入窗口的两个端点（进度值，b > a）
           clock = 这段窗口该看哪个时钟（cur 或 freezePos）
       ★ 如果认的那段文字落在冻结组里（1.js 的 FREEZE_GROUPS），它的 A/H/B/E
         只在冻结播放期间才被走到，而那时冻结组的时钟是 freezePos（1.js 的
         render() 也是这么取），所以这里必须把时钟一起算出来，不能一律用 cur，
         否则那些时刻会对应不到正确的进度。 */
    function resolveWindow(cfg, host) {
        /* 这一段窗口认哪一段文字当时钟：默认 host 自己，也可用 start.from 指定 */
        const fromItem = (cfg.start && cfg.start.from) ? findItem(cfg.start.from) : host;
        if (!fromItem) return null;

        const clock = clockOf(fromItem);
        /* 四个记号都能用：图标 1 用 A（跟着那段文字一起出现）、
           图标 3 用 B（跟着 text-4 一起暗下去的时候淡入）、
           图标 4 用 H（等 text-5 完全亮起来之后） */
        const mark = { A: fromItem.A, H: fromItem.H, B: fromItem.B, E: fromItem.E };
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

        /* 淡入起点：图标 1 = text-4 的 A（跟着 text-4 一起出现）、
           图标 3 = text-4 的 B（text-4 开始淡出的时候）、
           图标 4 = text-5 的 H（text-5 完全淡入之后） */
        const a = at("start", "A");

        /* 淡入终点：显式写了 end 就用它，否则默认“从起点往后淡入 host 的淡入时长”，
           于是图标 3 / 4 的淡入时长和图标 1 完全一样 —— 出场时间都不变。 */
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
         offset* 在这一页拿不到可靠的值。
       ★ measured = 这次量到的是不是【图片真实渲染出来的尺寸】：
         图片还没加载完时拿不到宽高，这里退回兜底尺寸，随机落点就得等
         第一次亮起来、拿到真实尺寸时再挑一遍（见 driftVisible）。 */
    function driftHalfSize(n) {
        const box = n.slot || n.el;
        const r = (box && typeof box.getBoundingClientRect === "function")
            ? box.getBoundingClientRect()
            : null;
        const iw = window.innerWidth || 1;
        const ih = window.innerHeight || 1;
        /* ★ 视频在 loadedmetadata 之前，浏览器会先按默认的 300×150 撑出一个盒子，
             那个尺寸不是真尺寸（宽高比都可能反），不能当成“量到了”。 */
        const ready = !n.isVideo || !!(n.el && n.el.videoWidth);
        const measured = !!(r && r.width && r.height) && ready;
        let w = r && r.width ? r.width : 240;
        let h = r && r.height ? r.height : 300;
        /* 极端情况保护：图不能比屏幕还大（否则永远在撞墙、抖个不停） */
        w = Math.min(w, iw * 0.9);
        h = Math.min(h, ih * 0.9);
        return { hw: (w / iw) * 50, hh: (h / ih) * 50, measured };
    }

    /* 这一只图标自己的运动区域：
       ICONS 里写了 area 就用它，没写就用上面 DRIFT.area（全局默认）。
       有了它，图标 15 ~ 18 可以独立钉在 top 0~100% / right 0~60% 里来回弹，
       而以后改 DRIFT.area（影响图标 1 / 3 / 4）不会连它们一起挪。 */
    function areaOf(n) {
        const own = n && n.cfg && n.cfg.area;
        return own || DRIFT.area || { left: 0, right: 100, top: 0, bottom: 100 };
    }

    /* 运动区域里，图标左上角允许取的范围（已经减掉图标自身的宽高，判定按图片边缘） */
    function startRange(size, n) {
        const A = areaOf(n);
        return {
            minX: A.left,
            maxX: Math.max(A.left, A.right - 2 * size.hw),
            minY: A.top,
            maxY: Math.max(A.top, A.bottom - 2 * size.hh)
        };
    }

    /* ---- 随机初始落点：在运动区域里随便挑一个位置 ----
       挑的时候会尽量避开【已经在场的其它图标】，免得一开场三个叠成一团：
         · 最多试 DRIFT.startTries 次，第一个“和谁都不重叠”的落点直接采用；
         · 全都重叠（区域太窄 / 图太大）就用“重叠最少”的那个 ——
           它一开局就会按碰撞互相弹开，不会叠死在原地；
         · startGap 是额外要求的最小间距（视口百分比），0 = 贴着也算不重叠。
       ★ 不管挑到哪个，落点一定在 area 里，所以初始位置永远在运动范围内。 */
    function pickStart(n, size) {
        const R = startRange(size, n);
        const gap = Math.max(0, DRIFT.startGap || 0);
        const others = nodes.filter(o => o !== n && o.drift && !o.pinned);
        const tries = Math.max(1, DRIFT.startTries || 1);

        /* score = 0 表示和谁都不重叠；越小越“分得开” */
        let best = null;
        let bestScore = Infinity;

        for (let k = 0; k < tries; k++) {
            const x = rand(R.minX, R.maxX);
            const y = rand(R.minY, R.maxY);
            let score = 0;
            for (let j = 0; j < others.length; j++) {
                const d = others[j].drift;
                /* 两个盒子在 x / y 方向上的重叠量（都 ≤ 0 = 分开了） */
                const ox = (d.half.hw + size.hw + gap) - Math.abs((d.pos.x + d.half.hw) - (x + size.hw));
                const oy = (d.half.hh + size.hh + gap) - Math.abs((d.pos.y + d.half.hh) - (y + size.hh));
                if (ox > 0 && oy > 0) score += Math.min(ox, oy);
            }
            if (score <= 0) return { x, y };              /* 完全分开了，直接用 */
            if (score < bestScore) { bestScore = score; best = { x, y }; }
        }
        return best || { x: rand(R.minX, R.maxX), y: rand(R.minY, R.maxY) };
    }

    /* 决定一个图标的初始落点：
       randomStart = true（默认）→ 在运动区域里随机挑（见 pickStart）；
       randomStart = false       → 用 seed 里写死的 left / top（老样子，可复现）。
       两条路都会夹进运动区域，所以以后改 DRIFT.area 也不会让图标一开始就在区域外面。 */
    function startPos(n, size, s) {
        if (DRIFT.randomStart) return pickStart(n, size);
        const R = startRange(size, n);
        return { x: clamp(s.left, R.minX, R.maxX), y: clamp(s.top, R.minY, R.maxY) };
    }

    function resetDrift(n) {
        const i = nodes.indexOf(n);
        const s = (DRIFT.seed && DRIFT.seed[i]) || { left: 30, top: 50, dir: [1, 0] };
        const size = driftHalfSize(n);
        const sp = DRIFT.speed * rand(1 - DRIFT.speedJitter, 1 + DRIFT.speedJitter);

        /* 初始方向：默认沿用 seed.dir（老样子）；随机方向有两种开法 ——
             · 全局：DRIFT.randomDir = true（影响所有飘动的图标）；
             · 单个：在 ICONS 那一条里写 randomDir: true（图标 15 ~ 18 就是这么开的，
               三只同款图标才不会排成一条线往同一个方向飞）。
           单个写了就以它为准，没写才看全局。 */
        let dx = (s.dir && s.dir[0]) || 1;
        let dy = (s.dir && s.dir[1]) || 0;
        const rd = (n.cfg && n.cfg.randomDir != null) ? n.cfg.randomDir : DRIFT.randomDir;
        if (rd) {
            const ang = Math.random() * Math.PI * 2;
            dx = Math.cos(ang);
            dy = Math.sin(ang);
        }
        const L = len({ x: dx, y: dy }) || 1;

        n.drift = {
            pos: startPos(n, size, s),                    /* ★ 随机落点：在运动范围内，尽量不重叠 */
            vel: { x: dx / L * sp, y: dy / L * sp },
            half: size,
            measured: !!size.measured,
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
       ★ 边界来自 areaOf(n)：图标自己写了 area 就用它（图标 15 ~ 18 就是
         top 0~100% / right 0~60%），没写就用全局的 DRIFT.area；
         和图片边缘比较，所以图标的【外沿】最多到 right 那条线。 */
    function bounceWalls(n) {
        const d = n.drift;
        const { hw, hh } = d.half;
        if (!d.vis) return;

        const A = areaOf(n);
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
       每次重新亮起来的时候，把尺寸重量一遍（窗口大小 / 图片加载完成都可能让它变）。
       ★ 第一次拿到【图片真实尺寸】时还要重挑一次初始落点：
         页面刚加载时图片还没下载完，resetDrift() 只能按兜底尺寸随机落点，
         那个落点按真实尺寸算可能有一块露在运动区域外面；
         重挑发生在图标刚亮起、几乎还看不见的那一帧，所以看不出跳动。 */
    function driftVisible(n, visible) {
        if (!n.drift) resetDrift(n);
        const v = !!visible;
        if (v && !n.drift.vis) {
            const size = driftHalfSize(n);
            const fresh = DRIFT.randomStart && size.measured && !n.drift.measured;
            n.drift.half = size;
            n.drift.measured = !!size.measured;
            if (fresh) {
                n.drift.pos = pickStart(n, size);    /* 按真实尺寸重新随机一个落点 */
                n.lastX = n.lastY = null;
                driftPaint(n);                      /* 立刻写一次，别闪一下老位置 */
            }
        }
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

    /* 视频图标：只在【真正看得见】的时候才解码播放 ——
       图标大部分时间是全透明的（opacity 0 并不会让视频停止解码），
       一个看不见的视频一直在解码纯粹是白烧 CPU / 电量。
       ★ pause() 不会丢播放进度，下次亮起来会接着播。
       ★ 例外是“一次性视频”（ICONS 里写了 autoplay: false 的那种，比如 ico10 的 title.mp4）：
         它不进页面就播，而是等这只图标亮起来（text-10 淡入）才播；而且
         【不会因为看不见就暂停】——
         这类素材比较长（title.mp4 有 13 秒），一暗下去就暂停的话，
         人往下滚两屏它就再也走不到结尾，“定格在最后一帧”也就永远不会发生；
         反正只播一次，让它自己安静走完最省事。 */
    function mediaLive(n, on) {
        if (!n.el || !n.isVideo) return;
        const v = !!on;
        if (v === n.playing) return;
        n.playing = v;

        /* ---- 一次性视频（autoplay: false）---- */
        if (n.cfg.autoplay === false) {
            if (!v) return;                          /* ★ 暗下去也不暂停：让它自己走完 */
            /* 已经播完（正定格在最后一帧）→ 再亮起来时从头再演一遍；
               还没播完（中途滚走了）→ 接着播，不倒退。 */
            if (n.el.ended) {
                try { n.el.currentTime = 0; } catch (err) { /* metadata 还没到，忽略 */ }
            }
            const p1 = n.el.play();
            if (p1 && typeof p1.catch === "function") p1.catch(() => {});
            return;
        }

        if (v) {
            const p = n.el.play();                    /* 被浏览器拒掉也无所谓，下帧还会再试 */
            if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
            n.el.pause();
        }
    }

    /* ======================= 开关按钮（原来给图标 14 的 suicide 用） =======================
       ★★ 现在处于【停用状态】：ico14 已改成静态图 platform.avif，没有再写 toggle，
          所以下面这一整节（switchEnd / switchRest / paintToggle / switchAnimate /
          toggleSwitch / switchTick / mediaOrSwitch）永远不会生效 —— 只是缓存代码，
          留着是为了将来想恢复“开关 + 正放倒放”时不用重写（3.css 里的样式也备份着）。
       一个两态开关（绿 = 开 / 灰 = 关），它同时决定视频停在哪一帧、以及往哪个方向演：

           关（灰）  ──正放 0 → 最后一帧──▶  开（绿）     【开 = 灰 / 最后一帧】
           开（绿）  ──倒放 最后一帧 → 0──▶  关（灰）     【关 = 彩 / 第一帧】

       ★ 为什么“倒放”要自己写：浏览器的 playbackRate 不接受负数（写 -1 会被夹到 0.0625），
         所以开 → 关 是靠一个 rAF 循环把 currentTime 一点点往回拨（≈ 1 倍速）。
         正放则直接用 play()，另配一个 rAF 盯着“画面放完了没有”。
       ★ 为什么正放要盯着停：这个素材的容器时长 2.10s，但画面到 1.13s 就结束了
         （后面是静音尾巴）。不管的话，正放会在灰色的最后一帧上白等 1 秒，
         再点“关”时还会先卡一下。停在哪由 ICONS 里的 toggle.end 决定。
       ★ 静止帧（“不点击的时候”）：关 → currentTime = 0（第一帧，彩色）；
         开 → currentTime = end（最后一帧，灰色）。图标每次亮起来 / 暗下去都会重新摆一次，
         所以滚走再滚回来、换窗口大小，看到的都是该有的那一帧。 */

    /* 画面真正结束的时刻：ICONS 的 toggle.end 优先（它比容器短），拿不到就用容器时长 */
    function switchEnd(n) {
        const v = n.el;
        const dur = (v && isFinite(v.duration) && v.duration > 0) ? v.duration : 0;
        const cfgEnd = (n.cfg.toggle && typeof n.cfg.toggle.end === "number") ? n.cfg.toggle.end : 0;
        if (cfgEnd > 0) return dur > 0 ? Math.min(cfgEnd, dur) : cfgEnd;
        return Math.max(0, dur - 1e-3);
    }

    /* 这条状态该停在哪一帧：关 = 第一帧（彩色），开 = 最后一帧（灰色） */
    function restTime(n) {
        const end = switchEnd(n);
        return n.sw.on ? Math.max(0, end - 0.001) : 0;
    }

    /* 停掉正在跑的正放 / 倒放（不改变画面位置） */
    function switchStop(n) {
        if (n.sw.raf !== null) {
            cancelAnimationFrame(n.sw.raf);
            n.sw.raf = null;
        }
        n.sw.anim = 0;
        if (n.el) {
            try { n.el.pause(); } catch (err) { /* metadata 还没到，忽略 */ }
        }
    }

    /* 把画面钉在“这条状态该有的那一帧”上，并停下一切播放 */
    function switchRest(n) {
        switchStop(n);
        if (!n.el) return;
        const t = restTime(n);
        try {
            /* 差得远才写 currentTime：同值写入在部分浏览器上会触发一次没必要的 seek */
            if (Math.abs(n.el.currentTime - t) > 0.001) n.el.currentTime = t;
            n.sw.ready = true;
        } catch (err) {
            n.sw.ready = false;                     /* metadata 还没到：下一帧再试 */
        }
    }

    /* 把开关画成绿 / 灰（CSS 只看 .is-on 这个类） */
    function paintToggle(n) {
        if (!n.toggle) return;
        n.toggle.classList.toggle("is-on", !!n.sw.on);
        n.toggle.setAttribute("aria-checked", n.sw.on ? "true" : "false");
    }

    /* 从当前位置开始往一个方向演到那一端：
       forward = true  → 正放（→ 最后一帧），演完停在“开”的静止帧；
       forward = false → 倒放（→ 第一帧），演完停在“关”的静止帧。
       ★ 起点取“现在实际在哪”，所以连点两下不会先跳回某一端再走。 */
    function switchAnimate(n, forward) {
        if (!n.el) return;
        switchStop(n);

        const end = switchEnd(n);
        if (end <= 0) return;                       /* 时长还没读到，等下一帧 */

        const now = n.el.currentTime || 0;
        const atEnd = now >= end - 0.02;

        if (forward) {
            const from = atEnd ? 0 : Math.max(0, Math.min(now, end));   /* 已经在末尾就从头演 */
            try { n.el.currentTime = from; } catch (err) { return; }
            n.sw.anim = 1;
            const p = n.el.play();
            if (p && typeof p.catch === "function") p.catch(() => {});

            /* 看住它：走到 end（画面真正的最后一帧）就踩刹车，别播静音尾巴 */
            const watch = () => {
                if (n.sw.anim !== 1) return;
                if (!isFinite(n.el.currentTime)) { n.sw.raf = requestAnimationFrame(watch); return; }
                if (n.el.currentTime >= end - 0.005) { switchRest(n); return; }
                n.sw.raf = requestAnimationFrame(watch);
            };
            n.sw.raf = requestAnimationFrame(watch);
        } else {
            let t = atEnd ? end : Math.min(now, end);
            if (now <= 0.02) t = end;               /* 已经在开头就先把画面摆到末尾再倒着走 */
            try { n.el.currentTime = t; } catch (err) { return; }
            n.sw.anim = -1;

            let last = 0;
            const back = nowTs => {
                if (n.sw.anim !== -1) return;
                const dt = last ? Math.min(0.05, (nowTs - last) / 1000) : 1 / 60;
                last = nowTs;
                t = Math.max(0, t - dt);
                try { n.el.currentTime = t; } catch (err) { /* 忽略 */ }
                if (t <= 0.002) { switchRest(n); return; }
                n.sw.raf = requestAnimationFrame(back);
            };
            n.sw.raf = requestAnimationFrame(back);
        }
    }

    /* 点击：翻状态 → 重画按钮 → 往对应的方向演 */
    function toggleSwitch(n) {
        n.sw.on = !n.sw.on;
        paintToggle(n);
        switchAnimate(n, n.sw.on);                  /* 关 → 开 正放；开 → 关 倒放 */
    }

    /* 每帧调（代替 mediaLive）：管“亮起来 / 暗下去”时的静止帧，
       以及 metadata 晚到时补摆一次。
       ★ 图标暗下去时直接把画面钉回静止帧（视觉上看不见，正好省得它继续倒放烧 CPU），
         下次滚回来一露脸就是该有的那一帧。 */
    function switchTick(n, live) {
        if (!n.el) return;
        const v = !!live;

        if (v !== n.sw.live) {
            n.sw.live = v;
            if (!v) {
                switchRest(n);                      /* 暗下去：收工，钉回静止帧 */
                return;
            }
            if (n.sw.anim === 0) switchRest(n);      /* 刚亮起来：先把静止帧摆好 */
            return;
        }

        /* 一直亮着但静止帧还没摆成功（metadata 是后来才到的）→ 补一次 */
        if (v && !n.sw.ready && n.sw.anim === 0) switchRest(n);
    }

    /* 视频图标统一入口：有开关的交给开关，其余的仍走老的“亮起来才播”逻辑 */
    function mediaOrSwitch(n, live) {
        if (n.cfg.toggle) { switchTick(n, live); return; }
        mediaLive(n, live);
    }

    /* ================= 电源按钮：播放 / 暂停 / 重播（图标 22 右下角那颗） =================
       一颗按钮，按下去做什么完全看叠在图标里的那段视频（n.overlay，图标 22 = model.mp4）
       【此刻】的状态 —— 这就是“当视频正在播放，按下去停在当前帧；如果视频暂停，
       点击后继续播放到结束；如果页面停在最后一帧，点击后视频重新播放一次”：

           ① 正在播（paused = false）        → 停在【当前帧】（pause，进度一点都不丢）
           ② 暂停中（paused = true）         → 从当前帧【接着播到结尾】（不跳回第一帧）
           ③ 已经停在最后一帧（ended = true）→ 从第一帧【重新播一次】

       ★ 为什么 ③ 必须单拎出来判：视频播完之后 paused 也是 true，
         只按 ①② 判的话，“播完了再点”会被当成“暂停着”，结果 play() 起来立刻又到头，
         看起来就是按钮没反应。所以先判“是不是已经在结尾”。
       ★ “在结尾”还多认一种情况：currentTime 已经被拖到 / 停到时长附近（见 overlayAtEnd），
         这样手动停在最后一帧也算“页面停在最后一帧”，点一下照样从头再演一遍。
       ★ 暂停之后【不会】被 overlayLive 自动播回去：那边只看 n.overlayOn
         （已经踢过 play() 就不再动它），我们这里三种情况都把它记成 true，
         所以滚走再滚回来，画面仍然停在你按下暂停的那一帧，等你再按一次。
       ★ metadata 还没到时改 currentTime 会抛异常，忽略即可 ——
         play() 照样会把解码拉起来，从第一帧开始放。
       ★ 故意不碰 slot 的透明度 / 时间轴：按钮只管视频，图标什么时候亮由 1.js 的时间轴说了算。 */

    /* 这段视频是不是已经停在最后一帧了（播完了，或者被手动停在了结尾） */
    function overlayAtEnd(v) {
        if (!v) return false;
        if (v.ended) return true;
        const d = (isFinite(v.duration) && v.duration > 0) ? v.duration : 0;
        return d > 0 && (v.currentTime || 0) >= d - 0.05;   /* 50ms 容差：就是“最后一帧” */
    }

    /* 真正去 play()：被浏览器拦掉 / 数据还没到就放开“已经踢过”的标记，
       让下一帧的 overlayLive 还有机会重试一次。 */
    function playOverlay(n) {
        const v = n.overlay;
        if (!v) return;
        const p = v.play();
        if (p && typeof p.catch === "function") {
            p.catch(() => { n.overlayOn = false; });
        }
    }

    /* 按钮现在是什么状态（"pause" = 正在播 · "play" = 暂停着 · "replay" = 停在最后一帧） */
    function replayState(n) {
        const v = n.overlay;
        if (!v || n.overlayBroken) return "replay";
        if (overlayAtEnd(v)) return "replay";
        return v.paused ? "play" : "pause";
    }

    /* 三种状态下按钮该念什么（读屏器 / 键盘用户按之前就知道会发生什么）
       ★ 用函数而不是 const 表：上面建按钮时（模块初始化那一段）就会先调一次 paintReplay，
         那时还没执行到这里，const 会撞上暂时性死区（TDZ）报错；函数声明是提前可用的。 */
    function replayLabel(st) {
        if (st === "pause") return "暂停视频（停在当前帧）";
        if (st === "play") return "继续播放视频";
        return "重新播放视频";
    }

    /* 把按钮的 aria-label / data-state 同步成当前状态（只在真的变了的时候写 DOM） */
    function paintReplay(n) {
        const st = replayState(n);
        if (n.replayState === st) return;
        n.replayState = st;
        if (!n.replay) return;
        n.replay.setAttribute("aria-label", (n.cfg.name || "icon") + " " + replayLabel(st));
        n.replay.setAttribute("data-state", st);      /* 想按状态改样式就用它，见 3.css */
    }

    /* 点击：按上面 ①②③ 决定做什么 */
    function toggleOverlayPlay(n) {
        const v = n.overlay;
        if (!v || n.overlayBroken) return;

        n.overlayTries = 0;

        /* ③ 停在最后一帧 → 从第一帧重新播一次 */
        if (overlayAtEnd(v)) {
            n.overlayOn = true;
            v.style.opacity = "1";
            try { v.currentTime = 0; } catch (err) { /* metadata 还没到，忽略 */ }
            playOverlay(n);
            paintReplay(n);
            return;
        }

        /* ① 正在播 → 停在当前帧（不重置进度，再按一次就从这一帧接着播） */
        if (!v.paused) {
            n.overlayOn = true;                 /* 记成“已经踢过 play()”，别让 overlayLive 又去踢一脚 */
            try { v.pause(); } catch (err) { /* metadata 还没到，忽略 */ }
            paintReplay(n);
            return;
        }

        /* ② 暂停中（还没开始过也算）→ 从当前帧接着播到结尾 */
        n.overlayOn = true;
        v.style.opacity = "1";
        playOverlay(n);
        paintReplay(n);
    }

    /* ---- 图标 8 的“淡入之后插入的那段视频”（ICONS 里的 video）----
       由 update() 每帧调，两个入参：
         ready = 时间轴已经走过 text-8 的【淡入终点】（win.b）—— 也就是“文字完全亮起来了”；
         live  = 这一刻图标本身是亮的（透明度 > 0）。
       ★ 两者都成立 → 播一次（循环是关掉的）；播完的收尾见上面挂的 ended 监听：
         默认收起视频、露出原来那张静态图 = “定格在现在的图片上”。
       ★ 不成立（还没到点 / 往回滚到淡入之前 / 整只图标随 text-9 淡掉了）→
         暂停、倒回第一帧、藏起来、把静态图放回来；下次再滚到这儿会重新演一遍。
       ★ 只在【状态变化的那一帧】写 DOM：平时 want 和上一帧一样就直接返回，
         不会每帧都去 play() / pause()（那样会把视频反复打断）。 */
    function overlayLive(n, ready, live) {
        const v = n.overlay;
        if (!v || n.overlayBroken) return;

        const spec = n.cfg.video || {};

        /* ---- ② 带“电源按钮”的那种（图标 22 的 model.mp4，写了 replay: true）----
           视频【长期待在图标容器里】，透明度始终 1（显隐完全交给 slot 的 opacity）；
           图标第一次亮起来时自动播一次；
           【播完停在最后一帧】：ended 之后既不重置、也不藏起来、也不回到第一帧。
           ★ 之后的播放 / 暂停 / 重播完全交给右下角那颗电源按钮（见 toggleOverlayPlay）：
               正在播 → 停在当前帧；暂停着 → 接着播到结尾；停在最后一帧 → 从头再播一次。
           ★ 用户按了暂停之后，这里【绝不能】再把它自动播回去 —— 判据是 n.overlayOn
             （已经踢过 play() 就不动它，暂停也不会把它清掉），
             所以滚出画面再滚回来，画面仍然停在你按下暂停的那一帧，等你再按一次。
           亮不亮都不暂停 —— 它只播一次，暗下去就暂停的话可能永远走不到结尾。 */
        if (spec.replay) {
            /* 只写一次（只在真的变了的时候写 DOM，免得每帧都动样式） */
            if (v.style.opacity !== "1") v.style.opacity = "1";

            /* 图标还没亮 / 已经踢过 play() 了 → 什么都不做（绝不每帧重播） */
            if (!live || n.overlayOn) return;

            /* 已经播完（正定格在最后一帧）就不再自动从头来：想再看一遍就点那颗按钮
               （它在“停在最后一帧”时会从第一帧重播一次）。
               往回滚出画面再回来也不会重播 —— 定格就是定格。 */
            if (v.ended) return;

            n.overlayOn = true;                  /* 记下“已经踢过 play()”：之后全交给 toggleOverlayPlay */

            /* ★ 数据还没到 / 浏览器把这次 play() 拦掉 → 放开标记，下一帧再试；
                 连着失败很多次（文件丢了、编码不支持）才彻底放弃。 */
            const pr = v.play();
            if (pr && typeof pr.catch === "function") {
                pr.catch(() => {
                    n.overlayOn = false;
                    n.overlayTries += 1;
                    if (n.overlayTries >= 60) {
                        n.overlayBroken = true;
                        v.style.opacity = "0";
                    }
                });
            }
            return;
        }

        const want = !!(ready && live);
        if (want === n.overlayOn) return;        /* 状态没变：正在播 / 已经播完 都别动它 */
        n.overlayOn = want;

        if (want) {
            /* ★ 先亮出来，再开始播；数据还没到时视频本身是透明的，
                 露出来的仍然是下面那张静态图（静态图由 .is-overlay-video 淡出，
                 等 'playing' 真的出画了才藏）。 */
            v.style.opacity = "1";
            const p = v.play();
            if (p && typeof p.catch === "function") {
                /* 被浏览器拦掉 / 数据还没到 → 下一帧再看情况重试；
                   连着失败很多次（文件丢了、编码不支持）就彻底放弃 ——
                   静态图本来就在原位显示，页面不会因为这段视频坏掉。 */
                p.catch(() => {
                    n.overlayTries += 1;
                    if (n.overlayTries >= 30) {
                        n.overlayBroken = true;
                        v.style.opacity = "0";
                        n.slot.classList.remove("is-overlay-video");
                    } else {
                        n.overlayOn = false;
                    }
                });
            }
        } else {
            v.style.opacity = "0";
            n.slot.classList.remove("is-overlay-video");   /* 静态图放回来 */
            try {
                v.pause();
                if (v.currentTime > 0) v.currentTime = 0;   /* 复位到第一帧，下次从头演 */
            } catch (err) {
                /* metadata 还没到位时改 currentTime 会抛，忽略即可 */
            }
        }
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

    /* 有没有图标正在飘（没有就不用自己排帧了）
       ★ 图标 5 / 6 的“呼吸 + 微动”也走这个 rAF 循环，所以亮着它们时也要继续排帧。 */
    function driftActive() {
        if (PULSE.on && nodes.some(n => n.pulse && n.pulse.live)) return true;
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

        /* ★ 图标 5 / 6 的原地呼吸 + 随机微动：和飘动同一条时间基准（dt），同一个循环，
           这样页面停住不滚的时候它们也还在轻轻动。 */
        pulseStep(dt);

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

    /* ======================= 3.4 图标 5 / 6：原地“呼吸” + 随机微动 =======================
       这两只是在 3.css 里钉死位置的（pin: true），不参与上面那套台球飘动。
       需求：让它们【就在原地】略微放大缩小（呼吸），并且在一小块范围里随机游走。

       做法：
         · 呼吸：每只自己一个随机周期 / 相位，scale = 1 ± PULSE.scale，慢慢来回；
         · 随机游走：每隔 1~3 秒在【椭圆】里随机挑一个目标点，然后平滑跟过去 ——
           所以是“悠着飘”，不会一格一格地跳；椭圆（横向半径 > 纵向）看起来像浮着；
         · 位移 / 缩放都写进 slot 的 inline transform，但【接在 CSS 原来的 transform 后面】：
             图标 5 的 CSS transform 是 none；
             图标 6 是 translateX(-50%)（水平居中用的）——
           直接写 transform 会把 ico6 的居中弄丢，所以先把它读出来缓存成 base，
           每帧再拼成 base + translate(偏移) + scale(缩放)。
         · 只在图标亮着的时候推进（update() 每帧写 st.live），暗下去就停、也不写 DOM。
       ★ 想调：改下面 PULSE 里那几个数；想让别的图标也这样，把它的类名加进 cls 即可。
       ★ 这两只同时还是图标 7（箭头）的定位参考（placeBetween 每帧量它们的盒子）：
         所以它们微动时，箭头会在下一次 update()（也就是下一次滚动）重新对齐到两只中间；
         偏移最多十几像素、箭头本身 100px 高，这点差异看不出来 —— 不用特殊处理。
       ========================================================================== */
    const PULSE = {
        on: true,
        /* 要这个效果的图标（类名 → true）。现在只有 5 / 6 号 */
        cls: { "bug-icon-5": true, "bug-icon-6": true },
        scale: 0.035,        /* 呼吸幅度：±3.5%（想更明显 0.06，想几乎看不出 0.015） */
        periodMin: 2.6,      /* 呼吸周期（秒）：每只在 [min,max] 里各取一个，两只不会同步 */
        periodMax: 4.2,
        radius: 14,          /* 随机游走的水平半径（px）—— 想走远一点就调大 */
        radiusY: 9,          /* 竖直半径小一点，看起来是“浮着”而不是“跑掉” */
        retargetMin: 1.2,    /* 每隔 1.2 ~ 2.6 秒换一个目标点（秒） */
        retargetMax: 2.6,
        follow: 0.05         /* 逼近目标的快慢：0.05 ≈ 每秒走完 95%；调小更黏、调大更灵 */
    };

    let pulseT = 0;          /* 自己的时间轴（秒）：只用来推呼吸相位 */

    /* 一只图标的初始状态（每只的呼吸相位 / 周期都是随机的，刷新也不一样） */
    function makePulse() {
        return {
            base: null,                          /* 缓存 CSS 自带的 transform（见上面说明） */
            x: 0, y: 0,                          /* 当前偏移（px） */
            tx: 0, ty: 0,                        /* 目标偏移（px） */
            next: 0,                             /* 下一次换目标的时间点（pulseT 秒） */
            phase: Math.random() * Math.PI * 2,  /* 呼吸初相：两只不同步 */
            w: (Math.PI * 2) / rand(PULSE.periodMin, PULSE.periodMax),
            live: false                          /* 现在亮着吗（update() 每帧写） */
        };
    }

    nodes.forEach(n => { if (n.cfg && PULSE.cls[n.cfg.cls]) n.pulse = makePulse(); });

    /* CSS 里原本的 transform（computed 会变成 matrix）—— 只读一次，之后用缓存 */
    function pulseBase(n) {
        const st = n.pulse;
        if (st.base !== null) return st.base;
        /* ★ 读之前先把自己上一帧写的那串摘掉：
           否则 computed 拿到的是“base + 偏移 + 缩放”，会被当成新的 base，越叠越远。 */
        n.slot.style.transform = "";
        const t = getComputedStyle(n.slot).transform;
        st.base = (!t || t === "none") ? "" : t + " ";
        return st.base;
    }

    /* CSS 的 transform 变了（窗口缩放 / 素材加载完，ico6 的宽度一变 translateX(-50%) 就不同）
       → 丢掉缓存，下一帧重新读一次 */
    function pulseInvalidate() {
        nodes.forEach(n => {
            if (!n.pulse) return;
            n.pulse.base = null;
        });
    }
    window.addEventListener("resize", pulseInvalidate);
    nodes.forEach(n => {
        if (!n.pulse || !n.el) return;
        n.el.addEventListener(n.isVideo ? "loadedmetadata" : "load", pulseInvalidate);
    });

    /* 每帧推进：呼吸 + 随机游走，然后画到 DOM */
    function pulseStep(dt) {
        if (!PULSE.on) return;
        pulseT += dt;

        nodes.forEach(n => {
            const st = n.pulse;
            if (!st || !st.live) return;         /* 没亮着：不推进、不写 DOM */

            /* ---- 随机游走：到点了就换一个椭圆内的目标点 ---- */
            if (pulseT >= st.next) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random());     /* 开方 → 点在椭圆里分布均匀 */
                st.tx = Math.cos(a) * r * PULSE.radius;
                st.ty = Math.sin(a) * r * PULSE.radiusY;
                st.next = pulseT + rand(PULSE.retargetMin, PULSE.retargetMax);
            }

            /* 平滑逼近目标：每帧走近 follow% 的剩余距离（换算过 dt，60Hz 以外的帧率也一致） */
            const k = 1 - Math.pow(1 - PULSE.follow, dt * 60);
            st.x += (st.tx - st.x) * k;
            st.y += (st.ty - st.y) * k;

            /* ---- 呼吸：每只自己的相位 / 周期 ---- */
            const s = 1 + PULSE.scale * Math.sin(st.phase + pulseT * st.w);

            n.slot.style.transform =
                pulseBase(n) +
                "translate(" + st.x.toFixed(2) + "px, " + st.y.toFixed(2) + "px) " +
                "scale(" + s.toFixed(4) + ")";
        });
    }

    /* ======================= 3.5 text-11 的出场：从视频里“弹”到最终位置 =======================
       需求：text-11 不再只是“原地淡入”，而是【从图标 23 那段视频（tool.webm）内部，
       一个很小的字块】一边淡入、一边长大，同时移到它最终的位置（1.js 算好的锚线位置）。
       淡出【完全不动】：走完这一段之后，这里就再也不碰它，回到 1.js 原来的原地淡出。

       做法（为什么这么写）：
         · 文字的位置 / 透明度平时全归 1.js 的 render() 管，它每帧写
           `el.style.transform = translate(0px, dy)`；
         · 3.js 的 update() 是包在 1.js 的 render() 外面跑的（见文件末尾 hook()），
           所以这里执行时，文字已经是 1.js 写好的“最终位置”；
         · 于是只要在【淡入这一段】把 1.js 那一串 transform 【再接上一段】
           translate + scale 就行 —— 接在它后面，所以不会盖掉 / 打乱 1.js 的定位；
         · 1.js 下一帧会重新写 transform，追加的那段自然消失，不会越叠越多。

       ★ 起点在哪里、一开始多大：不在这个文件里写死，而是去 3.css 的 .text-11 改
            --pop-x / --pop-y   ：起点（文字中心）在【图标 23 的视频盒子】里的位置，% 相对视频
            --pop-scale         ：起点大小 = 最终字号的多少倍
         百分比是相对【视频盒子】的，所以视频挪到哪儿、放大缩小，弹出的起点都跟着走。
       ★ 弹出速度：下面的 span —— 占【淡入窗口】的倍数（1 = 和淡入同时弹到位）。 */
    const TEXT_POP = {
        text: ".text-11",              /* 要加这段出场的文字 */
        icon: "bug-icon-23",           /* 它从哪个图标的视频盒子里弹出来 */
        /* 弹出动画的时长 = text-11 的淡入窗口 × span：
           ★ 现在是 0.6 —— 比上一版（3）【快 5 倍】，几乎是一下子“窜”出来就到位了。
           1    = 淡入走完时正好弹到位；
           0.6  = 比淡入还早弹到位（弹完时文字才 94% 不透明）；
           想更干脆就调小（0.4），想慢一点就调大（1.5 / 3）。 */
        span: 0.6
    };

    /* 弹出用的缓动：easeInOut cubic（先慢 → 中间快 → 最后收住）。
       ★ 为什么不用和淡入同款的 easeOut：素材的淡入窗口只有 0.5 秒上下，
         easeOut 在前 0.3 秒就已经走完 70%，看起来就是“直接淡入、稍微放大一点”；
         easeInOut 能让字先“很小、几乎不动”地待一下，再明显长大 —— 才像弹出来。 */
    const popEase = t => (t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2);

    /* 读 CSS 变量里的数字（--pop-scale 这种）：读不到 / 不是数字就用兜底值 */
    function popNum(cs, name, dflt) {
        const v = parseFloat(cs.getPropertyValue(name));
        return isFinite(v) ? v : dflt;
    }

    /* 读 CSS 变量里的长度（--pop-x 这种）：% 按 ref 换算成 px，其它单位当 px 用 */
    function popLen(cs, name, ref, dfltRatio) {
        const raw = String(cs.getPropertyValue(name) || "").trim();
        const v = parseFloat(raw);
        if (!isFinite(v)) return ref * dfltRatio;
        if (raw.slice(-1) === "%") return ref * v / 100;
        return v;
    }

    /* 把这一帧该追加的 transform 接在 1.js 写好的那一串后面。
       ★ 为什么要记住上一帧接了什么：正常情况下 1.js 每帧都会把 transform 重置成它自己的，
         这里只是防止“没有 1.js 重绘的那一帧”（比如兜底 rAF）把同一段接两遍。 */
    function popAppend(el, add) {
        let base = el.style.transform || "";
        const prev = el.__popAdd;
        if (prev && base.slice(-prev.length) === prev) base = base.slice(0, -prev.length);
        if (!base || base === "none") base = "";
        el.style.transform = base + add;
        el.__popAdd = add;
    }

    /* 每帧调用：只有落在“弹出窗口”里才动 text-11，其它时间一个字都不改 */
    function textPopUpdate() {
        const it = findItem(TEXT_POP.text);
        if (!it) return;
        const n = nodes.find(x => x.cfg && x.cfg.cls === TEXT_POP.icon);
        if (!n) return;

        const p = clockOf(it);
        const a = it.A;
        /* 弹出窗口的终点：淡入窗口 × span，但绝不超过【开始淡出】那一刻（it.B） */
        const end = Math.min(a + (it.H - it.A) * TEXT_POP.span, it.B);
        /* 还没露头 / 已经弹到位 / 已经在淡出了 → 全部交回 1.js，这里不碰 */
        if (!(p > a) || p >= end || p >= it.E) return;

        const el = it.el;
        if (!el || el.style.visibility === "hidden") return;

        const vr = n.slot.getBoundingClientRect();       /* 视频盒子（它就是要弹出来的那个洞） */
        if (!vr.width || !vr.height) return;

        /* ★ 必须在这里量：此刻元素的 transform 还是 1.js 刚写的那一串（只平移、没缩放），
           所以量到的就是“最终位置”，可以直接拿来算起点到终点的位移。 */
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;

        const cs = getComputedStyle(el);
        const w = r.width;
        const h = r.height;
        const s0 = clamp(popNum(cs, "--pop-scale", 0.14), 0.02, 1);
        const tx = vr.left + popLen(cs, "--pop-x", vr.width, 0.5);
        const ty = vr.top + popLen(cs, "--pop-y", vr.height, 0.5);

        /* 缓动用 popEase（easeInOut）：先慢、中间快、最后收住，见上面 popEase 的说明 */
        const e = popEase(clamp01((p - a) / Math.max(1e-6, end - a)));
        const s = s0 + (1 - s0) * e;

        /* 文字中心：从视频盒子里的那一点，缓动移到它自己的最终中心 */
        const cx = r.left + w / 2;
        const cy = r.top + h / 2;
        const px = tx + (cx - tx) * e;
        const py = ty + (cy - ty) * e;

        /* 1.css 给 .text-box 写的是 transform-origin: 0 0（以左上角缩放），
           所以缩放之后要自己把左上角算回去，才能让“中心”落在上面那个点上。 */
        const dx = px - (w * s) / 2 - r.left;
        const dy = py - (h * s) / 2 - r.top;

        popAppend(el,
            " translate(" + dx.toFixed(2) + "px, " + dy.toFixed(2) + "px)" +
            " scale(" + s.toFixed(4) + ")");
    }

    /* ======================= 4. 每帧算图标的透明度 ======================= */
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
                mediaOrSwitch(n, false);
                overlayLive(n, false, false);       /* 叠加视频（图标 8）也一起停下来 */
                driftVisible(n, false);
                return;
            }

            const win = resolveWindow(n.cfg, host);
            if (!win) {
                n.slot.style.opacity = "0";
                hoverable(n, false);
                mediaOrSwitch(n, false);
                overlayLive(n, false, false);       /* 叠加视频（图标 8）也一起停下来 */
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
                   ★ 唯一的例外：这一段的淡入算在冻结组的账上（起点认的那段文字在
                      FREEZE_GROUPS 里时），冻结组演到头就停了 —— 要是淡入尾巴
                      被切在 z1 外面，干脆把整条淡入曲线按 z1 收尾，收不干净的部分
                      交给下面 (1 - outT) 收，免得图标在冻结演完时“啪”地闪一下才消失。 */
                const wZ = win.fromItem && win.fromItem.freezeZone;
                const wEnd = wZ ? (wZ.z1 - wZ.hit) : Infinity;
                const bEnd = Math.min(win.b, wEnd);
                op = (bEnd > p)
                    ? easeOut(clamp01((p - win.a) / (bEnd - win.a)))
                    : 1;
            }

            /* 按各自的淡出宿主淡出：图标 1 / 3 / 4 = text-5 开始淡出时一起暗下去
               （到 text-5 完全消失时它们也正好全没了）；没写 fadeOut 的仍然跟 .text-6
               ★ 默认是线性的 (1 - outT)，和 1.js 画文字的淡出（1 - easeOut(outT)）
                 曲线不同：线性的话图标在最后一段会比文字【多留一会儿】。
                 想要“和文字一模一样地一起暗下去”的图标，在 ICONS 那一条写
                 fadeOutEase: true（现在只有 24 号 End.webm 这么用）。 */
            op *= 1 - (n.cfg.fadeOutEase ? easeOut(outT) : outT);

            /* 页面停在冻结组中间、而这一组一次都没播过：整行不显示（见上面 stranded 说明） */
            if (stranded) op = 0;

            /* ★ 起点认的那段文字在冻结组里时：那一段还没轮到演、或页面停在组里
               还没开始播时，1.js 会把冻结文字整个藏起来（item.skipFrozen），
               图标不能自己单独亮着 —— 判断和 1.js 的 render() 保持一致：
                 · 正在播这一组 → 照常按 freezePos 算；
                 · 这一组已经播完（freezePos 停在 z1）→ 放行，交给下面 outT 收尾；
                 · 其它情况（还没轮到 / 刷新后被浏览器直接恢复到组后面）→ 先藏起来。
               ★ 现在 FREEZE_GROUPS 是空的（没有冻结文字），这条对所有图标都不生效。 */
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

            /* ★ 图标 8：那段视频等 text-8【淡入完全走完】（p 走过 win.b —— 淡入窗口的终点）
               才开始播，只播一次；播完就收起视频、回到静态图（见 overlayLive + 上面挂的
               ended 监听）。图标一暗掉 / 往回滚到淡入之前，它就复位成第一帧藏起来。 */
            if (n.overlay) overlayLive(n, p >= win.b - 1e-6, op > 0.001);

            /* ---- 飘动 ----
               “出现在页面里”的那段时间 = 从淡入开始到随 text-6 淡出为止。
               ★ 这里只记“亮没亮”（op > 0.02），【不】在这里挪位置：
                 位置的推进只交给 driftTick()，它按真实时间走，
                 这样 1.js 多调几次 render() 也不会让图标多飞几步。 */
            const live = op > 0.02;

            /* ★ 图标 5 / 6 的“呼吸 + 随机微动”：亮灭状态也在这记一笔，
               暗下去 pulseStep 就不再推进它们（见 PULSE / pulseStep）。 */
            if (n.pulse) n.pulse.live = live;

            /* ★ 视频图标（ICONS 里 src 写成 .webm / .mp4 的那几个）：
               只在这只图标亮着的时候解码播放，暗下去就暂停，省 CPU / 电量。
               ★ 写了 toggle 的图标不走这一套（由开关控制，见 mediaOrSwitch）——
                 现在没有图标写 toggle 了（ico14 已换成静态图），所以下面这句对
                 所有图标都等价于直接走 mediaLive；图片图标会立刻返回，不做任何事。 */
            mediaOrSwitch(n, live);

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

        /* ★ text-11 的“从视频里弹出来”：必须放在最后 ——
           这时 1.js 已经把文字画到最终位置（transform / opacity 都写完了），
           这里只是在它的淡入那一段再叠一层 translate + scale（见上面 TEXT_POP）。 */
        try {
            textPopUpdate();
        } catch (err) {
            console.warn("[home] text-11 出场动画出错：", err);
        }
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
       __bugIcons.nodes 能看到全部图标（现在 18 只，含各自的飘动状态 n.drift）；
       __bugIcons.outDone 看“是否已随默认淡出宿主（.text-6）淡出”；
       __bugIcons.timeline 是 ico5 / ico7 的出场时刻表（4.js 读它来定 BEGINNING 的出场点）；
       __bugIcons.DRIFT 是飘动范围 / 速度 / 随机落点，改完下一帧就生效
       （比如 DRIFT.on = false 关掉飘动，DRIFT.randomDir = true 让初始方向也随机）；
       __bugIcons.PULSE 是图标 5 / 6 的“呼吸 + 随机微动”参数
       （PULSE.on = false 关掉，PULSE.scale / radius 改幅度，下一帧就生效）。 */
    window.__bugIcons = {
        update,
        nodes,
        row,
        topRow,
        DRIFT,
        PULSE,
        timeline: TIMELINE,
        get outDone() { return outStateOf(FADE_OUT_HOST).done; }
    };
})();
