import cp, {
	exec as _exec
} from 'child_process'
import {
	promisify
} from 'util'
let exec = promisify(_exec).bind(cp)
let handler = async (m, {
	conn,
	command,
	text
}) => {
	if (global.conn.user.jid != conn.user.jid) return
	if (global.owner.some(number => m.sender.includes(number)) || m.fromMe) {
		m.reply('Eksekusi...')
		let o
		try {
			o = await exec(command.trimStart() + ' ' + text.trimEnd())
		} catch (e) {
			o = e
		} finally {
			let {
				stdout,
				stderr
			} = o
			if (stdout.trim()) m.reply(stdout)
			if (stderr.trim()) m.reply(stderr)
		}
	} else {
		global.dFail("rowner", m, conn);
	}
}
handler.help = ['$$ [Exec]']
handler.tags = ['owner']
handler.customPrefix = /^[$$] /
handler.command = new RegExp
handler.rowner = true

export default handler