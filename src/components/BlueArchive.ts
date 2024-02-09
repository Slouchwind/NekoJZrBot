import axios from "axios";

export interface StudentInfo {
    Id: number;
    IsReleased: boolean[];
    DefaultOrder: number;
    PathName: string;
    DevName: string;
    /**姓名 */
    Name: string;
    /**所在学校名字 */
    School: string;
    /**所在部门名字 */
    Club: string;
    StarGrade: number;
    SquadType: string;
    TacticRole: string;
    Summons: [];
    Position: string;
    BulletType: string;
    ArmorType: string;
    StreetBattleAdaptation: number;
    OutdoorBattleAdaptation: number;
    IndoorBattleAdaptation: number;
    WeaponType: string;
    WeaponImg: string;
    Cover: true;
    Equipment: string[];
    CollectionBG: string;
    CollectionTexture: string;
    FamilyName: string;
    FamilyNameRuby: null;
    PersonalName: string;
    SchoolYear: string;
    CharacterAge: string;
    Birthday: string;
    CharacterSSRNew: string;
    ProfileIntroduction: string
    Hobby: string;
    CharacterVoice: string;
    BirthDay: string;
    ArtistName: string;
    CharHeightMetric: string;
    CharHeightImperial: string;
    StabilityPoint: number;
    AttackPower1: number;
    AttackPower100: number;
    MaxHP1: number;
    MaxHP100: number;
    DefensePower1: number;
    DefensePower100: number;
    HealPower1: number;
    HealPower100: number;
    DodgePoint: number;
    AccuracyPoint: number;
    CriticalPoint: number;
    CriticalDamageRate: number;
    AmmoCount: number;
    AmmoCost: number;
    Range: number;
    RegenCost: number;
}

export type StudentsJsonData = StudentInfo[];

export interface VoiceInfo {
    Group: string;
    AudioClip: string;
    Transcription?: string;
}

export interface VoiceData {
    Normal: VoiceInfo[];
    Battle: VoiceInfo[];
    Lobby: VoiceInfo[];
    Event: VoiceInfo[];
}

export type VoiceJsonData = { [id: string]: VoiceData };

export const supportLang = ['cn', 'en', 'jp', 'kr', 'th', 'tw', 'vi', 'zh'];
export const studentImageType = ['collection', 'icon', 'lobby', 'portrait', 'weapon'];
export const voiceDataKey = ['Normal', 'Battle', 'Lobby', 'Event'];

type LangBAJsonDatas = { [lang: string]: { [type: string]: any } }

class BlueArchive {
    jsonData: LangBAJsonDatas;
    usingLang: string;
    mainHref: string;

    constructor(lang: string = 'cn') {
        this.jsonData = {};
        this.usingLang = lang;
        this.mainHref = 'https://cdn.jsdelivr.net/gh/lonqie/SchaleDB/';
        this.getJsonData('localization');
    }

    async setLanguage(language: string) {
        this.usingLang = language;
        await this.getJsonData('localization');
    }

    setMainHref(href: string) {
        this.mainHref = href;
    }

    async getJsonData(type: string) {
        if (this.jsonData[this.usingLang] === undefined) this.jsonData[this.usingLang] = {}
        let studentsJsonDataUrl = this.mainHref + `data/${this.usingLang}/${type}.min.json`;
        try {
            let result = await axios.get(studentsJsonDataUrl);
            this.jsonData[this.usingLang][type] = result.data;
        } catch (err) {
            console.error(String(err));
        }
    }

    isRightData(type: string): boolean {
        return this.jsonData[this.usingLang]?.[type] !== undefined;
    }

    async checkData(type: string, awaiter?: () => Promise<any>): Promise<boolean> {
        if (this.isRightData(type)) return true;
        await awaiter?.();
        await this.getJsonData(type);
        return this.isRightData(type);
    }

    getStudentsInfo(filter: (info: StudentInfo) => boolean): StudentInfo[] {
        let studentsJsonData = this.jsonData[this.usingLang].students as StudentsJsonData;
        return studentsJsonData.filter(filter);
    }

    getStudentsImageURL(info: StudentInfo, type: string): string {
        if (type === 'weapon') return this.mainHref + `images/weapon/${info.WeaponImg}`;
        return this.mainHref + `images/student/${type}/${info.Id}.webp`;
    }

    getLocalizationText(type: string, key: string): string | undefined {
        return this.jsonData[this.usingLang].localization[type][key];
    }

    getStudentsVoiceData(id: number): VoiceData {
        return this.jsonData[this.usingLang].voice[String(id)]
    }

    getVoiceURL(voiceInfo: VoiceInfo): string {
        return 'https://static.schale.gg/voice/' + voiceInfo.AudioClip;
    }

    getVoiceTitle(voice: VoiceInfo): string {
        let group = voice.Group;
        let clipKey = group.slice(0, -1);
        let clipId = group.slice(-1);
        let localString = this.getLocalizationText('VoiceClip', clipKey) as string;
        return localString.replace(/\{0\}/g, clipId);
    }
}

export default BlueArchive;