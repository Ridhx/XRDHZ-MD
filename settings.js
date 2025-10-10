/* XRDHZ-MD
  Script ini tidak untuk diperjual-belikan atau gratis.
  Script masih dalam tahap pengembangan mungkin akan ada bug, error dan lain sebagainya.
*/

import chalk from "chalk";
import { watchFile, unwatchFile } from "fs";
import { fileURLToPath } from "url";
import moment from "moment-timezone";

// ===== CONFIG =====
global.owner = ["6285751561624"];
global.nomorown = "6285751561624";

global.nomorbot = "6287825020012";
global.namabot = "XRDHZ-MD";

// ===== THUMBNAIL =====
global.thum = "https://qu.ax/NvoLP.jpg";

// ===== OPTIONS =====
global.autoRead = true; // OPSIONAL

// ===== LINK ====
global.lgh = "https://github.com/Ridhx/XRDHZ-MD"; // Github
global.lwa = "https://wa.me/6285751561624"; // Whatsapp
global.lig = ""; // Instagram
global.lgc = ""; // Group Chat Whatsapp
global.lch = ""; // Channels Whatsapp 
let file = fileURLToPath(import.meta.url);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.green.bold(`FILE DIUPDATE "settings.js"`)}`);
    import(`${file}?update=${Date.now()}`);
});
