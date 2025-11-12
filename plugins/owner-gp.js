import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
import { readdirSync } from 'fs'

const exec = promisify(_exec).bind(cp)

let handler = async (m, {
    conn,
    usedPrefix,
    command,
    text
}) => {
    try {
        let featuresFiles = readdirSync('./plugins').filter(file => file.endsWith('.js'))
        let featureNames = featuresFiles.map(v => v.replace('.js', ''))
        
        if (!text) {
            return m.reply(`❓ *Parameter diperlukan!*\n\nContoh penggunaan:\n${usedPrefix + command} info\n\n📁 *Daftar Plugins:*\n${featureNames.map(v => ' • ' + v).join('\n')}`)
        }
        
        if (!featureNames.includes(text)) {
            return m.reply(`❌ *Plugins tidak ditemukan!*\n\n📁 *Daftar features yang tersedia:*\n${featureNames.map(v => ' • ' + v).join('\n')}`)
        }
        
        let result
        try {
            result = await exec(`cat plugins/${text}.js`)
        } catch (execError) {
            console.error('Execution error:', execError)
            return m.reply(`❌ *Gagal membaca file plugins:*\n${execError.message}`)
        }
        
        const { stdout, stderr } = result
        
        if (stderr && stderr.trim()) {
            console.error('Stderr:', stderr)
            return m.reply(`⚠️ *Warning:*\n${stderr}`)
        }
        
        if (stdout && stdout.trim()) {
            const output = stdout.trim()
            
            return m.reply(output)
        } else {
            return m.reply(`❌ *File Plugins ${text}.js kosong atau tidak dapat dibaca.*`)
        }
        
    } catch (error) {
        console.error('Handler error:', error)
        return m.reply(`❌ *Terjadi kesalahan:*\n${error.message}`)
    }
}

handler.help = ['gp']
handler.tags = ['owner']
handler.command = /^(gp)$/i
handler.owner = true

export default handler
