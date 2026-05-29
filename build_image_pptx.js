const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
pres.layout = "WIDE";
pres.author = "Devi";
pres.title = "Happy Birthday Prianshi";

const dir = path.join(__dirname, "hires");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".png")).sort();
console.log("Found", files.length, "slide images");

files.forEach((f, i) => {
  const s = pres.addSlide();
  s.background = { color: "0E0A14" };
  // full-bleed image — every viewer renders this identically
  s.addImage({ path: path.join(dir, f), x: 0, y: 0, w: 13.33, h: 7.5 });
  console.log("✓ slide", i + 1, f);
});

const outPath = "C:\\Users\\khalo\\Downloads\\Prianshi_Birthday.pptx";
pres.writeFile({ fileName: outPath })
  .then(fp => console.log("\n✅ SAVED:", fp))
  .catch(e => {
    const alt = "C:\\Users\\khalo\\Downloads\\Prianshi_Birthday_FINAL.pptx";
    console.log("Main file locked, saving alt...");
    return pres.writeFile({ fileName: alt }).then(fp => console.log("✅ SAVED:", fp));
  });
