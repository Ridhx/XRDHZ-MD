import moment from 'moment-timezone'

let handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin, isROwner }) => {
    let isEnable = /true|enable|(turn)?on|1/i.test(command)
    let chat = global.db.data.chats[m.chat]
    let user = global.db.data.users[m.sender]
    let name = `${user.registered ? user.name : await conn.getName(m.sender)}`
    let type = (args[0] || '').toLowerCase()

    const getStatus = (value) => value ? '🟢' : '🔴'
    
    const featureConfig = {
        welcome: {
            name: 'Welcome Message',
            description: 'Pesan selamat datang',
            dbProperty: 'sambutan',
            access: 'admin' // admin atau owner
        },
        antilink: {
            name: 'Anti Link',
            description: 'Blokir pengiriman link otomatis', 
            dbProperty: 'antilink',
            access: 'admin'
        },
        antispam: {
            name: 'Anti Spam',
            description: 'Blokir pesan spam dalam grup',
            dbProperty: 'antispam',
            access: 'admin'
        }
    }

    const createMenuMessage = () => {
        let menu = `
✨ *PENGATURAN BOT* ✨

Halo *${name}*! ${getGreeting()}

📊 *STATUS FITUR:*
${Object.entries(featureConfig).map(([key, feature]) => {
    // Tampilkan status berdasarkan akses
    let status = getStatus(chat[feature.dbProperty])
    let accessIcon = feature.access === 'owner' ? '👑 ' : '👥 '
    return `${status} ${accessIcon}*${feature.name}* - ${feature.description}`
}).join('\n')}

🟢 = Fitur Aktif | 🔴 = Fitur Nonaktif
👑 = Owner Only | 👥 = Admin Group

📝 *CARA MENGGUNAKAN:*
• *${usedPrefix}enable <fitur>* - Aktifkan fitur
• *${usedPrefix}disable <fitur>* - Nonaktifkan fitur

💡 *Fitur yang tersedia:* ${Object.keys(featureConfig).join(', ')}
        `.trim()
        
        return menu
    }

    if (type && !featureConfig[type]) {
        let featureList = Object.keys(featureConfig).join(', ')
        return m.reply(`❌ Fitur "${type}" tidak ditemukan!\n\n📋 Fitur yang tersedia: ${featureList}`)
    }

    if (type && featureConfig[type]) {
        const feature = featureConfig[type]

        if (feature.access === 'owner' && !isOwner) {
            return m.reply('❌ Fitur ini hanya dapat diakses oleh *Owner Bot*!')
        }
        
        if (feature.access === 'admin' && m.isGroup) {
            if (!(isAdmin || isOwner)) {
                global.dfail('admin', m, conn)
                throw false
            }
        }
        
        chat[feature.dbProperty] = isEnable
        await m.reply(`✅ *${feature.name}* telah ${isEnable ? 'di *Aktifkan*' : 'di *Nonaktifkan*'}!`)
        return
    }
    return m.reply(createMenuMessage())
}

handler.help = ['enable <command>', 'disable <command>']
handler.tags = ['group', 'owner']
handler.command = /^((en|dis)able|(tru|fals)e|(turn)?o(n|ff)|settings?|seting)$/i

export default handler

function getGreeting() {
    const time = moment.tz('Asia/Jakarta').format('HH')
    const greetings = {
        morning: 'Semoga harimu penuh berkah 🌄',
        day: 'Semoga siangmu menyenangkan ☀️', 
        evening: 'Semoga soremu tenang 🌇',
        night: 'Semoga malammu damai 🌙'
    }
    
    if (time >= 4 && time < 11) return greetings.morning
    if (time >= 11 && time < 15) return greetings.day
    if (time >= 15 && time < 18) return greetings.evening
    return greetings.night
}