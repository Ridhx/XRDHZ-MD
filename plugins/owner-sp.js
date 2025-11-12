import fs from 'fs'

let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) return m.reply('Masukan Nama Pluginsnya');
    if (!m.quoted.text) throw `Balas codenya!`
    let path = `plugins/${text}.js`
    await fs.writeFileSync(path, m.quoted.text)
    m.reply(`Plugins Berhasil di simpan ${path}`)
}

handler.command = /^(sp)$/i;
handler.help = ['sp'];
handler.tags = ['owner'];
handler.owner = true;

export default handler
