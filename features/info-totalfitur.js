import fs from 'fs'

let handler = async (m, { conn, args, command }) => {
    try {
        const features = Object.values(global.plugins)
            .filter(plugin => plugin.help && plugin.tags && !plugin.disabled)
            .map(plugin => plugin.help)
            .flat(1)
        
        const totalFeatures = Object.values(global.plugins)
            .filter(plugin => plugin.help && plugin.tags && !plugin.disabled)
            .length;

        const message = `📊 *Total Fitur Bot*\n\n` +
                       `┌ ◦ *Total Fitur*: ${totalFeatures}\n` +
                       `└ ◦ *Total Perintah*: ${features.length}`;

        await m.reply(message);
        
    } catch (error) {
        console.error('Error in totalfitur command:', error);
        await m.reply('❌ Terjadi kesalahan saat menghitung total fitur.');
    }
}

handler.help = ['totalfitur'];
handler.tags = ['info'];
handler.command = ['totalfitur', 'totalcmd', 'totalfeatures'];

export default handler;