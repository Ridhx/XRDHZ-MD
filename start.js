/* XRDHZ-MD
  Script ini tidak untuk diperjual-belikan atau gratis.
  Script masih dalam tahap pengembangan mungkin akan ada bug, error dan lain sebagainya.
*/

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import chalk from "chalk";
import readline from "readline";
import { headerLog } from "./function/console.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

let isRunning = false;
const startBot = async () => {
    if (isRunning) return;
    isRunning = true;
    const args = [path.join(__dirname, "main.js"), ...process.argv.slice(2)];
    const p = spawn(process.argv[0], args, {
        stdio: ["inherit", "inherit", "inherit", "ipc"]
    });

    p.on("exit", code => {
        console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.yellow.bold(`BERHENTI DENGAN KODE: ${code}`)}`);
        isRunning = false;
        if (code === 1 || code === 0) {
            sleep(600);
            startBot();
        }
    });

    p.on("error", err => {
        console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.red.bold(`ERROR ❌`)}`);
        console.error(err);
        p.kill();
        isRunning = false;
        sleep(600);
        startBot();
    });
    await headerLog();
};

await startBot();
