import * as vscode from "vscode";
import { format } from './formatter';
import { showInfo, noKtlintError, showError } from './utils/output';
import { checkIfKTlintExist } from './utils/config';

export const activate = async (context: vscode.ExtensionContext) => {
    const output = vscode.window.createOutputChannel("Kotlin Formatter");
    showInfo(`Enabled Kotlin-Formatter`, output);
    const hasKTLint = await checkIfKTlintExist();
    if (!hasKTLint) {
        noKtlintError(output);
    }

    let command = vscode.commands.registerCommand("kotlin-formatter.formatKotlin", async () => {
        const { activeTextEditor } = vscode.window;
        if (
            activeTextEditor &&
            ["kotlin", "kotlinscript"].includes(activeTextEditor.document.languageId)
        ) {
            const { document } = activeTextEditor;
            try {
                const newFile = await format(document, output);
                const edit = new vscode.WorkspaceEdit();
                edit.replace(
                    document.uri,
                    new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(
                            document.lineCount - 1,
                            document.lineAt(document.lineCount - 1).range.end.character
                        )
                    ),
                    newFile
                );
                return vscode.workspace.applyEdit(edit);
            } catch (e) {
                showError(e as string, output);
                return [];
            }
        }
    });

    let formatter = vscode.languages.registerDocumentFormattingEditProvider(
        [{ language: "kotlin" }, { language: "kotlinscript" }],
        {
            provideDocumentFormattingEdits: async (document: vscode.TextDocument) => {
                try {
                    const newFile = await format(document, output);
                    console.log(newFile);
                    const edit = vscode.TextEdit.replace(
                        new vscode.Range(
                            new vscode.Position(0, 0),
                            new vscode.Position(
                                document.lineCount - 1,
                                document.lineAt(document.lineCount - 1).range.end.character
                            )
                        ),
                        newFile
                    );
                    return [edit];
                } catch (e) {
                    showError((e as string), output);
                    return [];
                }
            },
        }
    );
    context.subscriptions.push(command, formatter);
};
