import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import syntaxError from 'syntax-error'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const parentDir = path.resolve(__dirname, '..')

function getJSFiles(dir) {
    let files = []
    
    try {
        const items = fs.readdirSync(dir)
        
        for (const item of items) {
            const fullPath = path.join(dir, item)
            const stat = fs.statSync(fullPath)
            
            // Skip node_modules
            if (stat.isDirectory()) {
                if (item === 'node_modules') continue
                files = files.concat(getJSFiles(fullPath))
            } else if (stat.isFile() && item.endsWith('.js')) {
                files.push(fullPath)
            }
        }
    } catch (error) {
        console.error('Error reading directory:', dir, error.message)
    }
    
    return files
}

const files = getJSFiles(parentDir)

console.log(`Found ${files.length} JavaScript files to check\n`)

for (const file of files) {
    if (file === __filename) continue
    
    console.log('Checking', path.relative(parentDir, file))
    
    try {
        const code = fs.readFileSync(file, 'utf8')
        const error = syntaxError(code, file, {
            sourceType: 'module',
            allowReturnOutsideFunction: true,
            allowAwaitOutsideFunction: true
        })
        
        if (error) {
            assert.ok(false, `${file}\n\n${error}`)
        }
        
        console.log('✅ Done', path.relative(parentDir, file))
    } catch (error) {
        console.error('❌ Error in', path.relative(parentDir, file))
        console.error(error.message)
        process.exit(1)
    }
}

console.log(`\n✅ All ${files.length} files checked successfully!`)