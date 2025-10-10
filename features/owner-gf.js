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
        let featuresFiles = readdirSync('./features').filter(file => file.endsWith('.js'))
        let featureNames = featuresFiles.map(v => v.replace('.js', ''))
        
        if (!text) {
            return m.reply(`❓ *Parameter diperlukan!*\n\nContoh penggunaan:\n${usedPrefix + command} info\n\n📁 *Daftar plugins:*\n${featureNames.map(v => ' • ' + v).join('\n')}`)
        }
        
        if (!featureNames.includes(text)) {
            return m.reply(`❌ *Plugin tidak ditemukan!*\n\n📁 *Daftar plugins yang tersedia:*\n${featureNames.map(v => ' • ' + v).join('\n')}`)
        }
        
        let result
        try {
            result = await exec(`cat features/${text}.js`)
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
            const maxLength = 3000
            const output = stdout.trim()
            const finalOutput = output.length > maxLength 
                ? output.substring(0, maxLength) + '\n\n... (output dipotong karena terlalu panjang)' 
                : output
            
            return m.reply(`📄 *Isi plugins ${text}.js:*\n\n\`\`\`javascript\n${finalOutput}\n\`\`\``)
        } else {
            return m.reply(`❌ *File plugins ${text}.js kosong atau tidak dapat dibaca.*`)
        }
        
    } catch (error) {
        console.error('Handler error:', error)
        return m.reply(`❌ *Terjadi kesalahan:*\n${error.message}`)
    }
}

handler.help = ['gf']
handler.tags = ['owner']
handler.command = /^(gf|getfeatures)$/i
handler.owner = true

export default handler