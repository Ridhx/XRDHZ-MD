/* XRDHZ-MD
  Script ini tidak untuk diperjual-belikan atau gratis.
  Script masih dalam tahap pengembangan mungkin akan ada bug, error dan lain sebagainya.
*/

import "./settings.js";
import path, { join } from "path";
import pino from "pino";
import ws from "ws";
import chalk from "chalk";
import platform from "process";
import lodash from "lodash";
import yargs from "yargs";
import syntaxerror from "syntax-error";
import { format } from "util";
import { fileURLToPath, pathToFileURL } from "url";

import { readdirSync, statSync, unlinkSync, existsSync, readFileSync, mkdirSync, watch } from "fs";
import { spawn } from "child_process";
import { createRequire } from "module";

import { Low, JSONFile } from "lowdb";
import { makeWASocket, protoType } from "./function/simple.js";
import { requestPairing, connectionUpdate } from "./function/connection.js";

const { Browsers, useMultiFileAuthState, fetchLatestWaWebVersion, makeCacheableSignalKeyStore } =
    await import("baileys");

protoType(); // Aktifkan protoType :D
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== "win32") {
    return rmPrefix
        ? /file:\/\/\//.test(pathURL)
            ? fileURLToPath(pathURL)
            : pathURL
        : pathToFileURL(pathURL).toString();
};
global.__require = function require(dir = import.meta.url) {
    return createRequire(dir);
};
global.__dirname = function dirname(pathURL) {
    return path.dirname(global.__filename(pathURL, true));
};
const __dirname = global.__dirname(import.meta.url);
const { state, saveCreds } = await useMultiFileAuthState("./sessions");
const { version, isLatest } = await fetchLatestWaWebVersion();

const connectionOptions = {
    version: version, // OPSIONAL
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "store" }))
    },
    generateHighQualityLinkPreview: true,
    patchMessageBeforeSending: message => {
        const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
        if (requiresPatch) {
            message = {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadataVersion: 2,
                            deviceListMetadata: {}
                        },
                        ...message
                    }
                }
            };
        }
        return message;
    },
    defaultQueryTimeoutMs: undefined,
    syncFullHistory: false,
    markOnlineOnConnect: true
};

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.conn = makeWASocket(connectionOptions, global.opts);

global.prefix = new RegExp(
    "^[" +
        (opts.prefix || "‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-").replace(/[|\\{}()[\]^$+*?.\-\^]/g, "\\$&") +
        "]"
);

// DATABASE
global.db = new Low(new JSONFile("database.json"));
global.DATABASE = global.db;
global.loadDatabase = async function loadDatabase() {
    if (global.db.READ)
        return new Promise(resolve =>
            setInterval(function () {
                !global.db.READ
                    ? (clearInterval(this),
                      resolve(global.db.data == null ? global.loadDatabase() : global.db.data))
                    : null;
            }, 1 * 1000)
        );
    if (global.db.data !== null) return;
    global.db.READ = true;
    await global.db.read();
    global.db.READ = false;
    global.db.data = {
        users: {},
        chats: {},
        settings: {},
        ...(global.db.data || {})
    };
    global.db.chain = lodash.chain(global.db.data);
};

// Simpan database setiap 30 detik.
if (global.db) {
    setInterval(async () => {
        if (global.db.data) await global.db.write();
    }, 30 * 1000);
}

const tmpFolder = join(process.cwd(), "tmp");
if (!existsSync(tmpFolder)) {
    mkdirSync(tmpFolder, { recursive: true });
}
// Auto Clear TMP Folder
if (existsSync(tmpFolder)) {
    setInterval(() => {
        if (existsSync(tmpFolder)) {
            const files = readdirSync(tmpFolder);
            const now = Date.now();
            const limit = 2 * 60 * 1000; // 2 MENIT

            for (const file of files) {
                const filePath = join(tmpFolder, file);
                try {
                    const stats = statSync(filePath);
                    if (now - stats.mtimeMs >= limit) {
                        unlinkSync(filePath);
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        }
    }, 30 * 1000);
}

// Start kode pairing Jika belum ada session
async function StartPairing() {
    if (existsSync("./sessions/creds.json") && !conn.authState.creds.registered) {
        console.log(`${chalk.white.bold(" [SISTEM]")} ${chalk.red.bold(`ERROR SESSION RUSAK`)}`);
        process.exit(1);
    }

    if (!conn.authState.creds.registered) {
        await global.reloadHandler(true);
        conn.ev.on("connection.update", async update => {
            const { connection } = update;
            if (connection === "connecting") {
                await requestPairing(global.conn);
            }
        });
    }
}

let isHandlerInit = true;
let HandlerModule = await import("./handler.js");

/**
 * Fungsi untuk restart handler.
 * @param {Boolean} restartConnection
 * @returns
 */
global.reloadHandler = async function reloadHandler(restartConnection) {
    try {
        const NewHandler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
        if (NewHandler && Object.keys(NewHandler).length) {
            HandlerModule = NewHandler;
        }
    } catch (error) {
        console.error(error);
    }

    if (restartConnection) {
        const lastChats = global.conn.chats;
        try {
            global.conn.ws.close();
        } catch (error) {
            console.error(error);
        }
        conn.ev.removeAllListeners();
        global.conn = makeWASocket(connectionOptions, { chats: lastChats });
        isHandlerInit = true;
    }

    if (!isHandlerInit) {
        conn.ev.off("message.upsert", conn.handler);
        conn.ev.off("group-participants.update", conn.participantsUpdate);
        conn.ev.off("groups.update", conn.groupsUpdate);
        conn.ev.off("message.delete", conn.onDelete);
        conn.ev.off("connection.update", conn.connectionUpdate);
        conn.ev.off("creds.update", conn.credsUpdate);
    }

    conn.sWelcome = "Selamat Datang @user";
    conn.sBye = "Selamat Tinggal @user";
    conn.sSubject = "@subject";
    conn.sDesc = "@desc";
    conn.sPromote = "Selamat @user telah menjadi Admin";
    conn.sDemote = "@user telah diberhentikan sebagai Admin";

    conn.handler = HandlerModule.handler.bind(global.conn);
    conn.participantsUpdate = HandlerModule.participantsUpdate.bind(global.conn);
    conn.groupsUpdate = HandlerModule.groupsUpdate.bind(global.conn);
    conn.onDelete = HandlerModule.catchDeleted.bind(global.conn);
    conn.connectionUpdate = async update => await connectionUpdate(update, conn);
    conn.credsUpdate = saveCreds.bind(global.conn);

    conn.ev.on("messages.upsert", conn.handler);
    conn.ev.on("group-participants.update", conn.participantsUpdate);
    conn.ev.on("groups.update", conn.groupsUpdate);
    conn.ev.on("message.delete", conn.onDelete);
    conn.ev.on("connection.update", conn.connectionUpdate);
    conn.ev.on("creds.update", conn.credsUpdate);

    isHandlerInit = false;
    return true;
};

global.features = {};
const featureFolder = global.__dirname(join(__dirname, "./features/index"));
const featureFilter = filename => /\.js$/.test(filename);
async function featuresInit() {
    for (let filename of readdirSync(featureFolder).filter(featureFilter)) {
        try {
            let files = global.__filename(join(featureFolder, filename));
            const module = await import(files);
            global.features[filename] = module.default || module;
        } catch (error) {
            console.log(`${chalk.white.bold(" [INFO]")} ${chalk.green.bold(`FITUR ERROR "${filename}"`)}`);
            console.log(error);
            delete global.features[filename];
        }
    }
}
await featuresInit();

global.reloadFeatures = async (_ev, filename) => {
    if (!featureFilter(filename)) return;

    const dir = global.__filename(join(featureFolder, filename), true);
    if (filename in global.features) {
        if (existsSync(dir)) {
            console.log(`${chalk.white.bold(" [INFO]")} ${chalk.green.bold(`FITUR DIUPDATE "${filename}"`)}`);
        } else {
            console.log(`${chalk.white.bold(" [INFO]")} ${chalk.red.bold(`FITUR DIHAPUS "${filename}"`)}`);
            return delete global.features[filename];
        }
    } else
        console.log(`${chalk.white.bold(" [INFO]")} ${chalk.blue.bold(`FITUR DITAMBAHKAN "${filename}"`)}`);

    const error = syntaxerror(readFileSync(dir), filename, {
        sourceType: "module",
        allowAwaitOutsideFunction: true
    });
    if (error) {
        console.log(`${chalk.white.bold(" [INFO]")} ${chalk.yellow.bold(`SYNTAXERROR "${filename}"`)}`);
        console.log(error);
        return;
    }

    try {
        const module = await import(`${global.__filename(dir)}?update=${Date.now()}`);
        global.features[filename] = module.default || module;
    } catch (e) {
        console.log(`${chalk.white.bold(" [INFO]")} ${chalk.green.bold(`FITUR ERROR "${filename}"`)}`);
        console.log(format(e));
    } finally {
        global.features = Object.fromEntries(
            Object.entries(global.features).sort(([a], [b]) => a.localeCompare(b))
        );
    }
};

Object.freeze(global.reloadFeatures);
await watch(featureFolder, global.reloadFeatures);
await global.reloadHandler();
await StartPairing();
