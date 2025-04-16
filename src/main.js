import './style.css';
import { WebContainer } from '@webcontainer/api';
import { files } from './files';
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import * as monaco from 'monaco-editor';
import jsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';


/** @type {import('@webcontainer/api').WebContainer}  */
let webcontainerInstance;

self.MonacoEnvironment = {
  getWorker: function (workerId, label) {
      switch (label) {
          case 'typescript':
          case 'javascript':
              return jsWorker();
          default:
              return editorWorker();
      }
  }
};


const editor = monaco.editor.create(document.getElementById('editor'), {
	value: 'module Main\n\nprint ("Hello, Grain!")',
	language: 'grain'
});

/** @param {string} content*/

async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile('/main.gr', content);
};


async function writeMainGrain() {
  await webcontainerInstance.fs.writeFile('/main.gr', editor.getValue());
};

/**
 * @param {Terminal} terminal
 */
async function installDependencies(terminal) {
  // Install dependencies
  const installProcess = await webcontainerInstance.spawn('npm', ['install']);

  installProcess.output.pipeTo(new WritableStream({
    write(data) {
      terminal.write(data);
    }
  }));
  // Wait for install command to exit
  return installProcess.exit;
}

/**
 * @param {Terminal} terminal
 */
async function startDevServer(terminal) {
  // Run `npm run start` to start the Express app
  const runProcess = await webcontainerInstance.spawn('npm', ['run', 'start']);

  runProcess.output.pipeTo(new WritableStream({
    write(data) {
      terminal.write(data);
    }
  }));

  // Wait for `server-ready` event
  // webcontainerInstance.on('server-ready', (port, url) => {
  //   iframeEl.src = url;
  // });
}

/**
 * @param {Terminal} terminal
 */
async function startShell(terminal) {
  const shellProcess = await webcontainerInstance.spawn('jsh',{
      terminal: {
        cols: terminal.cols,
        rows: terminal.rows,
      },
    }
  );
  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  const input = shellProcess.input.getWriter();
  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
};

async function compileAndRun() {

  writeMainGrain();

  let output="Compiling...";

  console.log("compiling");

  iframeEl.value = output;

  const compileProcess = await webcontainerInstance.spawn('node', ['./bin/grainc.js','--stdlib', './node_modules/@grain/stdlib', 'main.gr']);

  let compilerOutput = "";

  compileProcess.output.pipeTo(new WritableStream({
    write(data) {
      console.log(data);
      compilerOutput = compilerOutput + data;
    }
  }));

  const compilerRes =await compileProcess.exit;
  console.log(compilerRes);

  console.log("compilerOutput",compilerOutput);


  if (compilerRes === 0) {


    output = "";

    const runProcess = await webcontainerInstance.spawn('wasm', [ 'main.wasm']);

    runProcess.output.pipeTo(new WritableStream({
      write(data) {
        console.log(data);
        output = output + data;
        iframeEl.value = output;
      }
    }));
  } else {
    output = compilerOutput;
    iframeEl.value = compilerOutput;
  }

}


window.addEventListener('load', async () => {
  // textareaEl.value = files['main.gr'].file.contents;

  // textareaEl.addEventListener('input', (e) => {
  //   writeIndexJS(e.currentTarget.value);
  // });

  const fitAddon = new FitAddon();


  const terminal = new Terminal({
    convertEol: true,
  });
  terminal.loadAddon(fitAddon);

  terminal.open(terminalEl);
  fitAddon.fit();

  const snapshotResponse = await fetch('/snap.bin');
  const snapshot = await snapshotResponse.arrayBuffer();

  // Call only once
  console.log("Booting web container");
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(snapshot);

  // const packageJSON = await webcontainerInstance.fs.readFile('package.json', 'utf-8');
  // console.log(packageJSON);

  // const exitCode = await installDependencies(terminal);
  // if (exitCode !== 0) {
  //   throw new Error('Installation failed');
  // };

  // startDevServer(terminal);

  // Wait for `server-ready` event
  // webcontainerInstance.on('server-ready', (port, url) => {
  //   iframeEl.src = url;
  // });

 
  compileAndRun();
 

  const shellProcess = await startShell(terminal);
  window.addEventListener('resize', () => {
    fitAddon.fit();
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows,
    });
  });

});



// document.querySelector('#app').innerHTML = `
//   <div class="container">
//     <div class="editor">
//       <textarea id="editortext">I am a textarea</textarea>
//     </div>
//     <div class="preview">
//       <textarea id="preview">Compiling...
//       </textarea>
//     </div>
//   </div>
//   <button onClick="compileAndRun">Compile Run</button>
//   <div class="terminal"></div>

// `


/** @type {HTMLIFrameElement | null} */
const iframeEl = document.querySelector('#preview');

// /** @type {HTMLTextAreaElement | null} */
// const textareaEl = document.querySelector('#editortext');

/** @type {HTMLTextAreaElement | null} */
const terminalEl = document.querySelector('.terminal');

document.querySelector('#compilebutton').addEventListener("click", compileAndRun)

