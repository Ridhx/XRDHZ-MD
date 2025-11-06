import { WAMessageStubType } from "baileys";
import { parsePhoneNumber } from "awesome-phonenumber";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { unwatchFile, watchFile, readFileSync } from "fs";

export default async function (m, conn = { user: {} }) {
    if (m.fromMe) return;

    if (
        !m.message ||
        m.message.protocolMessage ||
        m.message.senderKeyDistributionMessage ||
        m.mtype === "protocolMessage" ||
        m.mtype === "senderKeyDistributionMessage"
    )
        return;

    const _name = m.pushName ? m.pushName : "unknown";
    const _chat = m.chat.endsWith("@g.us") ? m.chat : "~Private Chat";
    const sender = m.sender
        ? await parsePhoneNumber("+" + m.sender.replace("@s.whatsapp.net", ""))?.number?.international
        : "unknown";

    let user = global.db.data?.users[m.sender];
    let filesize =
        (m.msg
            ? m.msg.vcard
                ? m.msg.vcard.length
                : m.msg.fileLength
                ? m.msg.fileLength.low || m.msg.fileLength
                : m.msg.axolotlSenderKeyDistributionMessage
                ? m.msg.axolotlSenderKeyDistributionMessage.length
                : m.text
                ? m.text.length
                : 0
            : m.text
            ? m.text.length
            : 0) || 0;

    console.log(chalk.gray("-".repeat(50)));
    console.log(
        `${chalk.white(" » BOT:")} ${chalk.black(chalk.bgBlue("%s"))}
${chalk.white(" » SENDER:")} ${chalk.white("%s")}
${chalk.white(" » NAME:")} ${chalk.blueBright("%s")}
${chalk.white(" » DATE:")} ${chalk.gray("%s")}
${chalk.white(" » SEND TO:")} ${chalk.green("%s")}
${chalk.white(" » MTYPE:")} ${chalk.yellow("%s")} ${chalk.red("[%s %sB]")}`.trim(),
        global.namabot,
        sender,
        _name,
        (m.messageTimestamp
            ? new Date(1000 * (m.messageTimestamp.low || m.messageTimestamp))
            : new Date()
        ).toLocaleString("id", { timeZone: "Asia/Jakarta" }),
        _chat,
        m.mtype
            ? m.mtype
                  .replace(/message$/i, "")
                  .replace("audio", m.msg.ptt ? "PTT" : "audio")
                  .replace(/^./, v => v.toUpperCase())
            : "",
        filesize === 0 ? 0 : (filesize / 1009 ** Math.floor(Math.log(filesize) / Math.log(1000))).toFixed(1),
        ["", ..."KMGTP"][Math.floor(Math.log(filesize) / Math.log(1000))] || ""
    );
    console.log(chalk.gray("-".repeat(50)));
}

let file = fileURLToPath(import.meta.url);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.green.bold(`FILE DIUPDATE "print.js"`)}`);
});
