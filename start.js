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

const startBot = async () => {
    const args = [path.join(__dirname, "main.js"), ...process.argv.slice(2)];
    const p = spawn(process.argv[0], args, {
        stdio: ["inherit", "inherit", "inherit", "ipc"]
    });

    p.on("exit", code => {
        console.log(chalk.red(`-- `));
        if (code === 1 || code === 0) startBot();
    });
};

// BELUM SELESAI :3

await headerLog();
await startBot();
