import { existsSync, readdirSync, watch } from 'fs'
import { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const pluginFolder = join(__dirname, 'plugins')

global.plugins = {}

// Ini untuk lot pelugins
async function loadPlugin(file, { cacheBust = false } = {}) {
    if (!file.endsWith('.js')) return

    const filePath = join(pluginFolder, file)
    if (!existsSync(filePath)) {
        if (global.plugins[file]) {
            delete global.plugins[file]
            console.log(`Plugin removed: ${file}`)
        }
        return
    }

    try {
        const url = pathToFileURL(filePath).href
        const module = await import(cacheBust ? `${url}?v=${Date.now()}` : url)
        global.plugins[file] = module.default || module
        console.log(`Plugin ${cacheBust ? 'reloaded' : 'loaded'}: ${file}`)
    } catch (e) {
        console.error(`Gagal load plugin ${file}:`, e)
    }
}

export async function loadPlugins() {
    const files = readdirSync(pluginFolder).filter(file => file.endsWith('.js'))
    await Promise.all(files.map(file => loadPlugin(file)))
}
await loadPlugins()

const pendingReloads = new Map()
watch(pluginFolder, (eventType, filename) => {
    const file = filename?.toString()
    if (!file?.endsWith('.js')) return

    clearTimeout(pendingReloads.get(file))
    pendingReloads.set(file, setTimeout(async () => {
        pendingReloads.delete(file)
        await loadPlugin(file, { cacheBust: true })
    }, 150))
})

console.log(`Watching plugins: ${pluginFolder}`)




// Ini buat ambil text
function getMessageText(message) {
    const content = message.message || {}
    return content.conversation
        || content.extendedTextMessage?.text
        || content.imageMessage?.caption
        || content.videoMessage?.caption
        || ''
}

// Ini buat hendeler
export async function handler(conn, message) {
    
        const text = getMessageText(message)


        // ngirim pesan
        const reply = async text => conn.sendMessage(
            message.key.remoteJid,
            { text },
            { quoted: message }
        )

        const m = Object.assign(message, { text, reply })
    
        if (text) {
            for (const name in global.plugins) {
                const plugin = global.plugins[name]
                if (!plugin || typeof plugin !== 'function') continue
                if (!plugin.message) continue
                try {
                    await plugin.call(conn, m, {
                        conn,
                        text
                    })
                } catch (e) {
                    console.error(`Error on message-plugin ${name}:`, e)
                }
            }
        }
        if (!text.startsWith(global.bot.prefix)) return
        const body = text.slice(global.bot.prefix.length).trim()
        if (!body) return
        const [command, ...args] = body.split(/\s+/)
        const lowerCommand = command.toLowerCase()
        const usedPrefix = global.bot.prefix
        const argText = args.join(' ')
        const isOwner = null
        const isAdmin = null
    
        for (const name in global.plugins) {
            const plugin = global.plugins[name]
            if (!plugin || typeof plugin !== 'function') continue
            if (!plugin.command) continue
    
            const isMatch = plugin.command instanceof RegExp
                ? plugin.command.test(lowerCommand)
                : Array.isArray(plugin.command)
                    ? plugin.command.some(cmd =>
                        cmd instanceof RegExp
                            ? cmd.test(lowerCommand)
                            : cmd === lowerCommand
                    )
                    : plugin.command === lowerCommand

            if (!isMatch) continue

            try {
                await plugin.call(conn, m, {
                    conn,
                    text: argText,
                    args,
                    usedPrefix,
                    command: lowerCommand
                })
            } catch (e) {
                console.error(`Error on plugin ${name}:`, e)
            }
    
        }
    
}