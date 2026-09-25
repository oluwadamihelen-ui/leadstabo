// Converts the composer's lightweight formatting into email-safe HTML (client + server safe).
// Supported: **bold**, _italic_, [text](https://url), "- " bullets. Input is HTML-escaped first.

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatEmailHtml(text: string, rich: boolean) {
  const esc = escape(text);
  if (!rich) return esc.replace(/\*\*(.+?)\*\*/g, "$1").replace(/_(.+?)_/g, "$1").replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\s)_(.+?)_(?=\s|$|[.,!?])/g, "$1<em>$2</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener" class="text-info underline">$1</a>')
    .replace(/^- (.*)$/gm, "• $1");
}

/** Plain-text version of a formatted body (what text/plain recipients see). */
export function toPlainText(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)_(.+?)_(?=\s|$|[.,!?])/g, "$1$2").replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)");
}

/** Full HTML email body: formatted paragraphs, optional tracking pixel and link rewriting. */
export function buildEmailHtml(text: string, opts: { pixelUrl?: string; rewriteLink?: (url: string) => string } = {}) {
  let html = formatEmailHtml(text, true).replace(/ class="text-info underline"/g, "");
  if (opts.rewriteLink) html = html.replace(/href="(https?:\/\/[^"]+)"/g, (_, u: string) => `href="${escape(opts.rewriteLink!(u.replace(/&amp;/g, "&")))}"`);
  const body = html
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const pixel = opts.pixelUrl ? `<img src="${escape(opts.pixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">` : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#111">${body}${pixel}</div>`;
}
