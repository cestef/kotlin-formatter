import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

const run = (command: string, output: vscode.OutputChannel) =>
    new Promise<string>((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                output.appendLine(`${err}`);
                output.appendLine(stderr);
                reject(err.message);
            } else {
                resolve(stdout);
                output.appendLine(stdout);
            }
        });
    });

const findEditorConfig = (document: vscode.TextDocument): string | null => {
    const documentPath = document.uri.path;
    var testedFolder = path.dirname(documentPath);
    do {
        const editorConfigFile = fs.readdirSync(testedFolder).find(file => file === '.editorconfig');
        if (editorConfigFile) {
            return `${testedFolder}/${editorConfigFile}`;
        }
        testedFolder = path.dirname(testedFolder);
    } while (testedFolder !== process.cwd());
    return null;
};

const format = async (document: vscode.TextDocument, output: vscode.OutputChannel) => {
    const editorConfigPath = findEditorConfig(document);
    const command = `cat <<EOF |ktlint ${editorConfigPath ? `--editorconfig '${editorConfigPath}'` : ''} --stdin -F\n${document.getText()}\nEOF`;
    return await run(command, output);
};

export const activate = (context: vscode.ExtensionContext) => {
    const output = vscode.window.createOutputChannel("Kotlin Formatter");
    output.appendLine("Enabled Kotlin-Formatter");
    let command = vscode.commands.registerCommand("kotlin-formatter.formatKotlin", async () => {
        const { activeTextEditor } = vscode.window;

        if (
            activeTextEditor &&
            ["kotlin", "kotlinscript"].includes(activeTextEditor.document.languageId)
        ) {
            const { document } = activeTextEditor;
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
        }
    });

    let formatter = vscode.languages.registerDocumentFormattingEditProvider(
        [{ language: "kotlin" }, { language: "kotlinscript" }],
        {
            provideDocumentFormattingEdits: async (document) => {
                try {
                    const newFile = await format(document, output);
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
                    output.appendLine(e as string);
                    vscode.window.showErrorMessage(`An Error occured when formatting: ${e}`);
                    return [];
                }
            },
        }
    );
    context.subscriptions.push(command, formatter);
};
