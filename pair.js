const express = require('express');
const fs = require('fs');
const { exec } = require("child_process");
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

const router = express.Router();

// Function to remove a file or directory
function removeFile(FilePath) {
    if (fs.existsSync(FilePath)) {
        fs.rmSync(FilePath, { recursive: true, force: true });
    }
}

// Function to generate a random Mega ID
function randomMegaId(length = 6, numberLength = 4) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

// Main pairing function
async function PrabathPair(num, res) {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    try {
        const PrabathPairWeb = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: Browsers.macOS("Safari"),
        });

        if (!PrabathPairWeb.authState.creds.registered) {
            await delay(1500);
            num = num.replace(/[^0-9]/g, '');
            const code = await PrabathPairWeb.requestPairingCode(num);
            if (!res.headersSent) {
                res.send({ code });
            }
        }

        PrabathPairWeb.ev.on('creds.update', saveCreds);
        PrabathPairWeb.ev.on("connection.update", async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === "open") {
                try {
                    await delay(10000);
                    const sessionPrabath = fs.readFileSync('./session/creds.json');
                    const auth_path = './session/';
                    const user_jid = jidNormalizedUser(PrabathPairWeb.user.id);

                    const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                    const string_session = mega_url.replace('https://mega.nz/file/', '');
                    const sid = string_session;

                    await PrabathPairWeb.sendMessage(user_jid, { text: sid });
                } catch (e) {
                    exec('pm2 restart prabath');
                } finally {
                    await delay(100);
                    removeFile('./session');
                    process.exit(0);
                }
            } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                await delay(10000);
                PrabathPair(num, res);
            }
        });
    } catch (err) {
        exec('pm2 restart prabath-md');
        console.error("Service restarted due to error:", err);
        PrabathPair(num, res);
        removeFile('./session');
        if (!res.headersSent) {
            res.send({ code: "Service Unavailable" });
        }
    }
}

// Route to handle pairing requests
router.get('/', async (req, res) => {
    const num = req.query.number;
    await PrabathPair(num, res);
});

// Handle uncaught exceptions globally
process.on('uncaughtException', (err) => {
    console.error('Caught exception:', err);
    exec('pm2 restart prabath');
});

module.exports = router;
