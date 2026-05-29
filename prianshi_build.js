const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
pres.layout = "WIDE";
pres.author = "Devi";
pres.title = "Happy Birthday Prianshi";

// ── Palette ────────────────────────────────────────────────
const BG = "0E0A14", BG2 = "08081A", CARD = "1A1528", CARD_B = "2A1E40";
const GOLD = "D4A017", GOLD_L = "F0C040", OFFW = "EDE8D5", MUTED = "9A8BB0", ROSE = "C2667A";

const W = 13.33, H = 7.5, M = 0.8, CW = W - 2 * M;
const sh = () => ({ type: "outer", blur: 14, offset: 4, angle: 135, color: "000000", opacity: 0.55 });

function photo(name) { const p = path.join(__dirname, "photos", name); return fs.existsSync(p) ? p : null; }
function frame(s, bg = BG) {
  s.background = { color: bg };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.1, fill: { color: GOLD }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.1, w: W, h: 0.1, fill: { color: GOLD }, line: { type: "none" } });
}
function title(s, t, y = 0.4) {
  s.addText(t, { x: M, y, w: CW, h: 0.7, fontFace: "Georgia", fontSize: 36, bold: true, color: GOLD_L, align: "center", margin: 0 });
}

console.log("Building FULL-content Prianshi_Birthday.pptx ...\n");

// ════════ SLIDE 1 — TITLE (text left, photo right) — full opening ════════
{
  const s = pres.addSlide(); frame(s);
  const pw = 4.4, px = W - pw, tX = M, tW = px - M - 0.5;
  const p3 = photo("p3.jpg");
  if (p3) s.addImage({ path: p3, x: px, y: 0.1, w: pw, h: H - 0.2, sizing: { type: "cover", w: pw, h: H - 0.2 } });
  else s.addShape(pres.shapes.RECTANGLE, { x: px, y: 0.1, w: pw, h: H - 0.2, fill: { color: CARD } });
  s.addShape(pres.shapes.RECTANGLE, { x: px, y: 0.1, w: 0.06, h: H - 0.2, fill: { color: GOLD }, line: { type: "none" } });

  s.addText("29 MAY", { x: tX, y: 0.5, w: tW, h: 0.4, fontFace: "Calibri", fontSize: 15, bold: true, charSpacing: 8, color: GOLD, align: "left", margin: 0 });
  s.addText("Happy Birthday,\nDevi Prianshi", { x: tX, y: 0.95, w: tW, h: 2.0, fontFace: "Georgia", fontSize: 44, bold: true, color: GOLD_L, align: "left", valign: "top", shadow: sh(), margin: 0 });
  s.addText(
    [
      { text: "What I love or like about you — it's a thousand of things.\n\n", options: { color: OFFW, fontSize: 15, italic: true } },
      { text: "But to be honest, the Prianshi I have seen? I don't know if anyone has seen her like I have.\n\n", options: { color: OFFW, fontSize: 14 } },
      { text: "Or I'd say — my life's golden chance, that I met a legendary creature on this planet.", options: { color: GOLD_L, fontSize: 15, bold: true } },
    ],
    { x: tX, y: 3.45, w: tW, h: 3.6, fontFace: "Palatino Linotype", lineSpacingMultiple: 1.25, align: "left", valign: "top", margin: 0 }
  );
  console.log("✓ 1  Title");
}

// ════════ SLIDE 2 — YOU ARE NOT A SINGLE PERSON (full MSG1 personalities) ════════
{
  const s = pres.addSlide(); frame(s);
  title(s, "You Are Not A Single Person");
  s.addText("Dude, you have 1000 personalities inside you", { x: M, y: 1.12, w: CW, h: 0.4, fontFace: "Palatino Linotype", fontSize: 15, italic: true, color: MUTED, align: "center", margin: 0 });

  s.addText(
    [
      { text: "You are not a single person. You are a civilization.\n\n", options: { color: GOLD_L, fontSize: 17, bold: true } },
      { text: "Bhar se pathar, andar se naram — the rarest combo. Tere innocence, tere harkatein, tera aura, tere baatien.\n\n", options: { color: OFFW, fontSize: 16 } },
      { text: "Your aura of being a therapist — an unpaid therapist. Hai app malik! And the best part — a singer.\n\n", options: { color: OFFW, fontSize: 16 } },
      { text: "A supportive friend jo duniya se ladh jaye apke liye — if she's real to you, or you're her hommie.\n\n", options: { color: GOLD_L, fontSize: 16, bold: true } },
      { text: "The spirit of winning. Those titles.", options: { color: GOLD, fontSize: 17, bold: true, italic: true } },
    ],
    { x: M + 1.0, y: 1.75, w: CW - 2.0, h: 5.3, fontFace: "Calibri", lineSpacingMultiple: 1.4, align: "left", valign: "middle", margin: 0 }
  );
  console.log("✓ 2  Not A Single Person");
}

// ════════ SLIDE 3 — ONE DAY YOU LOST YOURSELF (full) ════════
{
  const s = pres.addSlide(); frame(s, BG2);
  title(s, "One Day You Lost Yourself", 0.7);
  s.addText('"Who am I?" — you asked.', { x: M, y: 1.55, w: CW, h: 0.5, fontFace: "Palatino Linotype", fontSize: 18, italic: true, color: MUTED, align: "center", margin: 0 });
  s.addText(
    [
      { text: "I have an answer to that.\n\n", options: { color: OFFW, fontSize: 18 } },
      { text: "And the answer is simply this —\n\n", options: { color: OFFW, fontSize: 17 } },
      { text: "Prianshi is all of them.\nEvery. Single. One.\n\n", options: { color: GOLD_L, fontSize: 24, bold: true } },
      { text: "I have seen every version. All 1000 of them.", options: { color: GOLD, fontSize: 17, bold: true, italic: true } },
    ],
    { x: M + 1.5, y: 2.5, w: CW - 3, h: 4.2, fontFace: "Palatino Linotype", lineSpacingMultiple: 1.35, align: "center", valign: "top", margin: 0 }
  );
  console.log("✓ 3  Lost Yourself");
}

// ════════ SLIDE 4 — MEMORABLE MOMENTS (intro + Shamshan, teaser to phone) ════════
{
  const s = pres.addSlide(); frame(s);
  title(s, "Memorable Moments");
  s.addText("I have plenty of them 🫠", { x: M, y: 1.12, w: CW, h: 0.4, fontFace: "Palatino Linotype", fontSize: 15, italic: true, color: MUTED, align: "center", margin: 0 });

  const cy = 1.8, ch = 4.95, gap = 0.6, cw = (CW - gap) / 2;
  // Card 1 — Shamshan
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: cy, w: cw, h: ch, rectRadius: 0.1, fill: { color: CARD }, line: { color: CARD_B, width: 1.5 }, shadow: sh() });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: cy, w: cw, h: 0.09, fill: { color: ROSE }, line: { type: "none" } });
  s.addText("😂  The Shamshan Business Idea", { x: M + 0.35, y: cy + 0.3, w: cw - 0.7, h: 0.9, fontFace: "Georgia", fontSize: 19, bold: true, color: ROSE, align: "left", valign: "top", margin: 0 });
  s.addText("For telling you — I think the best is your shamshan business idea.\n\nOnly you could come up with something like this and make it completely logical.\n\nPeak chaotic energy. Certified iconic.", { x: M + 0.35, y: cy + 1.35, w: cw - 0.7, h: ch - 1.6, fontFace: "Calibri", fontSize: 14, color: OFFW, align: "left", valign: "top", lineSpacingMultiple: 1.4, margin: 0 });
  // Card 2 — Friend In Need teaser
  const c2 = M + cw + gap;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: c2, y: cy, w: cw, h: ch, rectRadius: 0.1, fill: { color: CARD }, line: { color: CARD_B, width: 1.5 }, shadow: sh() });
  s.addShape(pres.shapes.RECTANGLE, { x: c2, y: cy, w: cw, h: 0.09, fill: { color: GOLD }, line: { type: "none" } });
  s.addText("🫠  Friend In Need", { x: c2 + 0.35, y: cy + 0.3, w: cw - 0.7, h: 0.6, fontFace: "Georgia", fontSize: 19, bold: true, color: GOLD_L, align: "left", valign: "top", margin: 0 });
  s.addText(
    [
      { text: "And the 'friend in need' wala — us josh se, bandi mere liye chal ke gayi strangers' DMs mein. Itni door. Just to get my phone back. 🫠\n\n", options: { color: OFFW, fontSize: 14 } },
      { text: "My dumbness — but a saviour. 🫶\n\n", options: { color: GOLD_L, fontSize: 14, bold: true } },
      { text: "The full story is on the next page →", options: { color: GOLD, fontSize: 13, bold: true, italic: true } },
    ],
    { x: c2 + 0.35, y: cy + 1.0, w: cw - 0.7, h: ch - 1.25, fontFace: "Calibri", align: "left", valign: "top", lineSpacingMultiple: 1.4, margin: 0 }
  );
  console.log("✓ 4  Memorable Moments");
}

// ════════ SLIDE 5 — THE PHONE RESCUE (full MSG2 phone portion) ════════
{
  const s = pres.addSlide(); frame(s, BG2);
  title(s, "The Phone Rescue 📱", 0.55);
  s.addText("Friend In Need — the one I'll never forget", { x: M, y: 1.3, w: CW, h: 0.4, fontFace: "Palatino Linotype", fontSize: 15, italic: true, color: MUTED, align: "center", margin: 0 });
  s.addText(
    [
      { text: "Us josh se — bandi mere liye chal ke gayi DMs mein. Itni door gayi. Just to get my phone back.\n\n", options: { color: OFFW, fontSize: 16 } },
      { text: "My dumbness… but you? A saviour, Prianshi. I never can forget that.\n\n", options: { color: GOLD_L, fontSize: 16, bold: true } },
      { text: "It was genuinely a big thing for me — what you did.\nSomeone listening would say \"kya hi ho gaya\" — but I know how big that is.\n\n", options: { color: OFFW, fontSize: 16 } },
      { text: "Because you chose that over what you needed. You invested your time on my problem.\n\n", options: { color: GOLD_L, fontSize: 16, bold: true } },
      { text: "That's not a friend. That's a saviour.", options: { color: GOLD, fontSize: 18, bold: true, italic: true } },
    ],
    { x: M + 0.9, y: 1.85, w: CW - 1.8, h: 5.1, fontFace: "Calibri", lineSpacingMultiple: 1.28, align: "center", valign: "middle", margin: 0 }
  );
  console.log("✓ 5  Phone Rescue");
}

// ════════ SLIDE 6 — O PHULLA WARGI HAI (full MSG3) photo narrow right ════════
{
  const s = pres.addSlide(); frame(s);
  const pw = 3.5, px = W - pw, tX = M, tW = px - M - 0.45;
  const p2 = photo("p2.jpg");
  if (p2) s.addImage({ path: p2, x: px, y: 0.1, w: pw, h: H - 0.2, sizing: { type: "cover", w: pw, h: H - 0.2 } });
  else s.addShape(pres.shapes.RECTANGLE, { x: px, y: 0.1, w: pw, h: H - 0.2, fill: { color: CARD } });
  s.addShape(pres.shapes.RECTANGLE, { x: px, y: 0.1, w: 0.06, h: H - 0.2, fill: { color: GOLD }, line: { type: "none" } });

  s.addText('"O Phulla Wargi Hai"', { x: tX, y: 0.4, w: tW, h: 0.6, fontFace: "Georgia", fontSize: 32, bold: true, color: GOLD_L, align: "left", margin: 0 });
  s.addText("There are plenty of songs — I can't name them, I don't remember — but I can say this small poetic line:", { x: tX, y: 0.98, w: tW, h: 0.55, fontFace: "Palatino Linotype", fontSize: 12, italic: true, color: MUTED, align: "left", margin: 0 });
  s.addText(
    [
      { text: "Jagdi rehendi hai raata nu, jugnu ban, har halat ch — apne aap nu sambhaldi, apne aap nu banaondi, oo aage vaddhdi jaandi hai.\n\n", options: { color: OFFW, fontSize: 13 } },
      { text: "She is a warrior. Mysterious. Yet here to rule the world.\n\n", options: { color: GOLD_L, fontSize: 13, bold: true } },
      { text: "When I feel alone, I always remember — only the buddy is the one who can, just by her presence, change samne wale ka mood.\n\n", options: { color: OFFW, fontSize: 13 } },
      { text: "Achha khana explore karte hoye — kyunki she is a foodie. Achhe kapde dekh jaye — because a baddie should own that. Koi trip offer karo? Bas! This lady is 'ghumi-ghumi karo' — Dora the Explorer.\n\n", options: { color: GOLD_L, fontSize: 13, bold: true } },
      { text: "Bas kabhi kabhi khud ke potential explore karte karte khud ke nuksan explore kar leti — she creates the problem, then solves it. She'll be like: \"Hum hi sab hain.\"", options: { color: MUTED, fontSize: 12.5 } },
    ],
    { x: tX, y: 1.6, w: tW, h: 5.6, fontFace: "Calibri", lineSpacingMultiple: 1.1, align: "left", valign: "top", margin: 0 }
  );
  console.log("✓ 6  O Phulla Wargi Hai");
}

// ════════ SLIDE 7 — YOUR PRIME (full MSG4) photo narrow left ════════
{
  const s = pres.addSlide(); frame(s);
  const pw = 3.5, px = 0, tX = pw + 0.45, tW = W - tX - M;
  const p1 = photo("p1.jpg");
  if (p1) s.addImage({ path: p1, x: px, y: 0.1, w: pw, h: H - 0.2, sizing: { type: "cover", w: pw, h: H - 0.2 } });
  else s.addShape(pres.shapes.RECTANGLE, { x: px, y: 0.1, w: pw, h: H - 0.2, fill: { color: CARD } });
  s.addShape(pres.shapes.RECTANGLE, { x: pw - 0.06, y: 0.1, w: 0.06, h: H - 0.2, fill: { color: GOLD }, line: { type: "none" } });

  s.addText("Your PRIME", { x: tX, y: 0.4, w: tW, h: 0.6, fontFace: "Georgia", fontSize: 32, bold: true, color: GOLD_L, align: "left", margin: 0 });
  s.addText(
    [
      { text: "Fav version of her — when she is winning, when she is real. I have 2 fav versions, but I'll tell one (only one needed for now):\n\n", options: { color: MUTED, fontSize: 12.5, italic: true } },
      { text: "Bro, winning. Bro, confidence. Bro, doing everything — she being a ninja, without any loss. Victory, not overthinking. Becoming a 'tea', abs-wali tea — double oyee-hoyee-hoyee, bhot mast aandi hai, bro, in prime! 🔥\n\n", options: { color: GOLD_L, fontSize: 13, bold: true } },
      { text: "Yaar, tu bhot suljhi hoye, pyari si ladki hai — dil se har cheez karne wali. Kabhi kabhi duniya samajh nahi paati tujhe, but tu apne se pehle samne wale ke liye khadi ho jaati — bhi dekha maine.\n\n", options: { color: OFFW, fontSize: 13 } },
      { text: "If someone gets important to you, oss ki life badal de gi yeh ladki. The kind of efforts you put 🫠 is unbelievable.\n\n", options: { color: OFFW, fontSize: 13 } },
      { text: "But kabhi kabhi log kadar nahi daalte, gussa aata hai — because you're living a dream, bro, and you don't understand it. Prianshi ke list mein aisi jagah milna is heaven.\n\n", options: { color: GOLD_L, fontSize: 13, bold: true } },
      { text: "In short — your prime is your best version.", options: { color: GOLD, fontSize: 14, bold: true, italic: true } },
    ],
    { x: tX, y: 1.1, w: tW, h: 6.1, fontFace: "Calibri", lineSpacingMultiple: 1.08, align: "left", valign: "top", margin: 0 }
  );
  console.log("✓ 7  Your Prime");
}

// ════════ SLIDE 8 — EVERY MOMENT WITH HER (full MSG5) ════════
{
  const s = pres.addSlide(); frame(s, BG2);
  title(s, "Every Moment With Her", 0.5);
  s.addText(
    [
      { text: "Every moment — because with Prianshi, har waqt tumhe motivation milegi, ik next-level energy milegi. Kuch ukhadna hai life mein? Yeh jasba aa hi jayega.\n\n", options: { color: OFFW, fontSize: 16 } },
      { text: "And her life thoughts tumhe insaan bana denge.\n\n", options: { color: GOLD_L, fontSize: 16, bold: true } },
      { text: "Tere saath har waqt hi insane hota — bachodi se leke funny stories. Tu gussa bhi unhi se hoti jo tujhe apne lagte.\n\n", options: { color: OFFW, fontSize: 16 } },
      { text: 'Even if you get rude sometimes, it feels like — "haan bhai, list mein ho." 😂\n\n', options: { color: OFFW, fontSize: 16 } },
      { text: "Haan, matlab rude bhi 3–4 tareeke ka hai tera — but good rude ki baat kar raha. Ab dictionary kaise aur din — \"4 Types of Rudeness.\" 😂", options: { color: GOLD, fontSize: 16, bold: true, italic: true } },
    ],
    { x: M + 0.9, y: 1.35, w: CW - 1.8, h: 5.7, fontFace: "Calibri", lineSpacingMultiple: 1.28, align: "center", valign: "middle", margin: 0 }
  );
  console.log("✓ 8  Every Moment");
}

// ════════ SLIDE 9 — HER EFFORTS (full MSG6) ════════
{
  const s = pres.addSlide(); frame(s);
  title(s, "Her Efforts", 0.5);
  s.addText(
    [
      { text: "Prianshi is an unpaid therapist, yaar. Tere bachodi se leke tere baatien, tere saath bitaya samma — just can't explain, bro.\n\n", options: { color: GOLD_L, fontSize: 16, bold: true } },
      { text: "Tu jab really insaan ko chunti — \"haan, mujhe iss mehfil mein rehna hai\" — tu mehfilon ke shaan ban jaati.\n\n", options: { color: OFFW, fontSize: 16 } },
      { text: "Every time I have met you, I have got so much epic-level fun, bachodi, and kya kya cheezein hoti hain. Tu choti se choti cheez ka dhyan rakhte, yaar.\n\n", options: { color: OFFW, fontSize: 16 } },
      { text: "Simple bolo — having you in life is worthy than having 1 million friends. You are above that one million.\n\n", options: { color: GOLD_L, fontSize: 16, bold: true } },
      { text: "So at any cost, I would save this friendship — because bhagwan bhi kabhi kabhi dayalu hoke aise diva-level log deta.", options: { color: GOLD, fontSize: 16, bold: true, italic: true } },
    ],
    { x: M + 0.9, y: 1.3, w: CW - 1.8, h: 5.75, fontFace: "Calibri", lineSpacingMultiple: 1.25, align: "center", valign: "middle", margin: 0 }
  );
  console.log("✓ 9  Her Efforts");
}

// ════════ SLIDE 10 — THEN & NOW (3 photos) ════════
{
  const s = pres.addSlide(); frame(s);
  title(s, "Then & Now", 0.4);
  s.addText("Always iconic. Always legendary. Always her.", { x: M, y: 1.12, w: CW, h: 0.4, fontFace: "Palatino Linotype", fontSize: 15, italic: true, color: MUTED, align: "center", margin: 0 });
  const gap = 0.5, iw = (CW - 2 * gap) / 3, iy = 1.75, ih = 4.0, capY = iy + ih + 0.2;
  const imgs = [
    { f: "p1.jpg", t: "Mini Prianshi", d: "With the crown.\nAlways royalty." },
    { f: "p2.jpg", t: "The Energy", d: "That smile.\nChaos queen." },
    { f: "p3.jpg", t: "Present Day", d: "Bhar se pathar,\nandar se naram." },
  ];
  imgs.forEach((it, i) => {
    const ix = M + i * (iw + gap);
    const p = photo(it.f);
    if (p) s.addImage({ path: p, x: ix, y: iy, w: iw, h: ih, sizing: { type: "cover", w: iw, h: ih } });
    else s.addShape(pres.shapes.RECTANGLE, { x: ix, y: iy, w: iw, h: ih, fill: { color: CARD } });
    s.addShape(pres.shapes.RECTANGLE, { x: ix, y: iy, w: iw, h: ih, fill: { type: "none" }, line: { color: GOLD, width: 2 } });
    s.addText(it.t, { x: ix, y: capY, w: iw, h: 0.4, fontFace: "Georgia", fontSize: 16, bold: true, color: GOLD_L, align: "center", margin: 0 });
    s.addText(it.d, { x: ix, y: capY + 0.42, w: iw, h: 0.7, fontFace: "Calibri", fontSize: 12, italic: true, color: OFFW, align: "center", margin: 0 });
  });
  console.log("✓ 10 Then & Now");
}

// ════════ SLIDE 11 — A FEW MORE MOMENTS (3-photo collage: 1 big + 2 stacked) ════════
{
  const s = pres.addSlide(); frame(s, BG2);
  title(s, "A Few More Moments", 0.4);
  s.addText("Kuch aur lamhe — tere saath. 🩷", { x: M, y: 1.12, w: CW, h: 0.4, fontFace: "Palatino Linotype", fontSize: 15, italic: true, color: MUTED, align: "center", margin: 0 });

  const top = 1.75, bot = H - 0.4, ch = bot - top;          // collage band
  const bigW = (CW - 0.45) * 0.58, bigX = M;                 // big photo left
  const smX = bigX + bigW + 0.45, smW = CW - bigW - 0.45;    // small column right
  const smH = (ch - 0.4) / 2;

  const big = photo("p3.jpg");
  if (big) s.addImage({ path: big, x: bigX, y: top, w: bigW, h: ch, sizing: { type: "cover", w: bigW, h: ch } });
  else s.addShape(pres.shapes.RECTANGLE, { x: bigX, y: top, w: bigW, h: ch, fill: { color: CARD } });
  s.addShape(pres.shapes.RECTANGLE, { x: bigX, y: top, w: bigW, h: ch, fill: { type: "none" }, line: { color: GOLD, width: 2.5 } });

  [["p1.jpg", top], ["p2.jpg", top + smH + 0.4]].forEach(([f, y]) => {
    const p = photo(f);
    if (p) s.addImage({ path: p, x: smX, y, w: smW, h: smH, sizing: { type: "cover", w: smW, h: smH } });
    else s.addShape(pres.shapes.RECTANGLE, { x: smX, y, w: smW, h: smH, fill: { color: CARD } });
    s.addShape(pres.shapes.RECTANGLE, { x: smX, y, w: smW, h: smH, fill: { type: "none" }, line: { color: GOLD, width: 2.5 } });
  });
  console.log("✓ 11 A Few More Moments");
}

// ════════ SLIDE 12 — CLOSING ════════
{
  const s = pres.addSlide(); frame(s, BG2);
  s.addShape(pres.shapes.RECTANGLE, { x: M + 1.5, y: 1.5, w: CW - 3, h: 4.5, fill: { color: CARD }, line: { color: GOLD, width: 2 }, shadow: sh() });
  s.addText("🎂", { x: M, y: 1.9, w: CW, h: 0.9, fontSize: 44, align: "center", margin: 0 });
  s.addText("Happy Birthday,\nDevi Prianshi", { x: M, y: 2.85, w: CW, h: 1.5, fontFace: "Georgia", fontSize: 40, bold: true, color: GOLD_L, align: "center", margin: 0 });
  s.addText("Not a gift you can hold — but everything I feel.\nThe rarest creature I ever met. 🫶", { x: M, y: 4.5, w: CW, h: 1.0, fontFace: "Palatino Linotype", fontSize: 16, italic: true, color: OFFW, align: "center", margin: 0 });
  s.addText("— 29 May", { x: M, y: 5.5, w: CW, h: 0.4, fontFace: "Calibri", fontSize: 14, bold: true, charSpacing: 4, color: GOLD, align: "center", margin: 0 });
  console.log("✓ 11 Closing");
}

const out = (() => { try { fs.openSync("Prianshi_Birthday.pptx", "r+"); return "Prianshi_Birthday.pptx"; } catch { return fs.existsSync("Prianshi_Birthday.pptx") ? "Prianshi_Birthday_FIXED.pptx" : "Prianshi_Birthday.pptx"; } })();
pres.writeFile({ fileName: out }).then(f => console.log("\n✅ SAVED:", f))
  .catch(() => pres.writeFile({ fileName: "Prianshi_Birthday_FIXED.pptx" }).then(f => console.log("\n✅ SAVED (alt):", f)));
