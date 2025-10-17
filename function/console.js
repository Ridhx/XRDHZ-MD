/* XRDHZ-MD
  Script ini tidak untuk diperjual-belikan atau gratis.
  Script masih dalam tahap pengembangan mungkin akan ada bug, error dan lain sebagainya.
*/
import "../settings.js";
import os from "os";
import chalk from "chalk";
import CFonts from "cfonts";
import cp from "child_process";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);
const { name, author, version, dependencies } = require(join(__dirname, "../package.json"));
const sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export async function headerLog() {
    await sleep(600);
    console.clear();
    CFonts.say("\n XRDHZ-MD", {
        font: "tiny",
        align: "left",
        colors: ["white"],
        gradient: ["green", "blue"]
    });

    console.log(chalk.bold.white("━".repeat(50)));
    console.log(chalk.bold.yellow(" • SCRIPT INFO"));
    console.log(chalk.gray("-".repeat(50)));
    console.log(chalk.white(` ➢ 🤖  Author: ${chalk.green.bold(author)}`));
    console.log(chalk.white(` ➢ 👤  Github: ${chalk.blue(global.lgh)}`));
    console.log(chalk.white(` ➢ ✅  Whatsapp: ${chalk.blue(global.lwa)}`));
    console.log(chalk.white(` ➢ ⚙️  Baileys: ${chalk.cyan(dependencies.baileys.replace("^", "v"))}`));
    console.log(chalk.gray("━".repeat(50)));
    console.log(chalk.bold.blue(" • SERVER INFO"));
    console.log(chalk.gray("-".repeat(50)));
    console.log(chalk.white(` ➢ 🖥  Platform: ${chalk.green(os.platform())}`));
    console.log(
        chalk.white(` ➢ 🖥  CPU Model: ${chalk.blue(os.cpus() ? os.cpus()[0].model.trim() : "N/A")}`)
    );
    console.log(chalk.white(` ➢ 🖥  Total Memori: ${formatBytes(os.totalmem())}`));
    console.log(chalk.white(` ➢ 🖥  Free Memori: ${formatBytes(os.freemem())}`));
    console.log(chalk.gray("━".repeat(50)));
    console.log(chalk.bold.green(" • QUICK TEST"));
    console.log(chalk.gray("-".repeat(50)));
    await quickTest().then(s => {
        const ffmpegCheck = s.ffmpeg && s.ffmpegWebp;
        const magickCheck = s.convert || s.magick || s.gm;
        const ffmpegStatus = ffmpegCheck ? "✅" : "❌";
        console.log(` ➢ 📂  ${chalk.red("FFMPEG")}: ${ffmpegStatus}`);
        const magickStatus = magickCheck ? "✅" : "❌";
        console.log(` ➢ 📂  ${chalk.red("MAGICK")}: ${magickStatus}`);
        if (!ffmpegCheck || !magickCheck) {
            console.log(chalk.gray("-".repeat(50)));
            if (!s.ffmpeg) console.log(chalk.yellow("-- ffmpeg belum terinstall (pkg install ffmpeg)"));
            if (s.ffmpeg && !s.ffmpegWebp)
                console.log(chalk.yellow("-- ffmpeg belum mendukung webp (--enable-libwebp)"));
            if (!s.convert && !s.magick && !s.gm)
                console.log(chalk.yellow("-- imagemagick belum terinstall (pkg install imagemagick)"));
        }
    });
    console.log(chalk.bold.white("━".repeat(50)));
}

const quickTest = async function quickTest() {
    let test = await Promise.all(
        [
            cp.spawn("ffmpeg"),
            cp.spawn("ffprobe"),
            cp.spawn("ffmpeg", [
                "-hide_banner",
                "-loglevel",
                "error",
                "-filter_complex",
                "color",
                "-frames:v",
                "1",
                "-f",
                "webp",
                "-"
            ]),
            cp.spawn("convert"),
            cp.spawn("magick"),
            cp.spawn("gm"),
            cp.spawn("find", ["--version"])
        ].map(p => {
            return Promise.race([
                new Promise(resolve => {
                    p.on("close", code => resolve(code !== 127));
                }),
                new Promise(resolve => {
                    p.on("error", _ => resolve(false));
                })
            ]);
        })
    );

    let [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
    let support = { ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find };

    return support;
};

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
