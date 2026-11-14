import { styleText } from 'node:util';

/**
 * One line of log, shown by the layer it comes from, so you can see what called what. A node or a tool is not
 * indented, the domain function it calls is indented once, and the data function that one calls twice.
 *
 *   log('searchShopperPreferences "pasta"');
 *
 * You do not say which layer. It is found from the folder of the file that called `log`, and each layer has its
 * own color. Colors are left out when the output is not a terminal, or when NO_COLOR is set.
 *
 * Where to call it: nodes, tools and domain functions log before they call anything, so they print above what
 * they call. A data function calls nothing else, so it logs once the work is done, with what came back.
 */

const LAYERS = [
    { folder: '/tools/', level: 0, color: 141, prefix: 'tool: ' },
    { folder: '/context-retriever/', level: 0, color: 'red', prefix: 'context-retriever: ' },
    { folder: '/workflows/', level: 0, color: 'cyan', prefix: '' },
    { folder: '/helpers/', level: 1, color: 208, prefix: '' },
    { folder: '/domain/', level: 1, color: 'yellow', prefix: '' },
    { folder: '/data/', level: 2, color: 'red', prefix: '' }, // Redis red
] as const;

// styleText leaves the text alone when colors are off (not a terminal, or NO_COLOR), so this tells us whether they are on
const COLORS_ON = styleText('red', 'x') !== 'x';

/** A number is one of the 256 terminal colors, which styleText has no name for. */
function paint(color: Parameters<typeof styleText>[0] | number, text: string): string {
    if (typeof color === 'number') {
        return COLORS_ON ? `\x1b[38;5;${color}m${text}\x1b[39m` : text;
    }
    return styleText(color, text);
}

/** The file that called `log`: the first line of the stack that is not this file. */
function callerFile(): string {
    const frames = new Error().stack?.split('\n').slice(2) ?? [];
    const frame = frames.find((line) => !line.includes('/lib/log.')) ?? '';
    return frame.match(/\(?(?:file:\/\/)?([^()\s]+?):\d+:\d+\)?$/)?.[1] ?? '';
}

export function log(message: string): void {
    const file = callerFile();
    const layer = LAYERS.find((candidate) => file.includes(candidate.folder));
    const line = `${'   '.repeat(layer?.level ?? 0)}${layer?.prefix ?? ''}${message}`;
    console.log(layer ? paint(layer.color, line) : line);
}
