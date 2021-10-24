import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import platformSelect from "./platformSelect";
import { run } from "./process";

const checkIfKTlintExist = platformSelect({
  windows: async (): Promise<Boolean> => {
    const ktlintPath = vscode.workspace
      .getConfiguration("kotlin-formatter")
      .get<string | null>("ktlintPath") || ".\\ktlint";
    return fs.existsSync(ktlintPath);
  },
  default: async (): Promise<Boolean> => {
    try {
      await run('command -v ktlint');
      return true;
    } catch (e) {
      return false;
    }
  },
});

const getFiles = (dir: string): string[] => {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  });
  return Array.prototype.concat(...files);
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

export { checkIfKTlintExist, findEditorConfig };
