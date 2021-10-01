import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

const infoTag = "[INFO]:";
const errorTag = "[ERROR]:";

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
    const documentPath = document.uri.fsPath;
    var testedFolder = path.dirname(documentPath);
    const files = getFiles(testedFolder);
    const editorConfig = files.find((e) => /\.editorconfig/.test(e));
    if (editorConfig) return editorConfig;
    // do {
    //     const editorConfigFile = fs
    //         .readdirSync(testedFolder)
    //         .find((file) => file === ".editorconfig");
    //     if (editorConfigFile) {
    //         return `${testedFolder}/${editorConfigFile}`;
    //     }
    //     testedFolder = path.dirname(testedFolder);
    //     console.log(testedFolder);
    // } while (testedFolder !== process.cwd());
    return null;
};

const getFiles = (dir: string): string[] => {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    });
    return Array.prototype.concat(...files);
};

const format = async (document: vscode.TextDocument, output: vscode.OutputChannel) => {
    const editorConfigPath = findEditorConfig(document);
    editorConfigPath &&
        output.appendLine(`${infoTag} Found editorconfig file at: ${editorConfigPath}`);
    const command =
        process.platform === "win32"
            ? `cd ${path.dirname(document.uri.fsPath)} & ( ${document
                  .getText()
                  .split(/\n|\r/)
                  .filter(Boolean)
                  .map((e) => `echo|set /p="${e}" & echo.`)
                  .join(" & ")}) | java -jar .\\ktlint ${
                  editorConfigPath ? `--editorconfig '${editorConfigPath}'` : ""
              } --stdin -F`
            : `cat <<EOF |ktlint ${
                  editorConfigPath ? `--editorconfig '${editorConfigPath}'` : ""
              } --stdin -F\n${document.getText()}\nEOF`;
    console.log(command);
    output.appendLine(`${infoTag} Formatting file: ${document.uri.fsPath}`);
    return await run(command);
};

const showError = (e: string, output: vscode.OutputChannel) => {
    const errorLog = e;
    const relevantInfo = errorLog
        ? errorLog.substring(errorLog?.indexOf("<stdin>"))
        : "Unkown error";
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
                    showError((e as string).toString(), output);
                    return [];
                }
            },
        }
    );
    context.subscriptions.push(command, formatter);
};
