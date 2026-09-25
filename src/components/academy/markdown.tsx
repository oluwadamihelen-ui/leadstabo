import Link from "next/link";
import { Fragment } from "react";

// Minimal, XSS-safe markdown renderer for lesson content (no raw HTML).
function inline(text: string, key: string) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith("**")) parts.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) parts.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/) ?? [];
      parts.push(
        href?.startsWith("/") ? (
          <Link key={k} href={href} className="text-primary hover:underline">
            {label}
          </Link>
        ) : (
          <a key={k} href={href} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">
            {label}
          </a>
        ),
      );
    } else parts.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const k = `b${i}`;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(<h3 key={k}>{inline(line.slice(4), k)}</h3>);
      i++;
    } else if (line.startsWith("## ")) {
      out.push(<h2 key={k}>{inline(line.slice(3), k)}</h2>);
      i++;
    } else if (line.startsWith("> ")) {
      out.push(<blockquote key={k}>{inline(line.slice(2), k)}</blockquote>);
      i++;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i])) rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      out.push(
        <div key={k} className="my-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {rows[0]?.map((c, j) => (
                  <th key={j} className="px-3 py-2 text-left font-medium">
                    {inline(c, `${k}h${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((r, ri) => (
                <tr key={ri} className="border-t">
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-2 text-foreground/85">
                      {inline(c, `${k}${ri}${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) {
        items.push(lines[i].replace(/^(- |\d+\. )/, ""));
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      out.push(
        <Tag key={k}>
          {items.map((it, j) => {
            const check = it.match(/^\[( |x)\] (.*)/);
            return (
              <li key={j} className={check ? "list-none -ml-5" : undefined}>
                {check ? (
                  <Fragment>
                    <span className={check[1] === "x" ? "text-success" : "text-muted-foreground"}>{check[1] === "x" ? "✓" : "○"}</span> {inline(check[2], `${k}${j}`)}
                  </Fragment>
                ) : (
                  inline(it, `${k}${j}`)
                )}
              </li>
            );
          })}
        </Tag>,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#|>|\||- |\d+\. )/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      out.push(<p key={k}>{inline(para.join(" "), k)}</p>);
    }
  }
  return <div className="prose-lesson">{out}</div>;
}
