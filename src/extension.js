const vscode = require('vscode');

const duden = require("./duden")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('duden-mentor.checkSpelling', function () {

		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			const selections = editor.selections;

			duden.reset();

			selections.forEach(selection => {
				let text = document.getText(selection);

				text.replaceAll("\\", "\"\\\"")

				duden.spellCheck(text).then((spellAdvices) => {
					duden.highlightErrors(text, spellAdvices, selection);
				}).catch((message) => {
					vscode.window.showWarningMessage(message);
				});
			});
		}
	});

	let onSave = vscode.workspace.onDidSaveTextDocument((document) => {

		let texts = [];

		for (let i = 0; i < document.lineCount; i++) {
			let line = document.lineAt(i);
			if (line.text.length > 800) {
				continue;
			}
			let current = [];
			while (document.lineCount < i + 1) {
				if ((line.text.length + document.lineAt(i + 1).text.length) < 800) {
					current.push([line.text, line.range]);
					i++;
				} else {
					current.push([line.text, line.range]);
				}
			}
		}

		var text = document.getText();
		duden.reset();

		let split = 0;
		let selections = [];
		do {
			if (text.length <= split + 800) {
				let s = { start: { line: 0, character: 0 } }
				selections.push([text.slice(split, text.length), s]);
				break;
			}

			// go 800 characters forward and back again to next space
			var current = text[split + 800];
			var line = 0;
			while (current != " " && split > 0) {
				split = split - 1;
				current = text[split];
			}
			let s = { start: { line: line, character: 0 } }
			selections.push([text.slice(split, split + 800), s]);
		}
		while (split < text.length);

	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(onSave);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
