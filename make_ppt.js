const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Best Friend";
pres.title = "Happy Birthday Prianshi";

// ── Color Palette ──────────────────────────────────────────────────────────
const BG      = "0E0A14"; // deep warm dark purple-black
const BG2     = "110D1A"; // slightly lighter
const CARD    = "1C1528"; // card bg
const GOLD    = "D4A017";
const GOLD_LT = "F0C040";
const WHITE   = "FFFFFF";
const OFF_W   = "EDE8D5";
const MUTED   = "8878A0";
const ROSE    = "C2667A";
const AMBER   = "C87941";

// shadow factory — never reuse (PptxGenJS mutates objects)
const sh = () => ({ type: "outer", blur: 16, offset: 4, angle: 135, color: "000000", opacity: 0.5 });

// photo helper — loads file if exists, else returns null
function tryPhoto(filename) {
  const p = path.join(__dirname, "photos", filename);
  if (fs.existsSync(p)) return p;
  return null;
}

// ── SLIDE 1 — TITLE ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };

  // thick gold top + bottom bar
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  // corner diamonds
  [[0.25,0.28],[9.55,0.28],[0.25,5.05],[9.55,5.05]].forEach(([x,y]) =>
    s.addShape(pres.shapes.OVAL, { x, y, w:0.1, h:0.1, fill:{color:GOLD_LT}, line:{color:GOLD_LT} })
  );

  const p3 = tryPhoto("p3.jpg");
  if (p3) {
    // right half: current photo
    s.addShape(pres.shapes.RECTANGLE, { x:5.3, y:0.1, w:4.7, h:5.42, fill:{color:"000000"}, line:{color:GOLD} });
    s.addImage({ path: p3, x:5.3, y:0.1, w:4.7, h:5.42, sizing:{type:"cover",w:4.7,h:5.42} });
    // dark gradient overlay on photo side
    s.addShape(pres.shapes.RECTANGLE, { x:5.3, y:0.1, w:0.9, h:5.42, fill:{color:BG, transparency:10}, line:{color:BG} });
  }

  // left side content
  s.addText("29 MAY", {
    x:0.4, y:0.35, w:4.7, h:0.45,
    fontSize:13, fontFace:"Calibri", bold:true, charSpacing:8,
    color:GOLD, align:"left"
  });

  s.addText("Happy Birthday,", {
    x:0.4, y:0.85, w:4.7, h:0.65,
    fontSize:26, fontFace:"Georgia",
    color:OFF_W, align:"left"
  });

  s.addText("Prianshi", {
    x:0.4, y:1.45, w:4.7, h:1.1,
    fontSize:58, fontFace:"Georgia", bold:true,
    color:GOLD_LT, align:"left", shadow:sh()
  });

  s.addShape(pres.shapes.RECTANGLE, { x:0.4, y:2.68, w:3.5, h:0.05, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("A Detailed Presentation\nBecause You Deserve More Than Cake", {
    x:0.4, y:2.82, w:4.7, h:0.95,
    fontSize:14, fontFace:"Palatino Linotype", italic:true,
    color:OFF_W, align:"left"
  });

  s.addText("Prepared with love, sleep deprivation, and 0 budget", {
    x:0.4, y:5.05, w:4.7, h:0.35,
    fontSize:9, fontFace:"Calibri", italic:true, color:MUTED, align:"left"
  });
}

// ── SLIDE 2 — A LEGENDARY CREATURE ────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("A Legendary Creature", {
    x:0.5, y:0.2, w:9, h:0.7,
    fontSize:36, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left"
  });
  s.addText("Why I Like You — Exhibit A through Exhibit ∞", {
    x:0.5, y:0.92, w:9, h:0.35,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"left"
  });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:1.33, w:9, h:0.03, fill:{color:GOLD}, line:{color:GOLD} });

  const items = [
    ["◆", GOLD,    "You are not one person. You are a civilization."],
    ["◆", OFF_W,   "Bhar se pathar, andar se naram — the rarest combo on this planet."],
    ["◆", OFF_W,   "Your innocence, your harkatein, your aura — all separately iconic."],
    ["◆", OFF_W,   "Baatein itni deep hoti hain ki free therapy mil jaati hai automatically."],
    ["◆", GOLD_LT, "The unpaid therapist this world doesn't deserve — but got lucky to have."],
    ["◆", OFF_W,   "A singer. A fighter. Jo duniya se ladh jaaye apke liye if you're real to her."],
    ["◆", GOLD,    "Meeting you? Meri life ka golden chance. A legendary creature — confirmed."],
  ];

  s.addText(
    items.map(([dot, c, txt], i) => [
      { text: dot + "  ", options: { color: GOLD, bold: true } },
      { text: txt + (i < items.length-1 ? "\n" : ""), options: { color: c } }
    ]).flat(),
    { x:0.5, y:1.45, w:9, h:3.8, fontSize:14.5, fontFace:"Calibri", lineSpacingMultiple:1.45, align:"left", valign:"top" }
  );

  s.addText("2 / 10", { x:8.8, y:5.28, w:1, h:0.2, fontSize:8, color:MUTED, align:"right" });
}

// ── SLIDE 3 — MEMORABLE MOMENTS ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Memorable Moments", {
    x:0.5, y:0.2, w:9, h:0.7,
    fontSize:36, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left"
  });
  s.addText("I have plenty. But these two? These live rent-free forever.", {
    x:0.5, y:0.92, w:9, h:0.35,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"left"
  });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:1.33, w:9, h:0.03, fill:{color:GOLD}, line:{color:GOLD} });

  // Card 1 — Shamshan
  s.addShape(pres.shapes.RECTANGLE, { x:0.4, y:1.48, w:4.35, h:3.7, fill:{color:CARD}, line:{color:"2A1E40", width:1}, shadow:sh() });
  s.addShape(pres.shapes.RECTANGLE, { x:0.4, y:1.48, w:4.35, h:0.07, fill:{color:ROSE}, line:{color:ROSE} });
  s.addText("😂  The Shamshan\nBusiness Idea", {
    x:0.55, y:1.6, w:4.05, h:0.8,
    fontSize:17, fontFace:"Georgia", bold:true, color:ROSE, align:"left"
  });
  s.addText(
    "Only Prianshi could come up with a business idea involving a shamshan and make it sound completely logical.\n\nThis is what peak chaotic energy looks like.\n\nCertified iconic. Filed in court records.",
    { x:0.55, y:2.45, w:4.05, h:2.6, fontSize:13, fontFace:"Calibri", color:OFF_W, align:"left", valign:"top" }
  );

  // Card 2 — Phone story
  s.addShape(pres.shapes.RECTANGLE, { x:5.25, y:1.48, w:4.35, h:3.7, fill:{color:CARD}, line:{color:"2A1E40", width:1}, shadow:sh() });
  s.addShape(pres.shapes.RECTANGLE, { x:5.25, y:1.48, w:4.35, h:0.07, fill:{color:GOLD}, line:{color:GOLD} });
  s.addText("🫠  The Phone Mission", {
    x:5.4, y:1.6, w:4.05, h:0.55,
    fontSize:17, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left"
  });
  s.addText(
    [
      { text: "She went into strangers' DMs. Traveled far. All to get my phone back.\n\n", options:{color:OFF_W} },
      { text: "Outsiders would say ", options:{color:MUTED, italic:true} },
      { text: '"kya hi ho gya." ', options:{color:MUTED, italic:true} },
      { text: "But I know how big that was.\n\n", options:{color:OFF_W} },
      { text: "She chose my problem over what she needed. Invested her time, her energy — for me.", options:{color:OFF_W} },
      { text: "\n\nThat's not a friend. That's a saviour.", options:{color:GOLD_LT, bold:true, italic:true} },
    ],
    { x:5.4, y:2.2, w:4.05, h:2.85, fontSize:13, fontFace:"Calibri", align:"left", valign:"top", lineSpacingMultiple:1.4 }
  );

  s.addText("3 / 10", { x:8.8, y:5.28, w:1, h:0.2, fontSize:8, color:MUTED, align:"right" });
}

// ── SLIDE 4 — O PHULLA WARGI HAI ──────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  const p2 = tryPhoto("p2.jpg");
  let contentW = 9.5, contentX = 0.25;
  if (p2) {
    s.addImage({ path:p2, x:7.0, y:0.1, w:3.0, h:5.42, sizing:{type:"cover",w:3.0,h:5.42} });
    s.addShape(pres.shapes.RECTANGLE, { x:7.0, y:0.1, w:3.0, h:5.42, fill:{color:BG, transparency:45}, line:{color:BG} });
    contentW = 6.4;
  }

  s.addText('"O Phulla Wargi Hai"', {
    x:contentX, y:0.18, w:contentW, h:0.7,
    fontSize:34, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left"
  });
  s.addText("Songs, Vibes & Everything She Is", {
    x:contentX, y:0.9, w:contentW, h:0.35,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"left"
  });
  s.addShape(pres.shapes.RECTANGLE, { x:contentX, y:1.3, w:contentW-0.2, h:0.03, fill:{color:GOLD}, line:{color:GOLD} });

  const lines = [
    { text:"Jagdi rehendi hai raata nu — like a jugnu, lights up in every situation.\n", c:OFF_W },
    { text:"Handles herself. Builds herself. Keeps going forward — she is a warrior.\n", c:OFF_W },
    { text:"Mysterious. Here to rule the world. No debate.\n\n", c:GOLD_LT },
    { text:"The foodie who explores good food + good places + good vibes (Dora the Explorer mode).\n", c:OFF_W },
    { text:"Baddie who owns every outfit she touches. Always.\n\n", c:OFF_W },
    { text:"One flaw: ", c:ROSE, bold:true },
    { text:"sometimes while exploring her potential, she ends up exploring her own harm.\n", c:MUTED },
    { text:"Creates the problem. Solves it herself. ", c:MUTED },
    { text:'"Hum hi sab hain."', c:ROSE, italic:true, bold:true },
    { text:"\nChaos level: unmatched.", c:MUTED },
  ];

  s.addText(
    lines.map(l => ({ text:l.text, options:{ color:l.c, bold:l.bold||false, italic:l.italic||false } })),
    { x:contentX, y:1.42, w:contentW, h:3.9, fontSize:14.5, fontFace:"Calibri", lineSpacingMultiple:1.45, align:"left", valign:"top" }
  );

  s.addText("4 / 10", { x:8.8, y:5.28, w:1, h:0.2, fontSize:8, color:MUTED, align:"right" });
}

// ── SLIDE 5 — FAVOURITE VERSION ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  const p1 = tryPhoto("p1.jpg");
  let cW = 9.5, cX = 0.25;
  if (p1) {
    s.addImage({ path:p1, x:0, y:0.1, w:3.2, h:5.42, sizing:{type:"cover",w:3.2,h:5.42} });
    s.addShape(pres.shapes.RECTANGLE, { x:0, y:0.1, w:3.2, h:5.42, fill:{color:BG, transparency:40}, line:{color:BG} });
    cX = 3.4; cW = 6.3;
  }

  s.addText("Favourite Version of Her", {
    x:cX, y:0.18, w:cW, h:0.7,
    fontSize:34, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left"
  });
  s.addText("When she is in her PRIME — unmatched.", {
    x:cX, y:0.9, w:cW, h:0.35,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"left"
  });
  s.addShape(pres.shapes.RECTANGLE, { x:cX, y:1.3, w:cW-0.2, h:0.03, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText(
    [
      { text:"Winning. Confident. Doing everything like a ninja — ", options:{color:OFF_W} },
      { text:"no losses, no overthinking.\n\n", options:{color:GOLD_LT, bold:true} },
      { text:"Becoming THE tea. Double oye hoyee hoyee energy.\n\n", options:{color:OFF_W} },
      { text:"Suljhi hoyi, pyaari si ladki — ", options:{color:GOLD_LT, italic:true} },
      { text:"does everything from the heart. World doesn't always understand her.\n", options:{color:OFF_W} },
      { text:"But she still stands for others before herself.\n\n", options:{color:MUTED} },
      { text:"If you become important to her — ", options:{color:OFF_W} },
      { text:"she will change your life.", options:{color:GOLD, bold:true} },
      { text:" The efforts she puts in? Unbelievable.\n\n", options:{color:OFF_W} },
      { text:"Bhai, tu living a dream hai. ", options:{color:MUTED, italic:true} },
      { text:"Tu apna prime samajhti nahi.\nBeing on Prianshi's list = heaven.", options:{color:GOLD_LT, bold:true, italic:true} },
    ],
    { x:cX, y:1.42, w:cW, h:3.9, fontSize:14, fontFace:"Calibri", lineSpacingMultiple:1.45, align:"left", valign:"top" }
  );

  s.addText("5 / 10", { x:8.8, y:5.28, w:1, h:0.2, fontSize:8, color:MUTED, align:"right" });
}

// ── SLIDE 6 — EVERY MOMENT ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "0A0814" };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Every Moment With Her", {
    x:0.5, y:0.18, w:9, h:0.7,
    fontSize:36, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center"
  });
  s.addText("(har pal insane hota hai — in the best way)", {
    x:0.5, y:0.9, w:9, h:0.35,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"center"
  });

  // 4 cards in 2x2
  const cards = [
    { title:"Next Level Energy", body:"Prianshi ke saath har waqt motivation milegi. \"Kuch ukhadna hai life mein\" wala jasba aa jaata hai automatically. Her life thoughts make you a better human.", color:GOLD },
    { title:"Bachodi to Deep Baatein", body:"Har waqt insane hai — silly bachodi, funny stories, aur phir suddenly itni deep baat ki tumhara mind blown ho jaaye.", color:AMBER },
    { title:"The Good Rude™", body:"Jab wo tujhpe gussa ho ya slightly rude ho — it feels like a badge of honour. Matlab \"haan bhai list mein hoon.\" She has 3-4 types of rudeness. All valid. All hers.", color:ROSE },
    { title:"The Dictionary Entry", body:"\"Prianshi Rudeness (n): A 4-type classification system only she could invent. Chaotic, rare, and weirdly comforting when directed at you.\" 😂", color:GOLD_LT },
  ];

  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.35 + col * 4.85, y = 1.42 + row * 1.95;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w:4.45, h:1.8, fill:{color:CARD}, line:{color:"2A1E40", width:0.75}, shadow:sh() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w:0.07, h:1.8, fill:{color:c.color}, line:{color:c.color} });
    s.addText(c.title, { x:x+0.15, y:y+0.1, w:4.15, h:0.4, fontSize:14, fontFace:"Georgia", bold:true, color:c.color, align:"left" });
    s.addText(c.body, { x:x+0.15, y:y+0.5, w:4.15, h:1.22, fontSize:12, fontFace:"Calibri", color:OFF_W, align:"left", valign:"top" });
  });

  s.addText("6 / 10", { x:8.8, y:5.28, w:1, h:0.2, fontSize:8, color:MUTED, align:"right" });
}

// ── SLIDE 7 — HER EFFORTS ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Her Efforts", {
    x:0.5, y:0.18, w:9, h:0.7,
    fontSize:38, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"left"
  });
  s.addText("(or: what it means to be on Prianshi's list)", {
    x:0.5, y:0.9, w:9, h:0.35,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"left"
  });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:1.3, w:9, h:0.03, fill:{color:GOLD}, line:{color:GOLD} });

  const rows = [
    ["Unpaid Therapist", "Bachodi se leke deep baatein tak — she listens, she helps, she heals. No bill. No appointment. Just Prianshi being Prianshi."],
    ["Mehfil ki Shaan", "Jab usne decide kar liya ki yahan rehna hai — tu us mehfil ki shaan ban jaati hai. Every single time."],
    ["Choti Cheezein", "She remembers small things. The kind of details people forget. That's not normal. That's rare."],
    ["Having You > 1 Million Friends", "Tujhe life mein rakhna 1 million dosto se zyada worth karta hai. Above that million — confirmed."],
  ];

  rows.forEach(([label, val], i) => {
    const y = 1.45 + i * 0.97;
    s.addShape(pres.shapes.RECTANGLE, { x:0.4, y, w:9.2, h:0.85, fill:{color:CARD}, line:{color:"2A1E40", width:0.75} });
    s.addShape(pres.shapes.RECTANGLE, { x:0.4, y, w:0.07, h:0.85, fill:{color:GOLD}, line:{color:GOLD} });
    s.addText([
      { text: label + ":  ", options:{ bold:true, color:GOLD_LT, fontFace:"Georgia" } },
      { text: val, options:{ color:OFF_W, fontFace:"Calibri" } }
    ], { x:0.6, y, w:8.9, h:0.85, fontSize:13.5, valign:"middle", align:"left" });
  });

  s.addText(
    [{ text:'"Bhagwan bhi kabhi kabhi dayaal hokar ', options:{color:MUTED,italic:true} },
     { text:"aisa diva level insaan deta hai.", options:{color:GOLD_LT,italic:true,bold:true} },
     { text:'"  — Certified truth.', options:{color:MUTED,italic:true} }],
    { x:0.5, y:5.12, w:9, h:0.32, fontSize:12, fontFace:"Palatino Linotype", align:"center" }
  );

  s.addText("7 / 10", { x:8.8, y:5.28, w:1, h:0.2, fontSize:8, color:MUTED, align:"right" });
}

// ── SLIDE 8 — THEN & NOW (photos) ─────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Then & Now", {
    x:0.5, y:0.15, w:9, h:0.62,
    fontSize:36, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center"
  });
  s.addText("Always a queen. Always iconic. Always her.", {
    x:0.5, y:0.78, w:9, h:0.32,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"center"
  });

  const photos = [
    { file:"p1.jpg", caption:"Mini Prianshi\nWith her crown on.\nAlways knew she was royalty." },
    { file:"p2.jpg", caption:"The Energy.\nThat smile, that dupatta turban.\nChaos queen since birth." },
    { file:"p3.jpg", caption:"Present Day.\nBhar se pathar, andar se naram.\nThe world's luckiest people know her." },
  ];

  photos.forEach((p, i) => {
    const x = 0.2 + i * 3.28, y = 1.18, w = 3.0, h = 3.55;
    const imgPath = tryPhoto(p.file);
    if (imgPath) {
      s.addImage({ path:imgPath, x, y, w, h, sizing:{type:"cover",w,h} });
      // gold border
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill:{type:"none"}, line:{color:GOLD, width:1.5} });
    } else {
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill:{color:CARD}, line:{color:GOLD, width:1.5} });
      s.addText("📷\nPhoto here", { x, y:y+1.2, w, h:1.2, fontSize:14, color:MUTED, align:"center" });
    }
    // gold caption bar + text
    s.addShape(pres.shapes.RECTANGLE, { x, y:y+h, w, h:0.75, fill:{color:"1A1228"}, line:{color:GOLD, width:1} });
    s.addText(p.caption, { x:x+0.05, y:y+h+0.05, w:w-0.1, h:0.65, fontSize:10, fontFace:"Calibri", italic:true, color:OFF_W, align:"center", valign:"middle" });
  });

  s.addText("8 / 10", { x:8.8, y:5.28, w:1, h:0.2, fontSize:8, color:MUTED, align:"right" });
}

// ── SLIDE 9 — PIE CHART ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.525, w:10, h:0.1, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("Prianshi: A Visual Breakdown", {
    x:0.5, y:0.15, w:9, h:0.65,
    fontSize:34, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center"
  });
  s.addText("Official Personality Analysis™  |  Based on field research", {
    x:0.5, y:0.82, w:9, h:0.32,
    fontSize:12, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"center"
  });

  s.addChart(pres.charts.PIE, [{
    name: "Prianshi",
    labels: ["Chaotic Good Energy","Unpaid Therapist Mode","Singer in Villain Era","Pathar Outside Naram Inside","Existential Queen Mode"],
    values: [30, 25, 20, 15, 10]
  }], {
    x:0.2, y:1.05, w:5.0, h:4.15,
    chartColors: ["D4A017","C2667A","C87941","7B5EA7","059669"],
    chartArea: { fill:{ color:BG } },
    showPercent: true,
    dataLabelColor: WHITE,
    dataLabelFontSize: 11,
    showLegend: false,
  });

  const legend = [
    { pct:"30%", label:"Chaotic Good Energy",       color:"D4A017" },
    { pct:"25%", label:"Unpaid Therapist Mode",      color:"C2667A" },
    { pct:"20%", label:"Singer in Villain Era",      color:"C87941" },
    { pct:"15%", label:"Pathar Outside, Naram Inside",color:"7B5EA7" },
    { pct:"10%", label:'"Who Am I?" Existential Queen',color:"059669" },
  ];
  legend.forEach((l, i) => {
    const y = 1.3 + i * 0.72;
    s.addShape(pres.shapes.RECTANGLE, { x:5.45, y:y+0.1, w:0.22, h:0.22, fill:{color:l.color}, line:{color:l.color} });
    s.addText([
      { text:l.pct+"  ", options:{ bold:true, color:GOLD_LT } },
      { text:l.label, options:{ color:OFF_W } }
    ], { x:5.78, y, w:4.0, h:0.44, fontSize:13, fontFace:"Calibri", valign:"middle" });
  });

  s.addText("9 / 10", { x:8.8, y:5.28, w:1, h:0.2, fontSize:8, color:MUTED, align:"right" });
}

// ── SLIDE 10 — FINAL ───────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.15, fill:{color:GOLD}, line:{color:GOLD} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:5.475, w:10, h:0.15, fill:{color:GOLD}, line:{color:GOLD} });

  // corner ornaments
  [[0.25,0.32],[9.55,0.32],[0.25,5.12],[9.55,5.12]].forEach(([x,y]) =>
    s.addShape(pres.shapes.OVAL, { x, y, w:0.13, h:0.13, fill:{color:GOLD}, line:{color:GOLD} })
  );

  s.addText("Happy Birthday,", {
    x:0.5, y:0.45, w:9, h:0.62,
    fontSize:28, fontFace:"Georgia", color:OFF_W, align:"center"
  });
  s.addText("Devi Prianshi", {
    x:0.5, y:1.05, w:9, h:1.1,
    fontSize:56, fontFace:"Georgia", bold:true, color:GOLD_LT, align:"center", shadow:sh()
  });
  s.addText("29 May", {
    x:0.5, y:2.12, w:9, h:0.42,
    fontSize:16, fontFace:"Calibri", bold:true, charSpacing:10, color:GOLD, align:"center"
  });

  s.addShape(pres.shapes.RECTANGLE, { x:2.5, y:2.65, w:5, h:0.05, fill:{color:GOLD}, line:{color:GOLD} });

  s.addText("May this year give you everything you gave everyone else.", {
    x:0.8, y:2.8, w:8.4, h:0.52,
    fontSize:16, fontFace:"Palatino Linotype", italic:true, color:OFF_W, align:"center"
  });

  s.addText(
    [
      { text:"You are not just my best friend.\n", options:{ color:OFF_W } },
      { text:"You are a ", options:{ color:OFF_W } },
      { text:"once-in-a-lifetime", options:{ bold:true, italic:true, color:GOLD_LT } },
      { text:" kind of person.\n\n", options:{ color:OFF_W } },
      { text:"Janam din mubarak ho, legendary creature.", options:{ bold:true, italic:true, color:GOLD } },
    ],
    { x:1, y:3.42, w:8, h:1.55, fontSize:15, fontFace:"Palatino Linotype", lineSpacingMultiple:1.6, align:"center" }
  );

  s.addText("— Your Hommie, Forever", {
    x:1, y:4.88, w:8.5, h:0.35,
    fontSize:13, fontFace:"Palatino Linotype", italic:true, color:MUTED, align:"right"
  });

  s.addText("This presentation replaces all physical gifts. You're welcome.", {
    x:1, y:5.15, w:8, h:0.28,
    fontSize:9, fontFace:"Calibri", color:MUTED, align:"center"
  });
}

// ── Write file ─────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "C:\\Users\\khalo\\nids\\Prianshi_Birthday.pptx" })
  .then(() => console.log("Done! Prianshi_Birthday.pptx saved."))
  .catch(err => { console.error("Error:", err); process.exit(1); });
