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

const showInfo = (infoLog: string, output: vscode.OutputChannel) => {
  output.appendLine(`${infoTag} ${infoLog}`);
};

const noKtlintError = (output: vscode.OutputChannel) => {
  const message = platformSelect({
    windows: `You don't have ktlint in your project root or your ktlintPath is setup incorreclty. Go to https://github.com/pinterest/ktlint/releases to download latest jar`,
    default: `You don't have ktlint installed, go to https://github.com/pinterest/ktlint#installation and follow the instructions for your OS`,
  });
  showError(message, output);
};

export { showError, showInfo, noKtlintError };
