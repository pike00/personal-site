// Contact form submit handler. Serializes the form, attaches the Turnstile
// token, POSTs JSON to the /api/contact Pages Function, and reports status.
(function () {
  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = document.getElementById("contact-status");
  var submit = document.getElementById("contact-submit");

  function setStatus(msg, ok) {
    if (!status) return;
    status.textContent = msg;
    status.className =
      "text-sm " +
      (ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400");
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    setStatus("", true);

    var data = new FormData(form);
    var token = data.get("cf-turnstile-response");
    if (!token) {
      setStatus("Please complete the verification challenge.", false);
      return;
    }

    var payload = {
      name: data.get("name"),
      email: data.get("email"),
      message: data.get("message"),
      token: token,
    };

    submit.disabled = true;
    var original = submit.textContent;
    submit.textContent = "Sending...";

    try {
      var res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      var body = await res.json().catch(function () {
        return {};
      });
      if (res.ok && body.ok) {
        form.reset();
        setStatus("Thanks — your message has been sent.", true);
      } else {
        setStatus(body.error || "Something went wrong. Please try again.", false);
      }
    } catch (err) {
      setStatus("Network error. Please try again.", false);
    } finally {
      submit.disabled = false;
      submit.textContent = original;
      if (window.turnstile) window.turnstile.reset();
    }
  });
})();
