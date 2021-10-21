import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import platformSelect from "./platformSelect";

const infoTag = "[INFO]:";
const errorTag = "[ERROR]:";

const showError = (errorLog: string, output: vscode.OutputChannel) => {
    const relevantInfo = errorLog
        ? errorLog.substring(errorLog?.indexOf("<stdin>"))
        : "Unkown error";
    vscode.window.showErrorMessage(`${errorTag} ${relevantInfo}`);
    output.appendLine(`${errorTag} ${relevantInfo}`);
    output.show(true);
};

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

const checkIfKTlintExist = platformSelect({
    windows: async (): Promise<Boolean> => {
        const ktlintPath = vscode.workspace
            .getConfiguration("kotlin-formatter")
            .get<string | null>("ktlintPath") || ".\\ktlint";
        return fs.existsSync(ktlintPath);
    },
    default: async (): Promise<Boolean> => {
        try {
            await run('command -v ktlint2');
            return true;
        } catch (e) {
            return false;
        }
    },
});

const noKtlintError = (output: vscode.OutputChannel) => {
    const message = platformSelect({
        windows: `You don't have ktlint in your project root or your ktlintPath is setup incorreclty. Go to https://github.com/pinterest/ktlint/releases to download latest jar`,
        default: `You don't have ktlint installed, go to https://github.com/pinterest/ktlint#installation and follow the instructions for your OS`,
    });
    showError(message, output);
};

const findEditorConfig = (document: vscode.TextDocument): string | null => {
    const documentPath = document.uri.fsPath;
    var testedFolder = path.dirname(documentPath);
    const files = getFiles(testedFolder);
    const editorConfig = files.find((e) => /\.editorconfig/.test(e));
    if (editorConfig) {
        return editorConfig;
    }
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
    const editorConfigParam = editorConfigPath ? `--editorconfig '${editorConfigPath}'` : "";
    editorConfigPath &&
        output.appendLine(`${infoTag} Found editorconfig file at: ${editorConfigPath}`);

    const ktlintPath = vscode.workspace
        .getConfiguration("kotlin-formatter")
        .get<string | null>("ktlintPath") || ".\\ktlint";

    const command = platformSelect({
        windows: `cd ${path.dirname(document.uri.fsPath)} & ( ${document
            .getText()
            .split(/\n|\r/)
            .filter(Boolean)
            .map((e) => `echo|set /p="${e}" & echo.`)
            .join(" & ")}) | java -jar ${ktlintPath} ${editorConfigParam} --stdin -F`,
        default: `cat <<EOF |ktlint ${editorConfigParam} --stdin -F\n${document.getText()}\nEOF`,
    });

    console.log(command);
    output.appendLine(`${infoTag} Formatting file: ${document.uri.fsPath}`);
    try {
        return await run(command);
    } catch (e) {
        const hasKTLint = await checkIfKTlintExist();
        if (!hasKTLint) {
            noKtlintError(output);
            throw Error("no ktlint");
        } else {
            throw e;
        }
    };
};

export const activate = async (context: vscode.ExtensionContext) => {
    const output = vscode.window.createOutputChannel("Kotlin Formatter");
    output.appendLine(`${infoTag} Enabled Kotlin-Formatter`);
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
                    showError((e as string).toString(), output);
                    return [];
                }
            },
        }
    );
    context.subscriptions.push(command, formatter);
};
