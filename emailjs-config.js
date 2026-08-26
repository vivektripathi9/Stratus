/**
 * Central EmailJS configuration for the static Stratus site.
 * EmailJS public keys are intended for client-side use.
 *
 * On Vercel (static HTML), set these same values in the Vercel dashboard
 * for documentation parity; this file is the runtime source of truth.
 * Local reference: see .env.local (not committed).
 */
(function (global) {
  "use strict";

  var config = {
    serviceId: "service_9ztuvae",
    templateId: "template_cwq2psl",
    publicKey: "_JgxLeA4jeBlqIKrT",
  };

  global.STRATUS_EMAILJS = Object.freeze(config);
})(typeof window !== "undefined" ? window : globalThis);
