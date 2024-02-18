import { formatObject } from "./ObjectExtra"

const commands: { [key: string]: [string, string] } = {
    start: ['你好喵', '你好喵'],
    help: ['帮助喵', '显示此条帮助喵'],
    sign: ['签到~', '喵，看看你的今日人品'],
    poke: ['戳戳', '戳戳戳戳'],
    moe: ['喵喵喵~~', '喵喵喵！喵喵\\~'],
    jseq: ['JavaScript表达式喵', '例如 `/jseq 1+1` 喵'],
    ba: ['碧蓝档案查询', '格式 `/ba method:type[:opt] <arg>`\n    例如 `/ba get:students Name 御坂美琴`'],
    r: ['动作喵', '对群友的动作喵，用回复指定喵\\~'],
    id: ['抓id喵', '抓id喵'],
    admin: ['喵，抓管理员', '把管理员列表抓出来喵'],
    sticker: ['qwq', '表情包喵\\~'],
}

export default function displayCommandsHelp(set: boolean = false): string {
    return formatObject(commands, (k, v) => set ?
        `${k} - ${v[0]}` :
        `\`/${k}\` \\-\\- ${v[1]}`
    );
}