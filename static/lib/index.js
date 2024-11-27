import init, {
  apply_patch,
  generate_patch,
  init_library,
} from "/static/lib/secure-patch/secure-patch.js";

Error.stackTraceLimit = 100;

function download(data, filename) {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function initialize() {
  await init();
  init_library();
  const generate = document.getElementById("generate");
  const apply = document.getElementById("apply");
  const source = document.getElementById("source");
  const data = document.getElementById("data");

  const sourceDisplay = document.getElementById("source-display");
  const dataDisplay = document.getElementById("data-display");

  function handler(f) {
    return async (...args) => {
      try {
        await f(...args);
      } catch (e) {
        new Notify({
          status: "error",
          title: "Error",
          text: e.toString(),
          position: "top x-center",
        });
      }
    };
  }

  function setFileDisplay(file, display) {
    const reset = () => {
      display.textContent = "Click or Drag & drop";
    };

    file.addEventListener(
      "change",
      handler(() => {
        if (file.files.length === 0) {
          reset();
          return;
        }
        display.textContent = file.files[0].name;
      })
    );

    display.addEventListener(
      "click",
      handler(() => {
        file.click();
      })
    );

    display.addEventListener(
      "dragover",
      handler((e) => {
        e.preventDefault();
        display.classList.add("active");
      })
    );

    display.addEventListener(
      "dragleave",
      handler((e) => {
        e.preventDefault();
        display.classList.remove("active");
      })
    );

    display.addEventListener(
      "drop",
      handler((e) => {
        e.preventDefault();
        display.classList.remove("active");
        file.files = e.dataTransfer.files;
        file.dispatchEvent(new Event("change"));
      })
    );

    reset();
  }

  setFileDisplay(source, sourceDisplay);
  setFileDisplay(data, dataDisplay);

  function check() {
    const sourceFile = source.files[0];
    const dataFile = data.files[0];
    if (!sourceFile || !dataFile) {
      throw new Error("Please select both files");
    }
    return [sourceFile, dataFile];
  }

  generate.addEventListener(
    "click",
    handler(async () => {
      const [sourceFile, dataFile] = check();

      const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
      const dataBytes = new Uint8Array(await dataFile.arrayBuffer());

      let patch;
      try {
        patch = generate_patch(sourceBytes, dataBytes);
      } catch (e) {
        console.error(e);
        throw new Error(`Failed to generate patch...`);
      }

      // download
      download(patch, "patch.bin");
    })
  );

  apply.addEventListener(
    "click",
    handler(async () => {
      const [sourceFile, dataFile] = check();

      const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
      const patchBytes = new Uint8Array(await dataFile.arrayBuffer());

      let patched;
      try {
        patched = apply_patch(sourceBytes, patchBytes);
      } catch (e) {
        throw new Error(`Failed to apply patch. Is source or patch valid?`);
      }

      // download
      download(patched, `patched_${sourceFile.name}`);
    })
  );
}

window.onload = initialize;
