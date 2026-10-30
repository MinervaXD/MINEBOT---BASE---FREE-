
let handler = async (m, { conn }) => {
    const prefix = global.bot.prefix
    const categories = {}

    for (const name in global.plugins) {
        const plugin = global.plugins[name]

        if (typeof plugin !== 'function') continue
        if (!plugin.help || !plugin.tags) continue

        const helps = Array.isArray(plugin.help)
            ? plugin.help
            : [plugin.help]

        const tags = Array.isArray(plugin.tags)
            ? plugin.tags
            : [plugin.tags]

        for (const tag of tags) {
            if (!categories[tag]) {
                categories[tag] = new Set()
            }

            for (const help of helps) {
                categories[tag].add(`${prefix}${help}`)
            }
        }
    }

    const menu = Object.entries(categories)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, commands]) => {
            const title = tag.charAt(0).toUpperCase() + tag.slice(1)
            const list = [...commands]
                .sort()
                .map(command => `- ${command}`)
                .join('\n')

            return `| *${title}*\n${list}`
        })
        .join('\n\n')

    await m.reply(
        `| *BOT MENU*\n\n${menu}`
    )
}

handler.command = /^(menu)$/i
handler.help = ['menu']
handler.tags = ['main']

export default handler