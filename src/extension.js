import { commands, window, workspace } from "vscode";
import vscode from "vscode";
import duden from "./duden";

function activate(context) {

	window.showInformationMessage('DudenMentor activated!');

	let apiKey = workspace.getConfiguration('duden-mentor').get("apiKey");
	let grantPermissions = workspace.getConfiguration('duden-mentor').get("grantPermissions");

	if (apiKey === "")
		window.showInformationMessage('No API-Key found. This one is needed to spell check more than 800 words');

	let disposable = commands.registerCommand('duden-mentor.checkSpelling', function () {

		const editor = window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			const selections = editor.selections;

			duden.reset();

			selections.forEach(selection => {
				let text = document.getText(selection);

				duden.spellCheck(text).then((spellAdvices) => {
					duden.highlightErrors(text, spellAdvices, selection);
				}).catch((message) => {
					vscode.window.showWarningMessage(message);
				});
			});
		}

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() { }

export default {
	activate,
	deactivate
}
