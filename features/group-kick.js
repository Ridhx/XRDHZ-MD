import { areJidsSameUser } from 'baileys'

let handler = async (m, { conn, participants }) => {
    let usr = m.quoted ? [m.quoted.sender] : m.mentionedJid
    let users = usr.filter(u => !areJidsSameUser(u, conn.user.id))
    let kickedUser = []

    if (users.length === 0) {
        return m.reply(`❓ *Mana nomor yang mau dikick?*\n\nContoh penggunaan:\n• Reply pesan user dengan: *.kick*\n• Mention user: *.kick @user*\n\nSilakan sebutkan targetnya!`)
    }
    
    for (let user of users) {
        if (user.endsWith('@s.whatsapp.net')) {
            try {
                const member = participants.find(p => areJidsSameUser(p.id, user))
                
                const res = await conn.groupParticipantsUpdate(m.chat, [user], 'remove')
                kickedUser.push(user)
                await delay(1000)
                
            } catch (error) {
                console.error('Gagal mengeluarkan user:', error)
                m.reply(`❌ Gagal mengeluarkan user ${user.split('@')[0]}: ${error.message}`)
            }
        }
    }

    if (kickedUser.length > 0) {
        const userList = kickedUser.map(userJid => {
            const number = userJid.split('@')[0]
            return `• @${number}`
        }).join('\n')

        conn.sendMessage(m.chat, { 
            text: `🎯 *Berhasil Dikeluarkan*\n\n${userList}\n\n_Semoga bisa intro lagi di lain waktu~_`,
            mentions: kickedUser
        }, { quoted: m })
    } else {
        m.reply('❌ *Tidak ada user yang berhasil dikeluarkan*\n\nMungkin user sudah keluar atau terjadi error.')
    }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

handler.help = ['kick'].map(v => v + ' @user')
handler.tags = ['group', 'admin']
handler.command = /^(kick|keluarkan)$/i
handler.admin = true
handler.group = true
handler.botAdmin = true

export default handler