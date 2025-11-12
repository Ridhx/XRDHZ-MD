import fs from 'fs'

let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) return m.reply('Masukan Pathnya');
    if (!m.quoted.text) throw `balas codenya!`
    let path = `${text}`
    await fs.writeFileSync(path, m.quoted.text)
    m.reply(`File Berhasil di simpan ${path}`)
}

handler.command = /^(sf)$/i;
handler.help = ['sf'];
handler.tags = ['owner'];
handler.owner = true;

export default handler
