'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { setTimeout } from 'timers';

import * as art from './art';
import { Result } from './result';

interface Arts {
    [id: string]: art.Art;
}

function guid(): string {
    return `__${Date.now()}`;
}

function validate_request(root: string, rel_path: string, spec: string): Result<art.Art> {
    const [full_path, err_full_path] = art.full_path(root, rel_path);
    if (err_full_path !== null) {
        return [null, err_full_path];
    }

    const [settings, err_settings] = art.parse_settings(spec);
    if (err_settings !== null) {
        return [null, err_settings];
    }
    return [{ full_path, settings }, null];
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "braille-art" is now active!');

    let arts: Arts = {};

    // ====> Set up reactive changes in the editor
    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        triggerUpdateComments();
    }
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateComments();
        }
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateComments();
        }
    }, null, context.subscriptions);
    // <====

    // Set up a delayed check-up
    function triggerUpdateComments() {
        setTimeout(updateComments, 500);
    }

    async function updateComments() {
        console.log(`Update comments ${Math.random()}`);
        if (!activeEditor) { return; }

        let text = activeEditor.document.getText();

        let fails: vscode.DecorationOptions[] = [];

        let match: RegExpExecArray;

        // First run inventory
        console.log('New art');
        while (match = art.regExp.new.exec(text)) {
            const
                s = activeEditor.document.positionAt(match.index),
                e = activeEditor.document.positionAt(match.index + match[0].length);

            console.log(`\t${match[0]}`);

            const [newArt, err] = validate_request(vscode.workspace.rootPath, match[1], match[3]);
            if (err !== null) {
                fails.push({
                    range: new vscode.Range(s, e),
                    hoverMessage: err.message
                });
                continue;
            }

            const id = guid();
            // const newArt: art.Art = { full_path, settings };
            arts[id] = newArt;

            console.log(`\tfull_path: ${newArt.full_path}`);
            console.log(`\tsettings: ${JSON.stringify(newArt.settings)}`);

            // Record id
            const
                edit_id = new vscode.WorkspaceEdit(),
                prev = e.translate(0, -1);
            edit_id.insert(activeEditor.document.uri, prev, ` ${id}`);


            // Place the art
            const
                edit_art = new vscode.WorkspaceEdit(),
                next = e.translate(1),
                braille = await art.produce_art(arts[id]),
                braille_art = braille.map(line => '/// ' + line.join("")).join('\n');
            edit_art.insert(activeEditor.document.uri, next, `/// ${id}\n${braille_art}\n/// ${id}`);

            await vscode.workspace.applyEdit(edit_id);
            await vscode.workspace.applyEdit(edit_art);
        }

        // Act upon the inventory
        text = activeEditor.document.getText();
        console.log('Update old art');
        while (match = art.regExp.parsed.exec(text)) {
            const
                s = activeEditor.document.positionAt(match.index),
                e = activeEditor.document.positionAt(match.index + match[0].length),
                id = match[5];

            console.log(`\tParsed art: ${id}`);

            const [parsed, err] = validate_request(vscode.workspace.rootPath, match[1], match[3]);
            if (err !== null) {
                fails.push({
                    range: new vscode.Range(s, e),
                    hoverMessage: err.message
                });
                continue;
            }

            const inventory = arts[id];
            // const parsed: art.Art = { full_path, settings };

            console.log(`\tfull_path: ${parsed.full_path}`);
            console.log(`\tsettings: ${JSON.stringify(parsed.settings)}`);

            const same_art = art.isSame(inventory, parsed);
            if (same_art) {
                console.log('\tArt did not change, SKIPPING');
                continue;
            }

            console.log('\tArt changed, UPDATING');

            // The inventory has been updated

            // Update the record
            arts[id] = parsed;

            // Find the corresponding comment
            const
                comment = `\/\/\/ ${id}[\\s\\S]+\/\/\/ ${id}`,
                comment_RegExp = new RegExp(comment, 'g'),
                comment_match = comment_RegExp.exec(text);

            // There will be at most one match
            // If there is no match, it means that id have been messed aroud with
            if (comment_match.length === 0) {
                continue;
            }

            const
                comment_s = activeEditor.document.positionAt(comment_match.index),
                comment_e = activeEditor.document.positionAt(comment_match.index + comment_match[0].length),
                comment_range = new vscode.Range(comment_s, comment_e);

            // Produce art
            const braille = await art.produce_art(arts[id]);
            const braille_art = braille.map(line => '/// ' + line.join("")).join('\n');

            const edit = new vscode.WorkspaceEdit();
            edit.replace(activeEditor.document.uri, comment_range, `/// ${id}\n${braille_art}\n/// ${id}`);
            await vscode.workspace.applyEdit(edit);
        }

        activeEditor.setDecorations(art.failedDecor, fails);
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}