import * as vscode from 'vscode';
import { BrailleArtSettings, image2braille } from 'braille-art';
import { Result } from './result';
import * as path from 'path';
import { existsSync } from 'fs';

const regExp = {
    new: /<ba\s+"([a-zA-Z0-9_\\\/]+\.([a-zA-Z]+))"\s+((\s*\S+\s*=\s*[a-zA-Z0-9\.]+)+)\s*>/g,
    parsed: /<ba\s+"([a-zA-Z0-9_\\\/]+\.([a-zA-Z]+))"\s+((\s*\S+\s*=\s*[a-zA-Z0-9\.]+)+)\s+(__\d+)\s*>/g
}

const failedDecor = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerColor: 'blue',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: { borderColor: 'darkred' },
    dark: { borderColor: 'lightred' }
})

interface Art {
    full_path: string;
    settings: BrailleArtSettings;
}

function isSame(control: Art, test: Art): boolean {
    if (control.full_path !== test.full_path) {
        return false;
    }

    const keys = new Set([
        ...Object.keys(control.settings),
        ...Object.keys(test.settings)
    ]);

    for (let key of keys) {
        if (!(key in control.settings) || !(key in test.settings)) {
            return false;
        }
        if (control.settings[key] !== test.settings[key]) {
            return false;
        }
    }

    return true;
}

function full_path(root: string, rel_path: string): Result<string> {
    const full_path = path.join(path.normalize(root), rel_path);

    if (!existsSync(full_path)) {
        return [null, new Error(`File ${full_path} does not exist`)];
    }

    return [full_path, null];
}

function parse_settings(spec: string): Result<BrailleArtSettings> {

    const params = spec
        .split(/[=\s]/)
        .filter(s => s.length !== 0);

    if (params.length % 2 !== 0) {
        return [null, new Error("Parameters are specified incorrectly")];
    }

    let settings = {};

    // It's safe to iterate by an increment of 2 here
    for (let i = 0; i < params.length; i += 2) {
        const [p, v] = [params[i], params[i + 1]];

        switch (p) {
            case 'w':
                const width = parseInt(v, 10);
                if (isNaN(width) || width <= 0) {
                    return [null, new Error("Width is a positiive integer number")];
                }
                settings['width'] = width;
                break;
            case 'h':
                const height = parseInt(v, 10);
                if (isNaN(height) || height <= 0) {
                    return [null, new Error("Height is a positive integer number")];
                }
                settings['height'] = height;
                break;
            case 's':
                const scale = parseFloat(v);
                if (isNaN(scale) || scale <= 0) {
                    return [null, new Error("Scale is a positive float number")];
                }
                settings['scale'] = scale;
                break;
            case 'ws':
                const whitespace = v;
                settings['whitespace'] = whitespace;
                break;
            case 'wc':
                const white_cutoff = parseFloat(v);
                if (isNaN(white_cutoff) || white_cutoff <= 0 || white_cutoff > 1) {
                    return [null, new Error("Scale is a float number in range (0, 1]")];
                }
                settings['white_cutoff'] = white_cutoff;
                break;
            default:
                return [null, new Error("Unknown parameters")];
        }
    }

    // Check that settings satisfy the BrailleArtSettings interface
    if (!('white_cutoff' in settings)) {
        return [null, new Error("White cutoff (wc) must be specified")];
    }

    return [settings as BrailleArtSettings, null];
}

async function produce_art(art: Art): Promise<string[][]> {
    const braille = await image2braille(art.full_path, art.settings);
    return braille;
}

export { regExp, failedDecor, Art, isSame, parse_settings, full_path, produce_art };
