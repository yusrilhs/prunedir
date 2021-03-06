#!/usr/bin/env node

const nmPrune = require('.');
const Confirm = require('prompt-confirm');
const prettyBytes = require('pretty-bytes');
const fs = require('fs-extra');
const meow = require('meow');

const cli = meow(
  `
Usage
  $ prunedir <options>

Options
  -f, --force  Skip confirmation and run
  -l, --prune-license  Prune license files too
  -d, --dir   Directory to prune. Default is cwd

Examples
  $ prunedir --force
  Scanning directory…
  
  Pruning /Users/dave/code/nm-prune/node_modules
  Delete 1773 files (6.54 MB) and 126 folders

  Removing files…
  ✔ Files removed
  
  Removing directories…
  ✔ Directories removed
`,
  {
    alias: {
      f: 'force',
      l: 'prune-license',
      d: 'directory',
    },
  }
);

const force = !!cli.flags.force;
const pruneLicense = !!cli.flags.pruneLicense;
const directory = cli.flags.directory || '';

// eslint-disable-next-line no-console
const log = str => console.log(str);

log('Scanning node_modules…\n');

nmPrune.prep(process.cwd(), { pruneLicense, directory, }).then(info =>
  new Promise((resolve) => {
    log(`Pruning ${info.modulePath}`);
    if (info.usingCustomPrune) {
      log(`Using custom prune: ${info.prunePath}`);
    }
    const q = `Delete ${info.fileCount} files (${prettyBytes(info.size)}) and ${
      info.dirCount
    } folders`;
    if (force) {
      log(q);
      return resolve(true);
    }
    const question = new Confirm(q);
    return question.ask(resolve);
  }).then((doDelete) => {
    if (!doDelete) {
      log('Ok, nothing has changed');
      return null;
    }
    log('\nRemoving files…');
    return Promise.all(info.files.map(fullPath => fs.remove(fullPath)))
      .then(() => {
        log('✔ Files removed\n');
        log('Removing directories…');
        return Promise.all(info.dirs.map(fullPath => fs.remove(fullPath)));
      })
      .then(() => {
        log('✔ Directories removed');
      })
      .catch(e => log(e));
  }));
