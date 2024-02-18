//System
import path from 'path';
import fs from 'fs';
//grammY
import { Bot, CommandContext, Context, GrammyError, HttpError } from 'grammy';
import { ChatMemberAdministrator, ChatMemberOwner, ParseMode, User } from 'grammy/types';
//components
import BlueArchive, { StudentInfo, VoiceData, VoiceInfo, studentImageType, supportLang, voiceDataKey } from './components/BlueArchive';
import { formatObject } from './components/ObjectExtra';
import displayCommandsHelp from './components/Help';
//package
import { SocksProxyAgent } from "socks-proxy-agent";
import dayjs, { Dayjs } from 'dayjs';
import chalk, { Chalk } from 'chalk';

//Bot config

const BOT_DEVELOPER_ID: number = 6894482393;
const botShortName: string = 'NekoJZr';
const botToken: string = fs.readFileSync(path.join(__dirname, '../..', botShortName + '_token.txt')).toString();

const logWithDay = (log: typeof console.log, color: Chalk = chalk.white) =>
((...args: any[]) => {
    log('[' + dayjs().format('HH:mm:ss') + ']', ...args.map(v => typeof v === 'string' ? color(v) : v));
});
console.log = logWithDay(console.log);
console.warn = logWithDay(console.warn, chalk.yellow);
console.error = logWithDay(console.error, chalk.red);

interface BotExpand {
    rc: (
        others?: Parameters<Context['reply']>[1],
        message_id?: number
    ) => Parameters<Context['reply']>[1];
}
interface BotConfig {
    botDeveloperId: number;
    isBotDeveloper: boolean;
}
type ContextWithConfig = Context & BotExpand & { config: BotConfig };

const socksAgent = new SocksProxyAgent('socks://127.0.0.1:7890');
const bot = new Bot<ContextWithConfig>(botToken, {
    client: {
        baseFetchConfig: {
            agent: socksAgent,
            compress: true,
        },
    },
});

bot.use(async (ctx, next) => {
    if (ctx.message !== undefined) {
        let msg = ctx.message;
        ctx.rc = (others, mid) => ({
            reply_parameters: { message_id: mid || msg.message_id },
            ...others
        });
    }
    ctx.config = {
        botDeveloperId: BOT_DEVELOPER_ID,
        isBotDeveloper: ctx.from?.id === BOT_DEVELOPER_ID,
    };
    await next();
});

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});

const Command = (
    cmd: string,
    fn: (ctx: CommandContext<ContextWithConfig>, log: typeof console.log) => void
) => {
    bot.command(cmd, ctx => fn(
        ctx,
        (log => (...args: any[]) => log('bot.command.' + cmd, ...args))(console.log)
    ));
}

//Bot code

Command('start', ctx => ctx.reply('Moe!'));

Command('help', ctx => {
    ctx.reply(displayCommandsHelp(), { parse_mode: 'MarkdownV2' });
});

Command('jseq', ctx => {
    if (ctx.message === undefined) return;
    let eq: string = ctx.match;
    if (eq.trim() === '') {
        ctx.reply('Need input JavaScript equation\nLike `/jseq 1+1`', ctx.rc({ parse_mode: 'MarkdownV2' }));
    }
    else {
        let replyText: string;
        try {
            let result = new Function('return ' + eq)();
            if (result === undefined) replyText = 'No result';
            else replyText =
                'Value: ' + String(result) + '\n' +
                'Type: ' + Object.prototype.toString.call(result).slice(8, -1);
        } catch (error) {
            replyText = String(error);
        }
        ctx.reply(replyText, ctx.rc());
    }
});

type SignData = [Date, number];
const signJsonPath = path.join(__dirname, '../data/sign.json');
Command('sign', (ctx, log) => {
    if (ctx.message === undefined) return;
    let nowDayjs = dayjs();
    let localData: { [id: string]: SignData } = JSON.parse(fs.readFileSync(signJsonPath).toString());
    let fromId: string = String(ctx.from?.id);
    let fromData: SignData | undefined = localData[fromId];
    let replyText: string;
    if (fromData === undefined) {
        let randomInt: number = Math.round(Math.random() * 100);
        localData[fromId] = [nowDayjs.toDate(), randomInt];
        replyText = `你的今日人品是${randomInt}喵！`;
    }
    else {
        let lastDayjs = dayjs(fromData[0]);
        let getDay: (d: Dayjs) => Dayjs = d => d.set('ms', 0).set('s', 0).set('m', 0).set('h', 0);
        let diffDay = (Number(getDay(nowDayjs)) - Number(getDay(lastDayjs))) / 86400000;
        if (diffDay < 1) replyText = `你有一次在${lastDayjs.format('HH:mm')}签到的${fromData[1]}的今日人品喵`;
        else {
            let randomInt: number = Math.round(Math.random() * 100);
            localData[fromId] = [nowDayjs.toDate(), randomInt];
            replyText = `你的今日人品是${randomInt}喵!`;
        }
    }
    ctx.reply(replyText, ctx.rc());
    log('Solve a sign command');
    fs.writeFileSync(signJsonPath, JSON.stringify(localData, undefined, 4));
});

let pokeReply = [
    'pwp?',
    'qwq?',
    'Moe!?',
    'awa',
    '>_<',
    '|_|?',
    'Moe moe moe?',
    'Moe ww~',
    'iyada'
];
Command('poke', ctx => {
    let randomIndex: number = Math.round(Math.random() * (pokeReply.length - 1));
    ctx.reply(pokeReply[randomIndex]);
});

Command('moe', ctx => {
    let randomInt: number = Math.round(Math.random() * 20);
    ctx.reply('喵'.repeat(randomInt));
});

let ba = new BlueArchive();
let displayKey: (keyof StudentInfo)[] = [
    'Id', 'Name', 'School', 'Club',
    'CharacterAge', 'Birthday', 'CharHeightMetric'
];
Command('ba', async (ctx, log) => {
    if (ctx.message === undefined) return;
    let replyText: string = '';
    let [query, ...args] = ctx.match.split(' ');
    let [method, type, ...opt] = query.split(':');
    //Full Command: /ba <query> [...args]
    //query: <method>:<type>[:...opt]
    if (query === undefined || method === undefined || type === undefined) replyText = 'ArgError: To less arguments';
    else {
        if (method === 'get') {
            //Get method
            if (!await ba.checkData(type,
                async () => { await ctx.reply('Getting StudentsJsonData...', ctx.rc()); }
            )) {
                ctx.reply('HttpError: Failed to get StudentsJsonData', ctx.rc());
                return;
            }
            if (type === 'students') {
                let [key, value, index] = args;
                let infos = ba.getStudentsInfo(i =>
                    Object.keys(i).includes(key) && (String(i[key as keyof StudentInfo]) === value)
                );
                if (infos[0] === undefined) replyText = 'No Found';
                else {
                    if (infos.length === 1) index = '0';

                    if (index === undefined) {
                        if (opt[0] === undefined)
                            replyText = formatObject<number, StudentInfo>(infos, (k, v) => `${k}: ${v.Name}`);
                        else replyText = 'ArgError: To many query arguments';
                    } else {
                        let info = infos[Number(index)];
                        let urlType = opt[0];
                        if (urlType === undefined) {
                            //Students Full Info
                            let withLocal: boolean = ba.isRightData('localization');
                            replyText = formatObject(info, (k, v) => {
                                if (withLocal) {
                                    if (k === 'School') v = ba.getLocalizationText('SchoolLong', v as string) || v;
                                    else if (k === 'Club') v = ba.getLocalizationText('Club', v as string) || v;
                                }
                                return `${k}: ${v}`;
                            }, k => displayKey.includes(k));
                        } else if (urlType === 'voice') {
                            //Students Voice
                            if (!await ba.checkData('voice',
                                async () => { await ctx.reply('Getting VoiceJsonData...', ctx.rc()); }
                            )) {
                                ctx.reply('HttpError: Failed to get VoiceJsonData', ctx.rc());
                                return;
                            }
                            let [_, key, index] = opt;
                            let voiceData = ba.getStudentsVoiceData(info.Id);
                            if (key === undefined) {
                                //Content of VoiceData
                                replyText = formatObject(voiceData, (k, v) => {
                                    let key: string = k;
                                    if (ba.isRightData('localization')) {
                                        key = `${ba.getLocalizationText('VoiceClipGroup', k)}(${k})`;
                                    }
                                    return `${key}: ${v.length}`
                                });
                            } else {
                                //Solve with key
                                if (!voiceDataKey.includes(key)) {
                                    replyText = 'VoiceDataKeyError: Only ' + voiceDataKey.join(', ') + ' types';
                                } else {
                                    let keyR = key as keyof VoiceData;
                                    if (index === undefined) {
                                        //Content of VoiceInfos
                                        replyText = formatObject<number, VoiceInfo>(voiceData[keyR], (k, v) => {
                                            let localString: string = v.Group;
                                            if (ba.isRightData('localization')) localString = ba.getVoiceTitle(v);
                                            return `${k}: ${localString}`;
                                        });
                                    } else {
                                        let voiceInfo = voiceData[keyR][Number(index)];
                                        ctx.replyWithAudio(ba.getVoiceURL(voiceInfo), ctx.rc());
                                        voiceInfo.Transcription && ctx.reply(voiceInfo.Transcription, ctx.rc());
                                        return;
                                    }
                                }
                            }
                        } else {
                            //Students Image
                            if (!studentImageType.includes(type)) {
                                replyText = 'ImageTypeError: Only ' + studentImageType.join(', ') + ' types';
                            } else {
                                ctx.replyWithPhoto(ba.getStudentsImageURL(info, urlType), ctx.rc());
                                return;
                            }
                        }
                    }
                }

            } else replyText = `QueryTypeError: No ${type} type`;
        } else if (method === 'set') {
            //Set method
            if (type === 'lang') {
                let nlang = args[0];
                if (!supportLang.includes(nlang)) replyText = 'LangError: Only ' + supportLang.join(', ') + ' langs';
                else {
                    let blang = ba.usingLang;
                    ba.setLanguage(nlang);
                    replyText = `LangChange: ${blang} -> ${nlang}`;
                }
            } else replyText = `QueryTypeError: No ${type} type`;
        } else replyText = `QueryMethodError: No ${method} method`;
    }
    if (replyText !== '') ctx.reply(replyText, ctx.rc());
    log('Solve a ba command:', query);
});

Command('r', (ctx, log) => {
    if (ctx.message === undefined) return;
    let getFullName = (u: User) => u.first_name + (u.last_name ? (' ' + u.last_name) : '');
    let fromUsr = ctx.from;
    let replyMsg = ctx.message.reply_to_message;
    let toUsr = replyMsg === undefined ? 'self' : replyMsg.from;
    if (fromUsr === undefined || toUsr === undefined) return;
    let fromName = getFullName(fromUsr);
    let toName = toUsr === 'self' ? '自己' : getFullName(toUsr as User);
    let react = ctx.match.trim() === '' ? '戳' : ctx.match.trim();
    ctx.reply(`${fromName} ${react}了 ${toName}`, {
        reply_parameters: { message_id: replyMsg === undefined ? ctx.message.message_id : replyMsg.message_id }
    });
    log('Solve a r command');
});

Command('id', ctx => {
    let idInfos = {
        'Me': ctx.me.id,
        'You': ctx.from?.id,
        'Chat Id': ctx.chat.id,
        'Message Id': ctx.message?.message_id,
        'Reply Message Id': ctx.message?.reply_to_message?.message_id,
    }
    ctx.reply(formatObject(idInfos, '$k: $v', (_, v) => v !== undefined));
});

Command('admin', async (ctx) => {
    let admins = await ctx.getChatAdministrators();
    ctx.reply(formatObject<number, ChatMemberOwner | ChatMemberAdministrator>(
        admins,
        (k, v) => `${k} ${v.status} ${v.user.username}`
    ));
});

let parseModes: ParseMode[] = ['HTML', 'Markdown', 'MarkdownV2'];
Command('echo', ctx => {
    if (!ctx.config.isBotDeveloper) return;
    let [mode, ...texts] = ctx.match.split(' ');
    if (!(parseModes as string[]).includes(mode)) ctx.reply('Only ' + parseModes.join(', ') + 'mode');
    ctx.reply(texts.join(' '), {
        parse_mode: mode as ParseMode
    });
});

Command('sticker', ctx => {
    let stickersFileId = fs.readFileSync(path.join(__dirname, '../data/stickers/white.txt'))
        .toString()
        .split('\n')
        .filter(v => v !== undefined)
        .map(v => v.endsWith('\r') ? v.replace('\r', '') : v);
    let randomIndex: number = Math.round(Math.random() * (pokeReply.length - 1));
    ctx.replyWithSticker(stickersFileId[randomIndex]);
});

const cachePath = path.join(__dirname, '../data/cache.txt');
bot.on('message', ctx => {
    let msg = ctx.message.text;
    let file_id = '';
    if (ctx.message.sticker) file_id = ctx.message.sticker.file_id;
    else if (ctx.message.photo) file_id = ctx.message.photo?.[0].file_id;
    let msgInfos = ['From:', ctx.from.username, 'Id:', ctx.from.id, 'Msg Id:', ctx.message.message_id];
    msg && console.log('Get message:', msg, '|', ...msgInfos);
    file_id && console.log('Get file:', file_id, '|', ...msgInfos);
    // if (ctx.config.isBotDeveloper && file_id) {
    //     let bcache = fs.readFileSync(cachePath).toString();
    //     fs.writeFileSync(cachePath, bcache + file_id + '\n');
    // }
});

console.log('Bot:', botShortName, 'start');
bot.start();