import { window, Position, Range, languages, DiagnosticRelatedInformation, Location, DiagnosticSeverity } from 'vscode';
import vscode from "vscode";
import fetch from 'node-fetch';

var api = "https://mentor.duden.de/api/grammarcheck?_format=json";

var collections = [];
var errors = [];

/**
 * @param {string | any[]} text
 */
async function spellCheck(text) {
    return new Promise((resolve, reject) => {
        let permission = vscode.workspace.getConfiguration('duden-mentor.grantPermissions');
        let apiKey = vscode.workspace.getConfiguration('duden-mentor.apiKey');
        console.log(apiKey);
        let body = { text: text, "grantPermissions": permission };

        if(text.length > 800){
            reject("Character limit (800) reached. Need to add API-Key" + text.length);
        }

        fetch(api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).then(res => res.json())
            .then(function (json) {
                console.log(json);
                let data = json.data;
                let spellAdvices = data.spellAdvices;

                resolve(spellAdvices);
            }).catch(function (error) {
                reject(error);
            });
    });
}

const errorDecorationType = window.createTextEditorDecorationType({
    // cursor: 'crosshair',
    // use a themable color. See package.json for the declaration and default values.
    backgroundColor: { id: 'duden.error' }
});

function highlightErrors(text, spellAdvices, selection) {
    if (spellAdvices == null || spellAdvices.length <= 0) {
        window.showInformationMessage("No errors");
    }

    // line breaks => for offset calculation
    var indices = [];
    for (var i = 0; i < text.length; i++) {
        if (text[i] === "\n") indices.push(i);
    }

    let activeEditor = window.activeTextEditor;

    spellAdvices.forEach(spellAdvice => {
        // get spelladvice values
        let shortMessage = spellAdvice.shortMessage;
        let length = spellAdvice.length;
        let offset = spellAdvice.offset;

        // calculate offset for line and character
        let lineOffset = 0;
        let charOffset = offset;

        indices.forEach(index => {
            if (offset > index) {
                lineOffset++;
                charOffset = offset - index - 1;
            }
        });

        // console.log(offset + "<->L:" + lineOffset + "<->C:" + charOffset);

        // selection offset
        let startPos = new Position(selection.start.line + lineOffset, selection.start.character + charOffset);
        let endPos = new Position(selection.start.line + lineOffset, selection.start.character + charOffset + length);

        // decorations
        let decoration = { range: new Range(startPos, endPos), hoverMessage: shortMessage };
        errors.push(decoration);
        activeEditor.setDecorations(errorDecorationType, errors);

        // display diagnostics with fixes
        let document = window.activeTextEditor.document;
        showDiagnostics(document, new Range(startPos, endPos), spellAdvice);
    });

}

function showDiagnostics(document, range, spellAdvice) {
    const collection = languages.createDiagnosticCollection('Info');
    collections.push(collection);

    let infos = [];
    infos.push(new DiagnosticRelatedInformation(new Location(document.uri, range), "Err: " + spellAdvice.originalError));
    spellAdvice.proposals.forEach(proposal => {
        infos.push(new DiagnosticRelatedInformation(new Location(document.uri, range), "Fix: " + proposal));
    });

    collection.set(document.uri, [{
        code: spellAdvice.type,
        message: spellAdvice.errorMessage,
        range: range,
        severity: DiagnosticSeverity.Warning,
        source: 'Duden',
        relatedInformation: infos
    }]);
}

function reset() {
    // clear first
    collections.forEach(collection => {
        collection.clear();
    });

    errors = [];
    window.activeTextEditor.setDecorations(errorDecorationType, errors);
}

export default {
    reset,
    spellCheck,
    highlightErrors,
    showDiagnostics
};