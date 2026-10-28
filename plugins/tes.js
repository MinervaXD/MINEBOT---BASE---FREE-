let handler = async (m) => {
    m.reply("pong!")
}
handler.command = "ping"
export default handler