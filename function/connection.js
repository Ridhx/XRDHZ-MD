/* XRDHZ-MD
  Script ini tidak untuk diperjual-belikan atau gratis.
  Script masih dalam tahap pengembangan mungkin akan ada bug, error dan lain sebagainya.
*/

import readline from "readline";
import chalk from "chalk";
import { DisconnectReason } from "baileys";
import { headerLog } from "../function/console.js";

/**
 * Fungsi untuk membuat pairing kode.
 * @param {ReturnType<typeof makeWASocket>} conn
 */
export async function requestPairing(conn) {
    if (!conn.authState.creds.registered) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        try {
            console.clear();
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(chalk.bold.yellow("=============================================="));
            console.log(chalk.bold.yellow("           AUTENTIKASI WHATSAPP BOT           "));
            console.log(chalk.bold.yellow("=============================================="));
            console.log(chalk.bold.red("• Masukkan Nomor Bot Whatsapp Anda."));
            console.log(chalk.bold.red("• Contoh : 628123456789"));
            const question = text => new Promise(resolve => rl.question(text, resolve));
            let PhoneNumber = await question(chalk.redBright("➢ "));
            PhoneNumber = PhoneNumber.replace(/\D/g, "");
            rl.close();
            if (PhoneNumber) {
                console.clear();
                let code = await conn.requestPairingCode(PhoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.bold.green("=============================================="));
                console.log(chalk.bold.green("           KODE AUTENTIKASI WHATSAPP          "));
                console.log(chalk.bold.green("=============================================="));
                console.log(chalk.bold.white(` ➢  NOMOR BOT : ${PhoneNumber}`));
                console.log(chalk.bold.white(" ➢  KODE PAIRING : ") + chalk.bold.green(code));
                console.log(chalk.yellow.bold("\n LANGKAH UNTUK LOGIN"));
                console.log(chalk.white(" 1. Salin Kode dan Buka Whatsapp ditelepon"));
                console.log(chalk.white(" 2. Ketuk Perangkat tertaut, lalu Tautkan perangkat"));
                console.log(chalk.white(" 3. Ketuk Tautkan dengan nomor telepon saja"));
                console.log(chalk.white(" 4. Lalu masukkan kode ditelepon Anda."));
            } else {
                process.exit(1);
            }
        } catch (error) {
            console.log(
                `${chalk.white.bold(" [SISTEM]")} ${chalk.red.bold(`GAGAL MEMINTA KODE PAIRING ❌`)}`
            );
            console.log(error);
            process.exit(1);
        }
    }
}

/**
 * Fungsi untuk update koneksi.
 * @param {*} update
 * @param {ReturnType<typeof makeWASocket>} conn
 */
export async function connectionUpdate(update, conn) {
    const { receivedPendingNotifications, connection, lastDisconnnect, isOnline, isNewLogin } = update;
    try {
        if (isNewLogin) await headerLog();
    } catch (e) {
        console.log(e);
    } finally {
        if (connection === "open")
            console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.green.bold(`TERHUBUNG ✅`)}`);

        if (connection === "close") {
            console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.red.bold(`GAGAL TERHUBUNG ❌`)}`);
            await global.reloadHandler(true);
            console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.yellow.bold(`MENGHUBUNGKAN KEMBALI 🌐`)}`);
        }

        if (receivedPendingNotifications)
            console.log(
                `${chalk.white.bold(" [SISTEM]")} ${chalk.yellowBright.bold(`MENUNGGU PESAN MASUK 📥`)}`
            );

        if (
            lastDisconnnect &&
            lastDisconnnect.error &&
            lastDisconnnect.error.output &&
            lastDisconnnect.error.output.statusCode !== DisconnectReason.loggedOut
        ) {
            console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.yellow.bold(`MENGHUBUNGKAN KEMBALI 🌐`)}`);
            await global.reloadHandler(true);
        }

        return false;
    }
}
