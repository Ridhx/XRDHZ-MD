import { WAMessageStubType } from "baileys";
import { parsePhoneNumber } from "awesome-phonenumber";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { unwatchFile, watchFile, readFileSync } from "fs";

export default async function (m, conn = { user: {} }) {
    if (m.fromMe) return;
    const senderName = await conn.getName(m.sender);
    const groupName = await conn.getName(m.chat);
    const sender = await parsePhoneNumber("+" + m.sender.replace("@s.whatsapp.net", ""))?.number
        ?.international;

    let user = global.db.data?.users[m.sender];
    let chat = global.db.data?.chats[m.chat];

    let render = `${chalk.white(" » SENDER:")} ${chalk.yellow("%s")}\n`;
    render += `${chalk.white(" » DATE:")} ${chalk.yellow("%s")}`;
    console.log(chalk.gray("-".repeat(50)));
    console.log(
        render,
        sender,
        (m.messageTimestamp
            ? new Date(1000 * (m.messageTimestamp.low || m.messageTimestamp))
            : new Date()
        ).toLocaleString("id", { timeZone: "Asia/Jakarta" })
    );
    console.log(chalk.gray("-".repeat(50)));
}

let file = fileURLToPath(import.meta.url);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.green.bold(`FILE DIUPDATE "print.js"`)}`);
});
