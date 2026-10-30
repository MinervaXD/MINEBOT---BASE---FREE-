let handler = async (m) => {
    m.reply("pong!")
}
handler.command = /^(ping)$/i
handler.tags = ["main"]
handler.help = ["ping"]

export default handler