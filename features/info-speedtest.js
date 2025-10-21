import cp from 'child_process'
import { promisify } from 'util'

const exec = promisify(cp.exec).bind(cp)

let handler = async (m, { conn }) => {
    try {
        await m.reply('*⏳ Memulai Speedtest.*')
        
        let o
        try {
            o = await exec('speedtest --accept-license')
        } catch (e) {
            o = await exec('python3 function/speedtest.py')
        }
        
        let { stdout, stderr } = o
        let result = stdout || stderr
        conn.reply(m.chat, `📊 *Speedtest Results*\n\n${result}`, m)
        
    } catch (error) {
        conn.reply(m.chat, 
            '*❌ Gagal Melakukan Speedtest.*', 
            m
        )
    }
}

handler.help = ['speedtest']
handler.tags = ['info']
handler.command = /^(speedtest|testspeed|spdt)$/i

export default handler