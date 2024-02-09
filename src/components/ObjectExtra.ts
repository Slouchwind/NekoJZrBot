export function formatObject<K extends string | number | symbol, V>(
    obj: { [x in K]: V },
    formater: string | ((key: string, value: V) => string),
    filter: (key: Extract<K, string>, value: V) => boolean = () => true
): string {
    let resultString: string = '';
    for (let key in obj) {
        let value = obj[key];
        if (filter(key, value)) {
            if (typeof formater === 'string')
                resultString += formater.replace(/\$k/g, key).replace(/\$v/g, String(value));
            else resultString += formater(String(key), value);
            resultString += '\n';
        }
        else continue;
    }
    return resultString;
}