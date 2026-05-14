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
