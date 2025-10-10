let handler = async (m, { conn, text }) => {
    return m.reply("test")
};

handler.help = ["test"];
handler.command = /^(test)$/i;
handler.premium = true;

export default handler;
