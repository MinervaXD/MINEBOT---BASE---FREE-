import { Boom } from '@hapi/boom'
import makeWASocket, {
  delay,
  DisconnectReason,
  useMultiFileAuthState
} from 'baileys'
import pino from 'pino'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import "./config.js"
import fs from "node:fs"
import { existsSync } from 'node:fs';
import chalk from 'chalk'
import isOnline from 'is-online'
import {handler} from './handler.js'
import cfonts from 'cfonts'
import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

if (await isOnline()) {
const { say } = cfonts
const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)
const { name, author, version } = require(join(__dirname, './package.json'))

await say(`+== ${name} ==+`, {
  font: 'chrome',
  align: 'center',
  gradient: ["yellow", 'blue']
})
await say(`Version: ${version}\n\nCreator: ${author.name}\n\nGithub: ${author.github}\n\nwarn: script ini gratis, harap jangan dijual`, {
  font: 'console',
  align: 'center',
  gradient: ["yellow", 'blue']
})
await say(`+================+`, {
  font: 'chrome',
  align: 'center',
  gradient: ["yellow", 'blue']
})

const data = JSON.parse(
             fs.readFileSync('login.json', 'utf8')
          )
const folderanuitulah = 'session';
let udahbelum
if (existsSync(`./${folderanuitulah}`)) {
  udahbelum = true
} else {
  udahbelum = false
}
let apalah = data.method
let milihmilih = apalah
const nanya = createInterface({ input, output })
if (!udahbelum) {
    apalah = await nanya.question(chalk.cyan("Pilih QR atau Code (Selain itu dianggap Code): "))
    milihmilih = apalah.trim().toLocaleLowerCase() == "qr"
    if (milihmilih) {
      data.method = true
      await console.log(chalk.green("Metode: QR\n\n"))
      await say(`+== SCAN QR INI ==+`, {
      font: 'chrome',
      align: 'left',
      gradient: ["yellow", 'blue']
      })
    } else {
      data.method = false
      await console.log(chalk.green("Metode: Pairing Code\n"))
    }
  }

const gob_log = pino({ level: 'silent' })

function normalizePhoneNumber(value) {
  const number = value.replace(/\D/g, '')

  if (number.length < 8 || number.length > 15) {
    throw new Error(chalk.red('Nomor harus berisi 8 - 15 gigit :V dengan kode negara.'))
  }

  return number
}

async function askPhoneNumber() {

  try {
    const value = await nanya.question(chalk.cyan('Nomor WhatsApp dengan kode negara, contoh 628123456789: '))
    return normalizePhoneNumber(value)
  } finally {
    console.log(chalk.green("Nomor valid!\n"))
  }
}

function checkCode(str) {
  return /^[A-Za-z0-9]{8}$/.test(str);

}

async function askPairCode() {

  try {
    const iniCode = await nanya.question(chalk.cyan('Masukkan code pairing custom mu (hanya huruf atau angka, dan 8 digit): '))
    if (checkCode(iniCode)) {
    return iniCode.trim().toLocaleUpperCase()
    } else {
      await console.log(chalk.red("Code hanya boleh huruf atau angka, dan harus 8 digit!"))
      await process.exit()
    }
  } finally {
    console.log(chalk.green("Code valid!\n"))
  }
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(folderanuitulah)
  const socket = makeWASocket({
    printQRInTerminal: milihmilih,
    auth: state,
    logger: gob_log,
    markOnlineOnConnect: false
  })

  socket.ev.on('creds.update', saveCreds)

  socket.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    
    if (!socket.authState.creds.registered && !milihmilih) {
    const phoneNumber = await askPhoneNumber()
    const codeIni = await askPairCode()
    nanya.close()
    await delay(3000)
    const pairingCode = await socket.requestPairingCode(phoneNumber, codeIni)
    console.log(`${chalk.cyan('Kode pairing:')} ${chalk.green(pairingCode)}\n`)
    console.log(chalk.cyan('Buka WhatsApp > Perangkat tertaut > Tautkan perangkat > Tautkan dengan nomor telepon, lalu masukkan kode tersebut.\n'))
    }

    if (connection === 'open') {
      console.log(chalk.green('WhatsApp berhasil terhubung.'))
      fs.writeFileSync(
            './login.json',
            JSON.stringify(data, null, 4)
        )
      return
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error).output?.statusCode

      if (statusCode === DisconnectReason.loggedOut) {
        console.log(chalk.red('Si sesi keluar. Hapus folder session lalu jalankan ulang untuk memasangkan lagi.'))
        return
      }

      console.log(chalk.red('Kita putus, hmph! (tunggu 3 detik untuk mencoba reconnect).'))
      await delay(3000)
      connect().catch(error => console.error(chalk.red('Gagal balikkan (gagal reconnect):', error.message)))
    }
  })

  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue
      handler(socket, message)
    }
  })

  socket.ev.on('call', async (calls) => {
    for (const call of calls) {
        if (call.status === 'offer') {
          await socket.rejectCall(call.id, call.from);
          console.log(`Menolak panggilan dari ${call.from} atau ${call.callerPn}.`);
          await socket.sendMessage(call.from, {
          text: "Gak usah nelpon kimak!"
          })
        }
      }
    });
}

connect().catch((error) => {
  console.error('Gagal menjalankan bot:', error.message)
  process.exitCode = 1
})
} else {
  console.log(chalk.red('Perangkat anda tidak terhubung ke internet! Harap hubungkan dulu internetnya'))
  process.exit()
}
