(function () {
  function showCopied(el) {
    el.classList.add("copied");
    window.setTimeout(function () {
      el.classList.remove("copied");
    }, 1200);
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text, btn) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        if (btn) {
          btn.textContent = "Copied!";
          setTimeout(function () { btn.textContent = "Copy"; }, 2000);
        }
      }).catch(function () {
        if (legacyCopy(text) && btn) {
          btn.textContent = "Copied!";
          setTimeout(function () { btn.textContent = "Copy"; }, 2000);
        }
      });
    } else if (legacyCopy(text) && btn) {
      btn.textContent = "Copied!";
      setTimeout(function () { btn.textContent = "Copy"; }, 2000);
    }
  }

  function setupPreBlocks() {
    var pres = document.querySelectorAll("article.prose pre, pre.shiki");
    pres.forEach(function (pre) {
      if (pre.dataset.hasCopyBtn) return;
      pre.dataset.hasCopyBtn = "true";
      pre.classList.add("relative", "group");

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy-btn absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-zinc-800/90 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60 shadow-sm z-10";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code block");

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var code = pre.querySelector("code");
        var text = code ? code.textContent : pre.textContent;
        copyText(text, btn);
      });

      pre.appendChild(btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupPreBlocks);
  } else {
    setupPreBlocks();
  }

  function copy(el) {
    var text = el.textContent || "";
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showCopied(el);
      }).catch(function () {
        if (legacyCopy(text)) showCopied(el);
      });
    } else if (legacyCopy(text)) {
      showCopied(el);
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.nodeType === 1 && t.matches && t.matches("code.inline-copy")) {
      copy(t);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var t = e.target;
    if (t && t.nodeType === 1 && t.matches && t.matches("code.inline-copy")) {
      e.preventDefault();
      copy(t);
    }
  });
})();
