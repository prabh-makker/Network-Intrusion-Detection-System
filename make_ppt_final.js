const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3" x 7.5" — more space!
pres.author = "Best Friend";
pres.title = "Happy Birthday Prianshi";

// ── COLOR PALETTE ──────────────────────────────────────────────────────────
const BG      = "0E0A14";
const BG_ALT  = "1A1528";
const GOLD    = "D4A017";
const GOLD_LT = "F0C040";
const WHITE   = "FFFFFF";
const OFF_W   = "EDE8D5";
const MUTED   = "8878A0";
const ROSE    = "C2667A";

const sh = () => ({ type: "outer", blur: 16, offset: 4, angle: 135, color: "000000", opacity: 0.5 });

function tryPhoto(filename) {
  const p = path.join(__dirname, "photos", filename);
  if (fs.existsSync(p)) return p;
  return null;
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const MARGIN = 0.6;
const W = 13.3;
const H = 7.5;
const CONTENT_W = W - 2*MARGIN;

// ── SLIDE 1 — TITLE WITH PHOTO ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  const leftW = 6.5;
  const rightW = W - leftW - 0.3;

  s.addText("29 MAY", {
    x:MARGIN, y:0.35, w:leftW-0.4, h:0.4,
    fontSize:13, fontFace:"Calibri", bold:true, charSpacing:8, color:GOLD, align:"left", margin:0
  });

  s.addText("Happy Birthday,\nDevi Prianshi", {
    x:MARGIN, y:0.9, w:leftW-0.4, h:1.6,
    fontSize:54, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left", valign:"top", shadow:sh()
  });

  s.addShape(pres.shapes.RECTANGLE, { x:MARGIN, y:2.65, w:4.5, h:0.05, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText(
    [
      { text:"It's a thousand things.\n\n", options:{color:OFF_W, italic:true, fontSize:11} },
      { text:"But to be honest — the Prianshi I have seen? I don't know if anyone has.\n\n", options:{color:OFF_W, fontSize:10} },
      { text:"My life's golden chance.\nI met a legendary creature.", options:{color:GOLD, italic:true, bold:true, fontSize:12} },
    ],
    { x:MARGIN, y:2.85, w:leftW-0.5, h:4.2, fontFace:"Palatino Linotype", lineSpacingMultiple:1.4, align:"left", valign:"top" }
  );

  // Right — photo
  const p3 = tryPhoto("p3.jpg");
  const photoX = leftW + MARGIN + 0.2;
  if (p3) {
    s.addShape(pres.shapes.RECTANGLE, { x:photoX, y:0.1, w:rightW-0.2, h:H-0.2, fill:{color:"000000"}, line:{color:GOLD, width:2} });
    s.addImage({ path: p3, x:photoX, y:0.1, w:rightW-0.2, h:H-0.2, sizing:{type:"cover",w:rightW-0.2,h:H-0.2} });
    s.addShape(pres.shapes.RECTANGLE, { x:photoX, y:0.1, w:0.8, h:H-0.2, fill:{color:BG, transparency:15}, line:{color:BG} });
  }
}

// ── SLIDE 2 — YOU ARE NOT ONE PERSON ───────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("You Are Not A Single Person", {
    x:MARGIN, y:0.25, w:CONTENT_W, h:0.7,
    fontSize:40, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", margin:0
  });

  s.addText("(You have 1000 personalities inside)", {
    x:MARGIN, y:0.98, w:CONTENT_W, h:0.35,
    fontSize:14, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"center"
  });

  s.addShape(pres.shapes.RECTANGLE, { x:MARGIN, y:1.4, w:CONTENT_W, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  const items = [
    "You are a civilization.",
    "Bhar se pathar, andar se naram — you're the rarest combo.",
    "Tere innocence. Tere harkatein. Tera aura. Tere baatien.",
    "Your aura of being a therapist — unpaid therapist.",
    "And the best part? A singer.",
    "A supportive friend jo duniya se ladh jaye apke liye.",
    "The spirit of winning. Those titles.",
  ];

  s.addText(
    items.map((t, i) => [
      { text: "◆  ", options: { color: GOLD, bold: true } },
      { text: t + (i < items.length-1 ? "\n" : ""), options: { color: OFF_W } }
    ]).flat(),
    { x:MARGIN+0.4, y:1.58, w:CONTENT_W-0.8, h:5.5, fontSize:16, fontFace:"Calibri", lineSpacingMultiple:1.7, align:"left", valign:"top" }
  );
}

// ── SLIDE 3 — WHO AM I ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "08081A" };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("One Day You Lost Yourself", {
    x:MARGIN, y:0.3, w:CONTENT_W, h:0.75,
    fontSize:40, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", margin:0
  });

  s.addText('"Who am I?" you asked.', {
    x:MARGIN, y:1.08, w:CONTENT_W, h:0.35,
    fontSize:15, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"center"
  });

  s.addShape(pres.shapes.RECTANGLE, { x:2.5, y:1.5, w:8.3, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText(
    [
      { text:"Here is my answer, documented formally:\n\n", options:{color:OFF_W, bold:true} },
      { text:"I have seen every version. All 1000 of them.\n\n", options:{color:GOLD_LT, bold:true, italic:true} },
      { text:"And the answer to your question is simply this:\n\n", options:{color:OFF_W} },
      { text:"Prianshi is all of them.\nEvery. Single. One.", options:{color:GOLD, bold:true, italic:true} },
    ],
    { x:MARGIN+1, y:1.7, w:CONTENT_W-2, h:5.3, fontSize:16, fontFace:"Palatino Linotype", lineSpacingMultiple:1.8, align:"center", valign:"top" }
  );
}

// ── SLIDE 4 — MEMORABLE MOMENTS ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Memorable Moments", {
    x:MARGIN, y:0.28, w:CONTENT_W, h:0.7,
    fontSize:40, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", margin:0
  });

  s.addText("I have plenty of them 🫠", {
    x:MARGIN, y:1.0, w:CONTENT_W, h:0.32,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"center"
  });

  s.addShape(pres.shapes.RECTANGLE, { x:MARGIN, y:1.38, w:CONTENT_W, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  const cardW = (CONTENT_W - 0.5) / 2;
  const cardH = 5.6;

  // Card 1 — LEFT
  s.addShape(pres.shapes.RECTANGLE, { x:MARGIN, y:1.65, w:cardW, h:cardH, fill:{color:BG_ALT}, line:{color:"2A1E40", width:1.5}, shadow:sh() });
  s.addShape(pres.shapes.RECTANGLE, { x:MARGIN, y:1.65, w:cardW, h:0.08, fill:{color:ROSE}, line:{color:ROSE} });

  s.addText("The Shamshan\nBusiness Idea", {
    x:MARGIN+0.25, y:1.8, w:cardW-0.5, h:0.75,
    fontSize:18, fontFace:"Georgia", bold:true, color:ROSE, align:"center", valign:"top"
  });

  s.addText(
    "Only you could come up with something like this and make it completely logical.\n\nPeak chaotic energy.\n\nCertified iconic. Filed in the record books.",
    { x:MARGIN+0.25, y:2.7, w:cardW-0.5, h:4.4, fontSize:13, fontFace:"Calibri", color:OFF_W, align:"center", valign:"top", lineSpacingMultiple:1.5 }
  );

  // Card 2 — RIGHT
  const card2X = MARGIN + cardW + 0.5;
  s.addShape(pres.shapes.RECTANGLE, { x:card2X, y:1.65, w:cardW, h:cardH, fill:{color:BG_ALT}, line:{color:"2A1E40", width:1.5}, shadow:sh() });
  s.addShape(pres.shapes.RECTANGLE, { x:card2X, y:1.65, w:cardW, h:0.08, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Friend In Need", {
    x:card2X+0.25, y:1.8, w:cardW-0.5, h:0.65,
    fontSize:18, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", valign:"top"
  });

  s.addText(
    [
      { text:"You went into strangers' DMs.\nTravelled far.\nJust to get my phone back.\n\n", options:{color:OFF_W, fontSize:13} },
      { text:"I know how big that was.\n\n", options:{color:GOLD_LT, bold:true, fontSize:13} },
      { text:"You chose my problem over what you needed.\nYou invested your time on me.\n\n", options:{color:GOLD, italic:true, bold:true, fontSize:13} },
      { text:"That's not a friend. That's a saviour.", options:{color:GOLD_LT, bold:true, italic:true, fontSize:13} },
    ],
    { x:card2X+0.25, y:2.6, w:cardW-0.5, h:4.5, fontFace:"Calibri", align:"center", valign:"top", lineSpacingMultiple:1.5 }
  );
}

// ── SLIDE 5 — O PHULLA WARGI HAI ──────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  const p2 = tryPhoto("p2.jpg");
  const p2W = 4.0;
  const p2X = W - MARGIN - p2W;

  if (p2) {
    s.addImage({ path:p2, x:p2X, y:0.1, w:p2W, h:H-0.2, sizing:{type:"cover",w:p2W,h:H-0.2} });
    s.addShape(pres.shapes.RECTANGLE, { x:p2X, y:0.1, w:p2W, h:H-0.2, fill:{type:"none"}, line:{color:GOLD, width:2} });
    s.addShape(pres.shapes.RECTANGLE, { x:p2X, y:0.1, w:0.9, h:H-0.2, fill:{color:BG, transparency:40}, line:{color:BG} });
  }

  const textW = p2X - MARGIN - 0.25;

  s.addText('"O Phulla Wargi Hai"', {
    x:MARGIN, y:0.28, w:textW, h:0.75,
    fontSize:40, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left", margin:0
  });

  s.addShape(pres.shapes.RECTANGLE, { x:MARGIN, y:1.1, w:textW-0.3, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText(
    [
      { text:"Jagdi rehendi hai raata nu.\nLike a jugnu in every halat.\n\n", options:{color:OFF_W, fontSize:13} },
      { text:"She is a warrior. Mysterious.\nYet here to rule the world.\n\n", options:{color:GOLD_LT, bold:true, fontSize:13} },
      { text:"A foodie exploring good food + places.\nBaddie who owns every outfit.\n\n", options:{color:OFF_W, fontSize:12} },
      { text:"This lady is Dora the Explorer.\n\n", options:{color:GOLD_LT, bold:true, fontSize:13} },
      { text:"Sometimes explores her own harm.\nCreates the problem. Solves it.\n", options:{color:MUTED, fontSize:12} },
      { text:'"Hum hi sab hain."', options:{color:GOLD, bold:true, italic:true, fontSize:13} },
    ],
    { x:MARGIN, y:1.3, w:textW, h:5.8, fontFace:"Calibri", lineSpacingMultiple:1.5, align:"left", valign:"top" }
  );
}

// ── SLIDE 6 — FAVOURITE VERSION ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  const p1 = tryPhoto("p1.jpg");
  const p1W = 4.0;
  const p1X = MARGIN;

  if (p1) {
    s.addImage({ path:p1, x:p1X, y:0.1, w:p1W, h:H-0.2, sizing:{type:"cover",w:p1W,h:H-0.2} });
    s.addShape(pres.shapes.RECTANGLE, { x:p1X, y:0.1, w:p1W, h:H-0.2, fill:{type:"none"}, line:{color:GOLD, width:2} });
    s.addShape(pres.shapes.RECTANGLE, { x:p1X, y:0.1, w:0.8, h:H-0.2, fill:{color:BG, transparency:35}, line:{color:BG} });
  }

  const textX = p1X + p1W + 0.3;
  const textW = W - textX - MARGIN;

  s.addText("Your PRIME", {
    x:textX, y:0.28, w:textW-0.2, h:0.75,
    fontSize:40, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left", margin:0
  });

  s.addText("(Your best version)", {
    x:textX, y:1.05, w:textW-0.2, h:0.3,
    fontSize:12, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"left"
  });

  s.addShape(pres.shapes.RECTANGLE, { x:textX, y:1.4, w:textW-0.4, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText(
    [
      { text:"Winning. Confidence. Ninja energy.\n", options:{color:GOLD_LT, bold:true, fontSize:13} },
      { text:"No losses. Victory. No overthinking.\n\n", options:{color:OFF_W, fontSize:12} },
      { text:"Suljhi hoye, pyari si ladki.\nDoes everything from the heart.\n\n", options:{color:OFF_W, fontSize:12} },
      { text:"If someone becomes important to you —\nyou will change their life.\n\n", options:{color:GOLD, bold:true, italic:true, fontSize:13} },
      { text:"The efforts you put in? Unbelievable. 🫠\n\n", options:{color:OFF_W, fontSize:12} },
      { text:"Being on your list = Heaven.\n", options:{color:GOLD_LT, bold:true, italic:true, fontSize:13} },
      { text:"Your prime is your best version.", options:{color:OFF_W, italic:true, fontSize:12} },
    ],
    { x:textX, y:1.6, w:textW-0.2, h:5.6, fontFace:"Calibri", align:"left", valign:"top" }
  );
}

// ── SLIDE 7 — EVERY MOMENT ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "08081A" };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Every Moment With Her", {
    x:MARGIN, y:0.3, w:CONTENT_W, h:0.75,
    fontSize:40, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", margin:0
  });

  s.addShape(pres.shapes.RECTANGLE, { x:3, y:1.12, w:7.3, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText(
    [
      { text:"Prianshi ke saath ", options:{color:OFF_W, fontSize:13} },
      { text:"har waqt ", options:{color:GOLD_LT, bold:true, fontSize:13} },
      { text:"motivation. Ik next level energy.\n\n", options:{color:OFF_W, fontSize:13} },
      { text:"Her life thoughts make you insaan bna de ge.\n\n", options:{color:GOLD_LT, bold:true, italic:true, fontSize:13} },
      { text:"Har waqt insane. Bachodi se funny stories.\nThen suddenly — itni deep baat.\n\n", options:{color:OFF_W, fontSize:12} },
      { text:'You get rude sometimes?\nIt feels like: "Haan bhai, list mein ho." 😂\n\n', options:{color:GOLD, bold:true, italic:true, fontSize:13} },
      { text:"Rude bhi 3-4 tareeke ka hai tera.\nBut good rude. That hits different.\n\n", options:{color:MUTED, italic:true, fontSize:12} },
      { text:"Dictionary should have:\n", options:{color:MUTED, italic:true, fontSize:12} },
      { text:'"4 Types of Prianshi Rudeness"', options:{color:ROSE, bold:true, italic:true, fontSize:13} },
    ],
    { x:MARGIN+0.8, y:1.3, w:CONTENT_W-1.6, h:5.8, fontFace:"Calibri", align:"center", valign:"top", lineSpacingMultiple:1.5 }
  );
}

// ── SLIDE 8 — HER EFFORTS ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Her Efforts", {
    x:MARGIN, y:0.3, w:CONTENT_W, h:0.75,
    fontSize:42, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", margin:0
  });

  s.addShape(pres.shapes.RECTANGLE, { x:3, y:1.15, w:7.3, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText(
    [
      { text:"Prianshi is unpaid therapist, yaar.\n\n", options:{color:GOLD_LT, bold:true, fontSize:13} },
      { text:"Tere bachodi se baatien.\nTere saath bitaua samma — ", options:{color:OFF_W, fontSize:12} },
      { text:"cant explain, bro.\n\n", options:{color:GOLD, bold:true, italic:true, fontSize:13} },
      { text:"Tu jab insaan ko chunti hain — mehfil ke ", options:{color:OFF_W, fontSize:12} },
      { text:"shaan bn jaate.\n\n", options:{color:GOLD_LT, bold:true, fontSize:13} },
      { text:"Every time I met you, epic fun. Bachodi + deep.\n\n", options:{color:OFF_W, fontSize:12} },
      { text:"Tu choti se choti cheez ka dhyan rakhte, yaar.\n\n", options:{color:OFF_W, fontSize:12} },
      { text:"Having you > 1 million friends.\n", options:{color:GOLD, bold:true, italic:true, fontSize:13} },
      { text:"You are above that.\n\n", options:{color:OFF_W, fontSize:12} },
      { text:"At any cost, I would save this friendship.\n\n", options:{color:OFF_W, fontSize:12} },
      { text:"Because bhagwan diva level log deta.\n", options:{color:GOLD, italic:true, bold:true, fontSize:13} },
      { text:"And you? Certified.", options:{color:GOLD_LT, bold:true, fontSize:13} },
    ],
    { x:MARGIN+0.8, y:1.35, w:CONTENT_W-1.6, h:5.8, fontFace:"Calibri", align:"center", valign:"top", lineSpacingMultiple:1.4 }
  );
}

// ── SLIDE 9 — THEN & NOW ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.1, w:W, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Then & Now", {
    x:MARGIN, y:0.28, w:CONTENT_W, h:0.75,
    fontSize:40, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", margin:0
  });

  s.addText("Always iconic. Always legendary. Always her.", {
    x:MARGIN, y:1.05, w:CONTENT_W, h:0.32,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"center"
  });

  s.addShape(pres.shapes.RECTANGLE, { x:MARGIN, y:1.42, w:CONTENT_W, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  const photoW = (CONTENT_W - 0.6) / 3;
  const photoH = 5.4;

  const photos = [
    { file:"p1.jpg", caption:"Mini Prianshi\nWith the crown.\nAlways royalty." },
    { file:"p2.jpg", caption:"The Energy.\nThat smile.\nChaos queen." },
    { file:"p3.jpg", caption:"Present Day.\nBhar se pathar,\nandar se naram." },
  ];

  photos.forEach((p, i) => {
    const x = MARGIN + i * (photoW + 0.3);
    const y = 1.65;

    const imgPath = tryPhoto(p.file);
    if (imgPath) {
      s.addImage({ path:imgPath, x, y, w:photoW, h:photoH, sizing:{type:"cover",w:photoW,h:photoH} });
      s.addShape(pres.shapes.RECTANGLE, { x, y, w:photoW, h:photoH, fill:{type:"none"}, line:{color:GOLD, width:2} });
    } else {
      s.addShape(pres.shapes.RECTANGLE, { x, y, w:photoW, h:photoH, fill:{color:BG_ALT}, line:{color:GOLD, width:2} });
      s.addText("📷", { x, y:y+2, w:photoW, h:0.8, fontSize:32, color:MUTED, align:"center" });
    }

    s.addShape(pres.shapes.RECTANGLE, { x, y:y+photoH, w:photoW, h:0.9, fill:{color:"1A1228"}, line:{color:GOLD, width:1} });
    s.addText(p.caption, { x:x+0.08, y:y+photoH+0.1, w:photoW-0.16, h:0.75, fontSize:10, fontFace:"Calibri", italic:true, color:OFF_W, align:"center", valign:"middle" });
  });
}

// ── SLIDE 10 — FINAL ───────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.15, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:H-0.15, w:W, h:0.15, fill:{color:GOLD}, line:{color:GOLD} });

  [[0.4,0.35],[W-0.4,0.35],[0.4,H-0.35],[W-0.4,H-0.35]].forEach(([x,y]) =>
    s.addShape(pres.shapes.OVAL, { x, y, w:0.15, h:0.15, fill:{color:GOLD}, line:{color:GOLD} })
  );

  s.addText("Happy Birthday,", {
    x:MARGIN, y:0.45, w:CONTENT_W, h:0.6,
    fontSize:32, fontFace:"Georgia", color:OFF_W, align:"center", margin:0
  });

  s.addText("Devi Prianshi", {
    x:MARGIN, y:1.1, w:CONTENT_W, h:1.3,
    fontSize:60, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", shadow:sh()
  });

  s.addText("29 May", {
    x:MARGIN, y:2.45, w:CONTENT_W, h:0.4,
    fontSize:16, fontFace:"Calibri", bold:true, charSpacing:10, color:GOLD, align:"center"
  });

  s.addShape(pres.shapes.RECTANGLE, { x:3.5, y:2.98, w:6.3, h:0.06, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("May this year give you everything you gave everyone else.", {
    x:MARGIN+0.5, y:3.15, w:CONTENT_W-1, h:0.6,
    fontSize:15, fontFace:"Palatino Linotype", italic:true, color:OFF_W, align:"center"
  });

  s.addText(
    [
      { text:"You are not just my best friend.\n", options:{color:OFF_W, fontSize:14} },
      { text:"You are a ", options:{color:OFF_W, fontSize:14} },
      { text:"once-in-a-lifetime ", options:{color:GOLD_LT, bold:true, italic:true, fontSize:14} },
      { text:"kind of person.\n\n", options:{color:OFF_W, fontSize:14} },
      { text:"Janam din mubarak ho, legendary creature.", options:{color:GOLD, bold:true, italic:true, fontSize:15} },
    ],
    { x:MARGIN+1, y:3.9, w:CONTENT_W-2, h:2, fontFace:"Palatino Linotype", lineSpacingMultiple:1.7, align:"center" }
  );

  s.addText("— Your Hommie, Forever", {
    x:MARGIN, y:5.9, w:CONTENT_W, h:0.35,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"right"
  });

  s.addText("This presentation replaces all physical gifts. You're welcome.", {
    x:MARGIN, y:6.25, w:CONTENT_W, h:0.3,
    fontSize:9, fontFace:"Calibri", color:MUTED, align:"center"
  });
}

pres.writeFile({ fileName: "C:\\Users\\khalo\\nids\\Prianshi_Birthday.pptx" })
  .then(() => console.log("✅ Done! WIDE format (13.3x7.5) — No overlap, photos aligned!"))
  .catch(err => { console.error("Error:", err); process.exit(1); });
