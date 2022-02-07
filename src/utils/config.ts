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

const getFiles = (dir: string, recursive = false): string[] => {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = dirents
    .filter(dirent => dirent.isFile() || (recursive && dirent.isDirectory()))
    .map(dirent => {
      const res = path.resolve(dir, dirent.name);
      return (recursive && dirent.isDirectory()) ? getFiles(res, recursive) : res;
    });
  return Array.prototype.concat(...files);
};

const findInFolder = (dir: string, filename: string, recursive = false) => {
  try {
    const files = getFiles(dir, recursive);
    const file = files.find((e) => e.endsWith(`/${filename}`));
    if (file) {
      fs.accessSync(file, fs.constants.R_OK);
      return file;
    }
  } catch (err: any) {
    if (err.code !== 'EPERM' && err.code !== 'EACCES') {
      throw err;
    }
  }

  return null;
};

const findEditorConfig = (document: vscode.TextDocument): string | null => {
  const documentPath = document.uri.fsPath;
  let testedFolder = path.dirname(documentPath);
  let editorConfig = findInFolder(testedFolder, '.editorconfig', true);
  while (!editorConfig) {
    const newFolder = path.dirname(testedFolder);
    // detect fs root directory to avoid an eternal loop, since `dirname('/') = '/'`
    if (newFolder === testedFolder) {
      break;
    }
    testedFolder = newFolder;
    editorConfig = findInFolder(testedFolder, '.editorconfig');
  }
  if (editorConfig) {
    return editorConfig;
  } else {
    return null;
  }
};

export { checkIfKTlintExist, findEditorConfig };
