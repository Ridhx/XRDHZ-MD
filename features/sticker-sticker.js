let handler = async (m, { conn, command, usedPrefix }) => {
    if (m.quoted?.viewOnce) return;
    
    let sendSticker = async (media, isImage = true) => {
        m.reply(stage.wait);
        const optionsimg = {
            packname: info.namabot,
            author: info.namaown,
            isAnimated: false
        };
        
        const optionsvid = {
            packname: info.namabot,
            author: info.namaown,
            isAnimated: true
        };
        
        const smedia = isImage ? await conn.sendStickerImage(m.chat, media, m, optionsimg) : await conn.sendStickerVideo(m.chat, media, m, optionsvid);
    };
    
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";
    
    if (/webp/.test(mime)) {
        return m.reply("❌ *Gagal!*\nFile yang dikirim adalah sticker (WebP).\nSilakan kirim gambar (JPEG/PNG) atau video (MP4).");
    }
    
    if (/image\/(jpeg|png)/.test(mime)) {
        let media = await q.download();
        await sendSticker(media, true);
    } else if (/video|mp4/.test(mime)) {
        if ((q.msg || q).seconds > 15) return m.reply("*DURASI MAKSIMAL 15 DETIK*");
        let media = await q.download();
        await sendSticker(media, false);
    } else {
        m.reply(`*Sunda 🚫*`)
    }
};

handler.help = ["s", "stiker", "sticker"];
handler.command = /^(s|stiker|sticker)$/i;
handler.tags = ["sticker"];
handler.sewa = true;

export default handler;
