(function bootstrapStarVault() {
  if (window.__STARVAULT_BOOTSTRAPPED__) {
    return;
  }
  window.__STARVAULT_BOOTSTRAPPED__ = true;

  const runtimeScripts = [
    ["domain", "core"],
    ["indexeddb", "storage"],
    ["local", "api"],
    ["app"]
  ];

  // GitHub Pages serves the app from /<repository>/ instead of the domain
  // root, so runtime assets must resolve against the document base URL.
  function runtimePath(parts) {
    const fileName = `${parts.join("-")}.js`;
    try {
      return new URL(fileName, document.baseURI).href;
    } catch {
      return fileName;
    }
  }

  function showBootFailure(error) {
    const message = document.createElement("p");
    message.className = "boot-error";
    message.textContent = `应用脚本加载失败，请刷新页面重试。${error?.message || ""}`;
    document.body.appendChild(message);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(src));
      document.head.appendChild(script);
    });
  }

  async function loadRuntime() {
    document.documentElement.dataset.runtime = "loading";
    for (const parts of runtimeScripts) {
      await loadScript(runtimePath(parts));
    }
    document.documentElement.dataset.runtime = "ready";
  }

  loadRuntime().catch((error) => {
    document.documentElement.dataset.runtime = "failed";
    showBootFailure(error);
  });
})();
