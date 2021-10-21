import * as vscode from "vscode";
import * as path from "path";
import platformSelect from './platformSelect';
import { run } from './cliHelpers';
import { findEditorConfig, checkIfKTlintExist } from './configHelpers';
import { showInfo, noKtlintError } from './outputHelpers';

const format = async (document: vscode.TextDocument, output: vscode.OutputChannel) => {
  const editorConfigPath = findEditorConfig(document);
  const editorConfigParam = editorConfigPath ? `--editorconfig '${editorConfigPath}'` : "";
  editorConfigPath && showInfo(`Found editorconfig file at: ${editorConfigPath}`, output);

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
  showInfo(`Formatting file: ${document.uri.fsPath}`, output);
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

export { format };
