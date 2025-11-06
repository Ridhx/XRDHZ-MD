/* XRDHZ-MD
  Script ini tidak untuk diperjual-belikan atau gratis.
  Script masih dalam tahap pengembangan mungkin akan ada bug, error dan lain sebagainya.
*/

import store from "./store.js";
import fs from "fs";
import os from "os";
import path from "path";
import util from "util";
import chalk from "chalk";
import * as Jimp from "jimp";
import fetch from "node-fetch";

import { format } from "util";
import { fileTypeFromBuffer } from "file-type";
import { parsePhoneNumber } from "awesome-phonenumber";
import { watchFile, unwatchFile } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
    default: _makeWASocket,
    proto,
    areJidsSameUser,
    downloadContentFromMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    getDevice,
    WAMessageStubType,
    extractMessageContent,
    jidDecode,
    jidNormalizedUser,
    generateMessageIDV2
} = await import("baileys");

/**
 * Fungsi membuat socket ke baileys.
 * @param {Object} connectionOptions
 * @param {Object} options
 * @returns
 */
export function makeWASocket(connectionOptions, options = {}) {
    let conn = _makeWASocket(connectionOptions);
    let sock = Object.defineProperties(conn, {
        // conn.chats
        chats: {
            value: { ...(options.chats || {}) },
            writable: true
        },
        // conn.decodeJid
        decodeJid: {
            value(jid) {
                if (!jid || typeof jid !== "string") return (jid !== null && jid) || null;
                return jid.decodeJid();
            }
        },
        // conn.getJid
        getJid: {
            value(sender) {
                if (!conn.storeLid) conn.storeLid = {};
                if (!sender || typeof sender !== "string") return "";
                if (!sender.endsWith("@lid") && sender.endsWith("@s.whatsapp.net")) return sender.decodeJid();
                if (conn.storeLid[sender]) return conn.storeLid[sender];
                for (let chat of Object.values(conn.chats)) {
                    if (!chat.metadata?.participants) continue;
                    let user = chat.metadata.participants.find(p => p.id === sender || p.lid === sender);
                    if (user) {
                        return (conn.storeLid[sender] = (
                            user?.phoneNumber ||
                            user?.jid ||
                            user?.id
                        ).decodeJid());
                    }
                }
                return sender;
            }
        },
        // conn.pushMessage
        pushMessage: {
            async value(m) {
                if (!m) return;
                if (!Array.isArray(m)) m = [m];
                for (const message of m) {
                    try {
                        if (!message) continue;
                        if (
                            message.messageStubType &&
                            message.messageStubType != WAMessageStubType.CIPHERTEXT
                        )
                            conn.processMessageStubType(message).catch(console.error);
                        const _mtype = Object.keys(message.message || {});
                        const mtype =
                            (!["senderKeyDistributionMessage", "messageContextInfo"].includes(_mtype[0]) &&
                                _mtype[0]) ||
                            (_mtype.length >= 3 && _mtype[1] !== "messageContextInfo" && _mtype[1]) ||
                            _mtype[_mtype.length - 1];
                        const chat = conn.decodeJid(
                            message.key.remoteJid ||
                                message.message?.senderKeyDistributionMessage?.groupId ||
                                ""
                        );
                        if (message.message?.[mtype]?.contextInfo?.quotedMessage) {
                            /**
                             * @type {import("baileys").proto.IContextInfo}
                             */
                            let context = message.message[mtype].contextInfo;
                            let participant = conn.decodeJid(context.participant);
                            const remoteJid = conn.decodeJid(context.remoteJid || participant);
                            /**
                             * @type {import("baileys").proto.IMessage}
                             */
                            let quoted = message.message[mtype].contextInfo.quotedMessage;
                            if (remoteJid && remoteJid !== "status@broadcast" && quoted) {
                                let qMtype = Object.keys(quoted)[0];
                                if (qMtype == "conversation") {
                                    quoted.extendedTextMessage = { text: quoted[qMtype] };
                                    delete quoted.conversation;
                                    qMtype = "extendedTextMessage";
                                }
                                if (!quoted[qMtype].contextInfo) quoted[qMtype].contextInfo = {};
                                quoted[qMtype].contextInfo.mentionedJid =
                                    context.mentionedJid || quoted[qMtype].contextInfo.mentionedJid || [];
                                const isGroup = remoteJid.endsWith("g.us");
                                if (isGroup && !participant) participant = remoteJid;
                                const qM = {
                                    key: {
                                        remoteJid,
                                        fromMe: areJidsSameUser(conn.user.jid, remoteJid),
                                        id: context.stanzaId,
                                        participant
                                    },
                                    message: JSON.parse(JSON.stringify(quoted)),
                                    ...(isGroup ? { participant } : {})
                                };
                                let qChats = conn.chats[participant];
                                if (!qChats)
                                    qChats = conn.chats[participant] = {
                                        id: participant,
                                        isChats: !isGroup
                                    };
                                if (!qChats.messages) qChats.messages = {};
                                if (!qChats.messages[context.stanzaId] && !qM.key.fromMe)
                                    qChats.messages[context.stanzaId] = qM;
                                let qChatsMessages;
                                if ((qChatsMessages = Object.entries(qChats.messages)).length > 40)
                                    qChats.messages = Object.fromEntries(
                                        qChatsMessages.slice(30, qChatsMessages.length)
                                    );
                            }
                        }
                        if (!chat || chat === "status@broadcast") continue;
                        const isGroup = chat.endsWith("@g.us");
                        let chats = conn.chats[chat];
                        if (!chats) {
                            if (isGroup) await conn.insertAllGroup().catch(console.error);
                            chats = conn.chats[chat] = {
                                id: chat,
                                isChats: true,
                                ...(conn.chats[chat] || {})
                            };
                        }
                        let metadata, sender;
                        if (isGroup) {
                            if (!chats.subject || !chats.metadata) {
                                metadata = (await conn.groupMetadata(chat).catch(_ => ({}))) || {};
                                if (!chats.subject) chats.subject = metadata.subject || "";
                                if (!chats.metadata) chats.metadata = metadata;
                            }
                            sender = conn.decodeJid(
                                (message.key?.fromMe && conn.user.id) ||
                                    message.participant ||
                                    message.key?.participant ||
                                    chat ||
                                    ""
                            );
                            if (sender !== chat) {
                                let chats = conn.chats[sender];
                                if (!chats) chats = conn.chats[sender] = { id: sender };
                                if (!chats.name) chats.name = message.pushName || chats.name || "";
                            }
                        } else if (!chats.name) chats.name = message.pushName || chats.name || "";
                        if (["senderKeyDistributionMessage", "messageContextInfo"].includes(mtype)) continue;
                        chats.isChats = true;
                        if (!chats.messages) chats.messages = {};
                        const fromMe = message.key.fromMe || areJidsSameUser(sender || chat, conn.user.id);
                        if (
                            !["protocolMessage"].includes(mtype) &&
                            !fromMe &&
                            message.messageStubType != WAMessageStubType.CIPHERTEXT &&
                            message.message
                        ) {
                            delete message.message.messageContextInfo;
                            delete message.message.senderKeyDistributionMessage;
                            chats.messages[message.key.id] = JSON.parse(JSON.stringify(message, null, 2));
                            let chatsMessages;
                            if ((chatsMessages = Object.entries(chats.messages)).length > 40)
                                chats.messages = Object.fromEntries(
                                    chatsMessages.slice(30, chatsMessages.length)
                                );
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        },
        // conn.getFile
        getFile: {
            /**
             * Menggambil file dalam bentuk buffer
             * @param {fs.PathLike | Buffer | String} PATH
             * @param {Boolean} saveToFile
             * @returns {promise<Object>}
             */
            async value(PATH, saveToFile = false) {
                let res, filename;
                const data = Buffer.isBuffer(PATH)
                    ? PATH
                    : PATH instanceof ArrayBuffer
                    ? PATH.toBuffer()
                    : /^data:.*?\/.*?;base64,/i.test(PATH)
                    ? Buffer.from(PATH.split`,`[1], "base64")
                    : /^https?:\/\//.test(PATH)
                    ? await (res = await fetch(PATH)).buffer()
                    : fs.existsSync(PATH)
                    ? ((filename = PATH), fs.readFileSync(PATH))
                    : typeof PATH === "string"
                    ? PATH
                    : Buffer.alloc(0);
                if (!Buffer.isBuffer(data)) throw new TypeError("Result is not a buffer");
                const type = (await fileTypeFromBuffer(data)) || {
                    mime: "application/octet-stream",
                    ext: ".bin"
                };
                if (data && saveToFile && !filename)
                    (filename = path.join(__dirname, "../tmp/" + new Date() * 1 + "." + type.ext)),
                        await fs.promises.writeFile(filename, data);
                return {
                    res,
                    filename,
                    ...type,
                    data,
                    deleteFile() {
                        return filename && fs.promises.unlink(filename);
                    }
                };
            },
            enumerable: true
        },
        // conn.waitEvent
        waitEvent: {
            /**
             * waitEvent ??
             * @param {String} eventName
             * @param {Boolean} is
             * @param {Number} maxTries
             */
            value(eventName, is = () => true, maxTries = 25) {
                return new Promise((resolve, reject) => {
                    let tries = 0;
                    let on = (...args) => {
                        if (++tries > maxTries) reject("Max tries reached");
                        else if (is()) {
                            conn.ev.off(eventName, on);
                            resolve(...args);
                        }
                    };
                    conn.ev.on(eventName, on);
                });
            }
        },
        // conn.sendFile
        sendFile: {
            /**
             * Kirim Media/File dengan tipe yang sesuai otomatis.
             * @param {String} jid
             * @param {String|Buffer} path
             * @param {String} filename
             * @param {String} caption
             * @param {import("baileys").proto.WebMessageInfo} quoted
             * @param {Boolean} ptt
             * @param {Object} options
             */
            async value(jid, path, filename = "", caption = "", quoted, ptt = false, options = {}) {
                let type = await conn.getFile(path, true);
                let { res, data: file, filename: pathFile } = type;
                if ((res && res.status !== 200) || file.length <= 65536) {
                    try {
                        throw { json: JSON.parse(file.toString()) };
                    } catch (e) {
                        if (e.json) throw e.json;
                    }
                }
                let opt = { filename };
                if (quoted) opt.quoted = quoted;
                if (!type) options.asDocument = true;
                let mtype = "",
                    mimetype = options.mimetype || type.mime,
                    convert;
                if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker))
                    mtype = "sticker";
                else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage))
                    mtype = "image";
                else if (/video/.test(type.mime)) mtype = "video";
                else if (/audio/.test(type.mime))
                    (convert = await toAudio(file, type.ext)),
                        (file = convert.data),
                        (pathFile = convert.filename),
                        (mtype = "audio"),
                        (mimetype = options.mimetype || "audio/ogg; codecs=opus");
                else mtype = "document";
                if (options.asDocument) mtype = "document";

                delete options.asSticker;
                delete options.asLocation;
                delete options.asVideo;
                delete options.asDocument;
                delete options.asImage;

                let message = {
                    ...options,
                    caption,
                    ptt,
                    [mtype]: { url: pathFile },
                    mimetype,
                    fileName: filename || pathFile.split("/").pop()
                };
                /**
                 * @type {import("baileys").proto.WebMessageInfo}
                 */
                let m;
                try {
                    m = await conn.sendMessage(jid, message, { ...opt, ...options });
                } catch (e) {
                    console.error(e);
                    m = null;
                } finally {
                    if (!m)
                        m = await conn.sendMessage(
                            jid,
                            { ...message, [mtype]: file },
                            { ...opt, ...options }
                        );
                    file = null; // kosongkan memory :v
                    return m;
                }
            },
            enumerable: true
        },
        // conn.reply
        reply: {
            /**
             * Balas pesan atau quoted message
             * @param {String} jid
             * @param {String|Buffer} text
             * @param {import("baileys").proto.WebMessageInfo} quoted
             * @param {Object} options
             */
            async value(jid, text = "", quoted, options) {
                return Buffer.isBuffer(text)
                    ? conn.sendFile(jid, text, "file", "", quoted, false, options)
                    : conn.sendMessage(
                          jid,
                          {
                              ...options,
                              text,
                              contextInfo: {
                                  mentionedJid: conn.parseMention(text)
                              },
                              ...options
                          },
                          {
                              quoted,
                              ...options
                          }
                      );
            }
        },
        // conn.sendPoll
        sendPoll: {
            async value(jid, name = "", optiPoll, options) {
                if (!Array.isArray(optiPoll[0]) && typeof optiPoll[0] === "string") optiPoll = [optiPoll];
                if (!options) options = {};
                const pollMessage = {
                    name: name,
                    options: optiPoll.map(btn => ({
                        optionName: (btn[0] !== null && btn[0]) || ""
                    })),
                    selectableOptionsCount: 1
                };
                return conn.relayMessage(jid, { pollCreationMessage: pollMessage }, { ...options });
            }
        },
        // conn.downloadAndSaveMediaMessage
        downloadAndSaveMediaMessage: {
            async value(message, filename, attachExtension = true) {
                let quoted = message.msg ? message.msg : message;
                let mime = (message.msg || message).mimetype || "";
                let messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
                const stream = await downloadContentFromMessage(quoted, messageType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                let type = await FileType.fromBuffer(buffer);
                trueFileName = attachExtension ? filename + "." + type.ext : filename;
                // save to file
                await fs.writeFileSync(trueFileName, buffer);
                return trueFileName;
            }
        },
        // conn.msToDate
        msToDate: {
            async value(ms) {
                let days = Math.floor(ms / (24 * 60 * 60 * 1000));
                let daysms = ms % (24 * 60 * 60 * 1000);
                let hours = Math.floor(daysms / (60 * 60 * 1000));
                let hoursms = ms % (60 * 60 * 1000);
                let minutes = Math.floor(hoursms / (60 * 1000));
                let minutesms = ms % (60 * 1000);
                let sec = Math.floor(minutesms / 1000);
                return days + " Hari " + hours + " Jam " + minutes + " Menit";
                // +minutes+":"+sec;
            }
        },
        // conn.delay
        delay: {
            async value(ms) {
                return new Promise((resolve, reject) => setTimeout(resolve, ms));
            }
        },
        // conn.cMod
        cMod: {
            /**
             * cMod
             * @param {String} jid
             * @param {import("baileys").proto.WebMessageInfo} message
             * @param {String} text
             * @param {String} sender
             * @param {*} options
             * @returns
             */
            value(jid, message, text = "", sender = conn.user.jid, options = {}) {
                if (options.mentions && !Array.isArray(options.mentions))
                    options.mentions = [options.mentions];
                let copy = message.toJSON();
                delete copy.message.messageContextInfo;
                delete copy.message.senderKeyDistributionMessage;
                let mtype = Object.keys(copy.message)[0];
                let msg = copy.message;
                let content = msg[mtype];
                if (typeof content === "string") msg[mtype] = text || content;
                else if (content.caption) content.caption = text || content.caption;
                else if (content.text) content.text = text || content.text;
                if (typeof content !== "string") {
                    msg[mtype] = { ...content, ...options };
                    msg[mtype].contextInfo = {
                        ...(content.contextInfo || {}),
                        mentionedJid: options.mentions || content.contextInfo?.mentionedJid || []
                    };
                }
                if (copy.participant) sender = copy.participant = sender || copy.participant;
                else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
                if (copy.key.remoteJid.includes("@s.whatsapp.net")) sender = sender || copy.key.remoteJid;
                else if (copy.key.remoteJid.includes("@broadcast")) sender = sender || copy.key.remoteJid;
                copy.key.remoteJid = jid;
                copy.key.fromMe = areJidsSameUser(sender, conn.user.id) || false;
                return proto.WebMessageInfo.create(copy);
            },
            enumerable: true
        },
        // conn.copyNForward
        copyNForward: {
            /**
             * Copy dan Forward
             * @param {String} jid
             * @param {import("baileys").proto.WebMessageInfo} message
             * @param {Boolean|Number} forwardingScore
             * @param {Object} options
             */
            async value(jid, message, forwardingScore = true, options = {}) {
                let vtype;
                if (options.readViewOnce && message.message.viewOnceMessage?.message) {
                    vtype = Object.keys(message.message.viewOnceMessage.message)[0];
                    delete message.message.viewOnceMessage.message[vtype].viewOnce;
                    message.message = proto.Message.create(
                        JSON.parse(JSON.stringify(message.message.viewOnceMessage.message))
                    );
                    message.message[vtype].contextInfo = message.message.viewOnceMessage.contextInfo;
                }
                let mtype = Object.keys(message.message)[0];
                let m = generateForwardMessageContent(message, !!forwardingScore);
                let ctype = Object.keys(m)[0];
                if (forwardingScore && typeof forwardingScore === "number" && forwardingScore > 1)
                    m[ctype].contextInfo.forwardingScore += forwardingScore;
                m[ctype].contextInfo = {
                    ...(message.message[mtype].contextInfo || {}),
                    ...(m[ctype].contextInfo || {})
                };
                m = generateWAMessageFromContent(jid, m, {
                    ...options,
                    userJid: conn.user.jid
                });
                await conn.relayMessage(jid, m.message, {
                    messageId: m.key.id,
                    additionalAttributes: { ...options }
                });
                return m;
            },
            enumerable: true
        },
        // conn.fakeReply
        fakeReply: {
            /**
             * Pesan fake
             * @param {String} jid
             * @param {String|Object} text
             * @param {String} fakeJid
             * @param {String} fakeText
             * @param {String} fakeGroupJid
             * @param {String} options
             */
            value(jid, text = "", fakeJid = this.user.jid, fakeText = "", fakeGroupJid, options) {
                return conn.reply(jid, text, {
                    key: {
                        fromMe: areJidsSameUser(fakeJid, conn.user.id),
                        participant: fakeJid,
                        ...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {})
                    },
                    message: { conversation: fakeText },
                    ...options
                });
            }
        },
        // conn.downloadM
        downloadM: {
            /**
             * Download media message
             * @param {Object} m
             * @param {String} type
             * @param {fs.PathLike | fs.promises.FileHandle} saveToFile
             * @returns {Promise<fs.PathLike | fs.promises.FileHandle | Buffer>}
             */
            async value(m, type, saveToFile) {
                let filename;
                if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
                const stream = await downloadContentFromMessage(m, type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                if (saveToFile) ({ filename } = await conn.getFile(buffer, true));
                return saveToFile && fs.existsSync(filename) ? filename : buffer;
            },
            enumerable: true
        },
        // conn.parseMention
        parseMention: {
            /**
             * Parse string menjadi mentionedJid(s) untuk nomor telepon, @lid, atau ID lainnya
             * @param {String} text
             * @returns {Array<String>}
             */
            value(text = "") {
                const regex = /@?(\d{5,20})(?:@s\.whatsapp\.net)?/g;
                const mentions = [];
                let match;

                while ((match = regex.exec(text)) !== null) {
                    const raw = match[1];
                    const pn = parsePhoneNumber(`+${raw}`);

                    if (pn.valid) {
                        mentions.push(`${raw}@s.whatsapp.net`);
                    } else if (raw.length >= 13 && !raw.startsWith("1203")) {
                        mentions.push(conn.getJid(`${raw}@lid`));
                    }
                }

                return [...new Set(mentions)];
            },
            enumerable: true
        },
        // conn.saveName
        saveName: {
            async value(id, name = "") {
                if (!id) return;
                id = conn.decodeJid(id);
                let isGroup = id.endsWith("@g.us");
                if (
                    id in conn.contacts &&
                    conn.contacts[id][isGroup ? "subject" : "name"] &&
                    id in conn.chats
                )
                    return;
                let metadata = {};
                if (isGroup) metadata = await conn.groupMetadata(id);
                let chat = {
                    ...(conn.contacts[id] || {}),
                    id,
                    ...(isGroup ? { subject: metadata.subject, desc: metadata.desc } : { name })
                };
                conn.contacts[id] = chat;
                conn.chats[id] = chat;
            }
        },
        // conn.getName
        getName: {
            /**
             * Ambil nama dari jid
             * @param {String} rawjid
             * @param {Boolean} withoutContact
             */
            async value(rawjid = "", withoutContact = false) {
                if (!rawjid) return "";
                let jid = await conn.decodeJid(rawjid);
                withoutContact = conn.withoutContact || withoutContact;
                let v;

                if (jid.endsWith("@g.us")) {
                    return new Promise(async resolve => {
                        v = conn.chats[jid] || {};
                        if (!(v.name || v.subject)) v = (await conn.groupMetadata(jid)) || {};
                        resolve(
                            v.name ||
                                v.subject ||
                                parsePhoneNumber("+" + jid.replace("@s.whatsapp.net", ""))?.number
                                    ?.international
                        );
                    });
                } else {
                    v =
                        jid === "0@s.whatsapp.net"
                            ? {
                                  jid,
                                  vname: "WhatsApp"
                              }
                            : areJidsSameUser(jid, conn.user.id)
                            ? conn.user
                            : conn.chats[jid] || {};

                    let name =
                        (withoutContact ? "" : v.name) || v.subject || v.vname || v.notify || v.verifiedName;

                    if (!name && jid.endsWith("@s.whatsapp.net")) {
                        try {
                            const lidJid = await conn.signalRepository.lidMapping.getLIDForPN(jid);

                            if (lidJid && lidJid !== jid) {
                                const lidV = conn.chats[lidJid] || {};

                                const lidName =
                                    (withoutContact ? "" : lidV.name) ||
                                    lidV.subject ||
                                    lidV.vname ||
                                    lidV.notify ||
                                    lidV.verifiedName;

                                if (lidName) {
                                    name = lidName;
                                }
                            }
                        } catch (e) {
                            // console.warn(`Failed to get LID for ${jid}:`, e); // Opsional untuk debug
                        }
                    }

                    return (
                        name ||
                        parsePhoneNumber("+" + jid.replace("@s.whatsapp.net", ""))?.number?.international
                    );
                }
            },
            enumerable: true
        },
        // conn.loadMessage
        loadMessage: {
            /**
             * proses pesan
             * @param {String} messageID
             * @returns {import("baileys").proto.WebMessageInfo}
             */
            value(messageID) {
                return Object.entries(conn.chats)
                    .filter(([_, { messages }]) => typeof messages === "object")
                    .find(([_, { messages }]) =>
                        Object.entries(messages).find(([k, v]) => k === messageID || v.key?.id === messageID)
                    )?.[1].messages?.[messageID];
            },
            enumerable: true
        },
        // conn.processMessageStubType
        processMessageStubType: {
            /**
             * Untuk proses MessageStubType
             * @param {import("baileys").proto.WebMessageInfo} m
             */
            async value(m) {
                if (!m.messageStubType) return;
                const chat = conn.decodeJid(
                    m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || ""
                );
                if (!chat || chat === "status@broadcast") return;
                const emitGroupUpdate = update => {
                    conn.ev.emit("groups.update", [{ id: chat, ...update }]);
                };
                switch (m.messageStubType) {
                    case WAMessageStubType.REVOKE:
                    case WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
                        emitGroupUpdate({ revoke: m.messageStubParameters[0] });
                        break;
                    case WAMessageStubType.GROUP_CHANGE_ICON:
                        emitGroupUpdate({ icon: m.messageStubParameters[0] });
                        break;
                    default: {
                        /*  console.log({
                            messageStubType: m.messageStubType,
                            messageStubParameters: m.messageStubParameters,
                            type: WAMessageStubType[m.messageStubType]
                        });
                        */
                        break;
                    }
                }
                const isGroup = chat.endsWith("@g.us");
                if (!isGroup) return;
                let chats = conn.chats[chat];
                if (!chats) chats = conn.chats[chat] = { id: chat };
                chats.isChats = true;
                const metadata = await conn.groupMetadata(chat).catch(_ => null);
                if (!metadata) return;
                chats.subject = metadata.subject;
                chats.metadata = metadata;
            }
        },
        // conn.relayWAMessage
        relayWAMessage: {
            async value(fullMessage) {
                if (fullMessage.message.audioMessage) {
                    await conn.sendPresenceUpdate("recording", fullMessage.key.remoteJid);
                } else {
                    await conn.sendPresenceUpdate("composing", fullMessage.key.remoteJid);
                }
                var skirim = await conn.relayMessage(fullMessage.key.remoteJid, fullMessage.message, {
                    messageId: fullMessage.key.id
                });
                conn.ev.emit("messages.upsert", { messages: [fullMessage], type: "append" });
                return skirim;
            }
        },
        // conn.insertAllGroup
        insertAllGroup: {
            async value() {
                const groups = (await conn.groupFetchAllParticipating().catch(_ => null)) || {};
                for (const group in groups)
                    conn.chats[group] = {
                        ...(conn.chats[group] || {}),
                        id: group,
                        subject: groups[group].subject,
                        isChats: true,
                        metadata: groups[group]
                    };
                return conn.chats;
            }
        },
        // conn.serializeM
        serializeM: {
            /**
             * Serialize pesan jadi biar mudah diubah atau dimanipulasi.
             * @param {import("baileys").proto.WebMessageInfo} m
             */
            value(m) {
                return smsg(conn, m);
            }
        },
        // conn.updateProfilePicture
        updateProfilePicture: {
            async value(jid, content) {
                const { img } = await generateProfilePicture(content);
                return conn.query({
                    tag: "iq",
                    attrs: { to: jidNormalizedUser(jid), type: "set", xmlns: "w:profile:picture" },
                    content: [{ tag: "picture", attrs: { type: "image" }, content: img }]
                });
            },
            enumerable: true
        },
        ...(typeof conn.chatRead !== "function"
            ? {
                  chatRead: {
                      /**
                       * Tandai sudah dibaca pesan masuk
                       * @param {String} jid
                       * @param {String|undefined|null} participant
                       * @param {String} messageID
                       */
                      value(jid, participant = conn.user.jid, messageID) {
                          return conn.sendReadReceipt(jid, participant, [messageID]);
                      },
                      enumerable: true
                  }
              }
            : {}),
        ...(typeof conn.setStatus !== "function"
            ? {
                  setStatus: {
                      /**
                       * set status bot
                       * @param {String} status
                       */
                      value(status) {
                          return conn.query({
                              tag: "iq",
                              attrs: {
                                  to: S_WHATSAPP_NET,
                                  type: "set",
                                  xmlns: "status"
                              },
                              content: [
                                  {
                                      tag: "status",
                                      attrs: {},
                                      content: Buffer.from(status, "utf-8")
                                  }
                              ]
                          });
                      },
                      enumerable: true
                  }
              }
            : {})
    });

    if (sock.user?.id) sock.user.jid = sock.decodeJid(sock.user.id);
    store.bind(sock);
    return sock;
}

/**
 * Fungsi untuk serialize pesan.
 * @param {ReturnType<typeof makeWASocket>} conn
 * @param {import("baileys").proto.WebMessageInfo} m
 * @param {Boolean} hasParent
 * @returns
 */
export async function smsg(conn, m, hasParent) {
    if (!m) return;
    m = proto.WebMessageInfo.create(m);
    const messageId = generateMessageIDV2().slice(0, 4);
    const MediaType = [
        "audioMessage",
        "bcallMessage",
        "botInvokeMessage",
        "buttonsMessage",
        "buttonsResponseMessage",
        "contactMessage",
        "conversation",
        "contactsArrayMessage",
        "documentMessage",
        "documentWithCaptionMessage",
        "editedMessage",
        "ephemeralMessage",
        "extendedTextMessage",
        "groupInviteMessage",
        "groupMentionedMessage",
        "imageMessage",
        "interactiveMessage",
        "interactiveResponseMessage",
        "invoiceMessage",
        "listMessage",
        "listResponseMessage",
        "liveLocationMessage",
        "locationMessage",
        "lottieStickerMessage",
        "messageHistoryBundle",
        "newsletterAdminInviteMessage",
        "orderMessage",
        "pollCreationMessage",
        "pollCreationMessageV2",
        "pollCreationMessageV3",
        "pollUpdateMessage",
        "productMessage",
        "protocolMessage",
        "ptvMessage",
        "reactionMessage",
        "requestPaymentMessage",
        "scheduledCallCreationMessage",
        "scheduledCallEditMessage",
        "sendPaymentMessage",
        "senderKeyDistributionMessage",
        "stickerMessage",
        "templateButtonReplyMessage",
        "templateMessage",
        "videoMessage",
        "viewOnceMessage",
        "viewOnceMessageV2",
        "viewOnceMessageV2Extension"
    ];

    return Object.defineProperties(m, {
        id: {
            get() {
                return m.key.id;
            }
        },
        isBaileys: {
            get() {
                return (m.id?.startsWith(messageId) && m.id?.length === 22) || false;
            }
        },
        chat: {
            get() {
                const senderKeyDistributionMessage = m.message?.senderKeyDistributionMessage?.groupId;
                return (
                    m.key?.remoteJid ||
                    (senderKeyDistributionMessage && senderKeyDistributionMessage !== "status@broadcast") ||
                    ""
                ).decodeJid();
            },
            enumerable: true
        },
        isGroup: {
            get() {
                return m.chat.endsWith("@g.us") ? true : false;
            },
            enumerable: true
        },
        sender: {
            get() {
                // Ambil jika participant jid saja (Uji Coba)
                const participant = m.key.participant;
                const participantAlt = m.key.participantAlt;
                const remoteJid = m.key.remoteJid;
                const remoteJidAlt = m.key.remoteJidAlt;
                return conn?.getJid(participant || participantAlt || remoteJid || remoteJidAlt);
            },
            enumerable: true
        },
        fromMe: {
            get() {
                return m.key?.fromMe || areJidsSameUser(conn?.user.id, m.sender) || false;
            },
            enumerable: true
        },
        mtype: {
            get() {
                if (!m.message) return "";
                const type = Object.keys(m.message);
                return (
                    (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) && type[0]) ||
                    (type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) ||
                    type[type.length - 1]
                );
            },
            enumerable: true
        },
        msg: {
            get() {
                if (!m.message) return null;
                return m.message[m.mtype];
            }
        },
        mediaMessage: {
            get() {
                if (!m.message) return null;
                const Message =
                    (m.msg?.url || m.msg?.directPath
                        ? {
                              ...m.message
                          }
                        : extractMessageContent(m.message)) || null;
                if (!Message) return null;
                const mtype = Object.keys(Message)[0];
                return MediaType.includes(mtype) ? Message : null;
            },
            enumerable: true
        },
        messages: {
            get() {
                return m.message ? m.message : null;
            },
            enumerable: true
        },
        mediaType: {
            get() {
                let message;
                if (!(message = m.mediaMessage)) return null;
                return Object.keys(message)[0];
            },
            enumerable: true
        },
        _text: {
            value: null,
            writable: true
        },
        text: {
            get() {
                const msg = m.msg;
                const text =
                    (typeof msg === "string" ? msg : msg?.text) || msg?.caption || msg?.contentText || "";
                return typeof m._text === "string"
                    ? m._text
                    : "" ||
                          (typeof text === "string"
                              ? text
                              : text?.selectedDisplayText ||
                                text?.hydratedTemplate?.hydratedContentText ||
                                text) ||
                          "";
            },
            set(str) {
                return (m._text = str);
            },
            enumerable: true
        },
        mentionedJid: {
            get() {
                let raw = m.msg?.contextInfo?.mentionedJid || [];
                let raws = raw.length > 0 ? raw : m.text ? conn.parseMention(m.text) : [];
                return raws.map(Jid => conn.getJid(Jid));
            },
            enumerable: true
        },
        name: {
            get() {
                return (m.pushName !== null && m.pushName) || conn?.getName(m.sender);
            },
            enumerable: true
        },
        quoted: {
            get() {
                const msg = this.msg;
                const contextInfo = msg?.contextInfo;
                const quoted = contextInfo?.quotedMessage;
                if (!msg || !contextInfo || !quoted) return null;
                const type = Object.keys(quoted)[0];
                let q = quoted[type];
                const text = typeof q === "string" ? q : q.text;
                return Object.defineProperties(
                    JSON.parse(
                        JSON.stringify(
                            typeof q === "string"
                                ? {
                                      text: q
                                  }
                                : q
                        )
                    ),
                    {
                        mtype: {
                            get() {
                                return type;
                            },
                            enumerable: true
                        },
                        mediaMessage: {
                            get() {
                                const Message =
                                    (q.url || q.directPath
                                        ? {
                                              ...quoted
                                          }
                                        : extractMessageContent(quoted)) || null;
                                if (!Message) return null;
                                const mtype = Object.keys(Message)[0];
                                return MediaType.includes(mtype) ? Message : null;
                            },
                            enumerable: true
                        },
                        messages: {
                            get() {
                                return quoted ? quoted : null;
                            },
                            enumerable: true
                        },
                        mediaType: {
                            get() {
                                let message;
                                if (!(message = this.mediaMessage)) return null;
                                return Object.keys(message)[0];
                            },
                            enumerable: true
                        },
                        id: {
                            get() {
                                return contextInfo.stanzaId;
                            },
                            enumerable: true
                        },
                        chat: {
                            get() {
                                return contextInfo.remoteJid || this.chat;
                            },
                            enumerable: true
                        },
                        isBaileys: {
                            get() {
                                return (this.id?.startsWith(messageId) && this.id.length === 22) || false;
                            },
                            enumerable: true
                        },
                        isGroup: {
                            get() {
                                return this.chat.endsWith("@g.us") ? true : false;
                            },
                            enumerable: true
                        },
                        sender: {
                            get() {
                                // Ambil jika participant jid saja (Uji Coba)
                                const rawJid = contextInfo.participant || "";
                                return conn?.getJid(rawJid);
                            },
                            enumerable: true
                        },
                        fromMe: {
                            get() {
                                return areJidsSameUser(this.sender, conn?.user.jid);
                            },
                            enumerable: true
                        },
                        text: {
                            get() {
                                return (
                                    text || this.caption || this.contentText || this.selectedDisplayText || ""
                                );
                            },
                            enumerable: true
                        },
                        mentionedJid: {
                            get() {
                                let raw = conn?.storeMentions[this.id] || [];
                                let raws =
                                    raw.length > 0 ? raw : this.text ? conn.parseMention(this.text) : [];
                                return raws.map(Jid => conn.getJid(Jid));
                            },
                            enumerable: true
                        },
                        name: {
                            get() {
                                const sender = this.sender;
                                return sender ? conn?.getName(sender) : null;
                            },
                            enumerable: true
                        },
                        vM: {
                            get() {
                                return proto.WebMessageInfo.create({
                                    key: {
                                        fromMe: this.fromMe,
                                        remoteJid: this.chat,
                                        id: this.id
                                    },
                                    message: quoted,
                                    ...(m.isGroup
                                        ? {
                                              participant: this.sender
                                          }
                                        : {})
                                });
                            }
                        },
                        fakeObj: {
                            get() {
                                return this.vM;
                            }
                        },
                        getQuotedObj: {
                            value() {
                                if (!this.id) return null;
                                const q = proto.WebMessageInfo.create(conn?.loadMessage(this.id) || this.vM);
                                return smsg(conn, q);
                            },
                            enumerable: true
                        },
                        getQuotedMessage: {
                            get() {
                                return this.getQuotedObj;
                            }
                        },
                        download: {
                            value(saveToFile = false) {
                                const mtype = this.mediaType;
                                return conn?.downloadM(
                                    this.mediaMessage[mtype],
                                    mtype.replace(/message/i, ""),
                                    saveToFile
                                );
                            },
                            enumerable: true,
                            configurable: true
                        },
                        reply: {
                            /**
                             * Balas ke pesan quoted
                             * @param {String|Object} text
                             * @param {String|false} chatId
                             * @param {Object} options
                             */
                            value(text, chatId, options) {
                                return conn?.reply(chatId ? chatId : this.chat, text, this.vM, options);
                            },
                            enumerable: true
                        }
                    }
                );
            },
            enumerable: true
        },
        download: {
            value(saveToFile = false) {
                const mtype = m.mediaType;
                return conn?.downloadM(m.mediaMessage[mtype], mtype.replace(/message/i, ""), saveToFile);
            },
            enumerable: true,
            configurable: true
        },
        reply: {
            value(text, chatId, options) {
                return conn.reply(chatId ? chatId : this.chat, text, this, options);
            }
        }
    });
}

export function protoType() {
    Buffer.prototype.toArrayBuffer = function toArrayBufferV2() {
        const ab = new ArrayBuffer(this.length);
        const view = new Uint8Array(ab);
        for (let i = 0; i < this.length; ++i) {
            view[i] = this[i];
        }
        return ab;
    };

    Buffer.prototype.toArrayBufferV2 = function toArrayBuffer() {
        return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength);
    };

    ArrayBuffer.prototype.toBuffer = function toBuffer() {
        return Buffer.from(new Uint8Array(this));
    };

    Uint8Array.prototype.getFileType =
        ArrayBuffer.prototype.getFileType =
        Buffer.prototype.getFileType =
            async function getFileType() {
                return await fileTypeFromBuffer(this);
            };

    String.prototype.isNumber = Number.prototype.isNumber = isNumber;

    String.prototype.capitalize = function capitalize() {
        return this.charAt(0).toUpperCase() + this.slice(1, this.length);
    };

    String.prototype.capitalizeV2 = function capitalizeV2() {
        const str = this.split(" ");
        return str.map(v => v.capitalize()).join(" ");
    };

    Number.prototype.toTimeString = function toTimeString() {
        // const milliseconds = this % 1000
        const seconds = Math.floor((this / 1000) % 60);
        const minutes = Math.floor((this / (60 * 1000)) % 60);
        const hours = Math.floor((this / (60 * 60 * 1000)) % 24);
        const days = Math.floor(this / (24 * 60 * 60 * 1000));
        return (
            (days ? `${days} day(s) ` : "") +
            (hours ? `${hours} hour(s) ` : "") +
            (minutes ? `${minutes} minute(s) ` : "") +
            (seconds ? `${seconds} second(s)` : "")
        ).trim();
    };
    Number.prototype.getRandom = String.prototype.getRandom = Array.prototype.getRandom = getRandom;

    String.prototype.decodeJid = function decodeJid() {
        if (/:\d+@/gi.test(this)) {
            const decode = jidDecode(this) || {};
            return ((decode.user && decode.server && decode.user + "@" + decode.server) || this).trim();
        } else return this.trim();
    };
}

function isNumber() {
    const int = parseInt(this);
    return typeof int === "number" && !isNaN(int);
}

function getRandom() {
    if (Array.isArray(this) || this instanceof String) return this[Math.floor(Math.random() * this.length)];
    return Math.floor(Math.random() * this);
}

async function generateProfilePicture(mediaUpload) {
    let bufferOrFilePath;
    if (Buffer.isBuffer(mediaUpload)) bufferOrFilePath = mediaUpload;
    else if ("url" in mediaUpload) bufferOrFilePath = mediaUpload.url.toString();
    else bufferOrFilePath = await toBuffer(mediaUpload.stream);
    const { read, MIME_JPEG, AUTO } = await Promise.resolve().then(
        async () => (await import("jimp")).default
    );
    const jimp = await read(bufferOrFilePath);
    const min = jimp.getWidth();
    const max = jimp.getHeight();
    const cropped = jimp.crop(0, 0, min, max);
    return {
        img: await cropped.quality(100).scaleToFit(720, 720, AUTO).getBufferAsync(MIME_JPEG)
    };
}
