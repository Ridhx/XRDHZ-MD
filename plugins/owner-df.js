import { join } from 'path'
import { readdirSync, unlinkSync, existsSync } from 'fs'

let handler = async (m, { conn, usedPrefix, command, args }) => {
    try {
        const featuresDir = join(process.cwd(), 'plugins')
        let ar1 = []
        
        try {
            const files = readdirSync(featuresDir)
            ar1 = files.filter(file => file.endsWith('.js')).map(file => file.replace('.js', ''))
        } catch (error) {
            return m.reply(`Error reading plugins directory: ${error.message}`)
        }
        
        if (!args[0]) return m.reply(`uhm.. where the text?\n\nexample:\n${usedPrefix + command} info`)
        if (!ar1.includes(args[0])) return m.reply(`*🗃️ NOT FOUND!*\n==================================\n\n${ar1.map(v => ' ' + v).join`\n`}`)
        
        const file = join(featuresDir, args[0] + '.js')
        if (!existsSync(file)) {
            return m.reply(`File "plugins/${args[0]}.js" doesn't exist!`)
        }
        
        unlinkSync(file)
        conn.reply(m.chat, `✅ Success deleted "plugins/${args[0]}.js"`, m)
        
    } catch (error) {
        console.error(error)
        m.reply(`❌ Failed to delete file: ${error.message}`)
    }
}

handler.help = ['dp']
handler.tags = ['owner']
handler.command = /^(dp)$/i
handler.rowner = true

export default handler
