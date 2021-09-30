import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

const infoTag = '[INFO]:';
const errorTag = '[ERROR]:';

const run = (command: string) =>
    new Promise<string>((resolve, reject) => {
        exec(command, (err, stdout) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(stdout);
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
    editorConfigPath && output.appendLine(`${infoTag} Found editorconfig file at: ${editorConfigPath}`);
    const command = `cat <<EOF |ktlint ${editorConfigPath ? `--editorconfig '${editorConfigPath}'` : ''} --stdin -F\n${document.getText()}\nEOF`;
    output.appendLine(`${infoTag} Formatting file: ${document.uri.path}`);
    return await run(command);
};

const showError = (e: string, output: vscode.OutputChannel) => {
    const errorLog = e;
    const relevantInfo = errorLog.substring(errorLog.indexOf('<stdin>'));
    vscode.window.showErrorMessage(`${errorTag} ${relevantInfo}`);
    output.appendLine(`${errorTag} ${relevantInfo}`);
    output.show(true);
};

export const activate = (context: vscode.ExtensionContext) => {
    const output = vscode.window.createOutputChannel("Kotlin Formatter");
    output.appendLine(`${infoTag} Enabled Kotlin-Formatter`);
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
                    showError(e as string, output);
                    return [];
                }
            },
        }
    );
    context.subscriptions.push(command, formatter);
};
