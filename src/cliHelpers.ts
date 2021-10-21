import { exec } from "child_process";

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

export { run };
