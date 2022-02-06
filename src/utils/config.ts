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
    return dirent.isDirectory() ? '' : res;
  });
  return Array.prototype.concat(...files).filter(v => v !== '');
};

const findEditorConfig = (document: vscode.TextDocument): string | null => {
  const documentPath = document.uri.fsPath;
  let testedFolder = documentPath;
  let editorConfig: string | undefined;
  while (!editorConfig) {
    const newFolder = path.dirname(testedFolder);
    if (newFolder === testedFolder) {
      break;
    }
    testedFolder = newFolder;
    try {
      const files = getFiles(testedFolder);
      const potentialEditorConfig = files.find((e) => /\.editorconfig/.test(e));
      if (potentialEditorConfig) {
        fs.accessSync(potentialEditorConfig, fs.constants.R_OK);
        editorConfig = potentialEditorConfig;
      }
    } catch (err: any) {
      if (err.code === 'EPERM' || err.code === 'EACCES') {
        continue;
      } else {
        throw err;
      }
    }
  }
  if (editorConfig) {
    return editorConfig;
  }
  return null;
};

export { checkIfKTlintExist, findEditorConfig };
