import { snapshot } from '@webcontainer/snapshot';

import fs from 'node:fs';

const sourceSnapshot = await snapshot("./snapshot");


fs.writeFile('public/snap.bin', sourceSnapshot, err => {
    if (err) {
      console.error(err);
    } else {
      // file written successfully
    }
  });