import * as vscode from "vscode";
import * as path from "path";
import platformSelect from "./utils/platformSelect";
import { run } from "./utils/process";
import { findEditorConfig, checkIfKTlintExist } from "./utils/config";
import { showInfo, noKtlintError } from "./utils/output";
import { createHash } from "crypto";

const format = async (document: vscode.TextDocument, output: vscode.OutputChannel) => {
    const editorConfigPath = findEditorConfig(document);
    const editorConfigParam = editorConfigPath ? `--editorconfig '${editorConfigPath}'` : "";
    editorConfigPath && showInfo(`Found editorconfig file at: ${editorConfigPath}`, output);

    const ktlintPath =
        vscode.workspace.getConfiguration("kotlin-formatter").get<string | null>("ktlintPath") ||
        ".\\ktlint";

    const text = document.getText();
    // use hash of doc as delimiter for heredoc so that the document itself containing the delimiter is... unlikely
    const hash = createHash("sha1").update(text).digest("hex");
    const command = platformSelect({
        windows: `cd ${path.dirname(document.uri.fsPath)} & ( ${text
            .split(/\n|\r/)
            .filter(Boolean)
            .map((e) => `echo|set /p="${e}" & echo.`)
            .join(" & ")}) | java -jar ${ktlintPath} ${editorConfigParam} --stdin -F`,
        default: `cat <<\'${hash}\' |ktlint ${editorConfigParam} --stdin -F\n${text}\n${hash}`,
    });

    console.log(command);
    showInfo(`Formatting file: ${document.uri.fsPath}`, output);
    try {
        let res = await run(command);
        res = res.replace(/[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+ \[.+\] .*(?:\n|\r)/g, "");
        return res;
    } catch (e) {
        const hasKTLint = await checkIfKTlintExist();
        if (!hasKTLint) {
            noKtlintError(output);
            throw Error("no ktlint");
        } else {
            throw e;
        }
    }
};

export { format };
