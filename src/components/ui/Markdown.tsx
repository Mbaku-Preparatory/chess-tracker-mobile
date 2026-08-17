import { Fragment, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

/**
 * The markdown Mbaku actually writes, rendered with React Native primitives.
 *
 * Answers were previously split on blank lines into plain <Text>, so every
 * `**bold**` and every table arrived on screen as its own source — raw
 * asterisks, raw pipes, and a header separator made of dashes. Mbaku reaches
 * for a table whenever it is asked for a list with numbers in it ("every
 * opening and the win rate" comes back with twenty-five rows), which is exactly
 * where the old rendering was least readable.
 *
 * Hand-rolled rather than a markdown library: the subset here is small and
 * known, and the alternative was a new dependency in the week we ship the first
 * store build. It covers paragraphs, headings, bullet and numbered lists,
 * bold/italic/code spans, and GFM tables — everything the assistant prompt can
 * produce. Anything it does not recognise falls through as plain text, which is
 * the safe direction to fail: unstyled prose, never lost words.
 */

type Block =
  | { kind: "p"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "table"; header: string[]; rows: string[][] };

const LIST_RE = /^\s*([-*+]|\d+\.)\s+/;
const HEADING_RE = /^#{1,6}\s+(.*)$/;

const isTableLine = (line: string) => line.trim().startsWith("|");

/** `|---|:--:|` — the row that turns the line above it into a header. */
function isDividerRow(line: string): boolean {
  if (!line || !isTableLine(line)) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // A table only starts where a divider row follows, so a lone line of prose
    // that happens to begin with "|" is not mistaken for one.
    if (isTableLine(line) && isDividerRow(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      blocks.push({ kind: "heading", text: heading[1] });
      i++;
      continue;
    }

    if (LIST_RE.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && LIST_RE.test(lines[i])) {
        items.push(lines[i].replace(LIST_RE, ""));
        i++;
      }
      blocks.push({ kind: "list", items, ordered });
      continue;
    }

    // Everything else runs together until a blank line or the start of another
    // block, so wrapped prose stays one paragraph.
    const start = i;
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isTableLine(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !LIST_RE.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }

    // A line can look like a block starter and still not parse as one — a table
    // whose divider row is missing is the case that actually happens. The loop
    // above then consumes nothing, and without this the outer loop spins on the
    // same index forever and takes the app down with it. Keep the line as prose
    // and always move on.
    if (i === start) {
      para.push(lines[i].trim());
      i++;
    }

    blocks.push({ kind: "p", text: para.join(" ") });
  }

  return blocks;
}

/** Bold, italic and code spans inside one line of text. */
function Inline({ text, color }: { text: string; color: string }) {
  // The ** alternative is listed first so it wins over the single-* one.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <Text key={i} style={{ fontWeight: "700", color }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <Text key={i} style={{ fontFamily: "monospace", fontSize: 13, color }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        if (
          ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) &&
          part.length > 2
        ) {
          return (
            <Text key={i} style={{ fontStyle: "italic", color }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

// The first column carries the long label (an opening name, a player); the rest
// are short numbers. Fixed widths inside a horizontal scroller beat flex here:
// wrapping "Sicilian: French Variation, Open (B40)" into a 90px column makes a
// five-line row.
const FIRST_COL_WIDTH = 180;
const COL_WIDTH = 76;

export function Markdown({ content }: { content: string }) {
  const t = useTheme();
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <Text key={i} style={{ fontSize: 14, fontWeight: "700", color: t.text }}>
              <Inline text={block.text} color={t.text} />
            </Text>
          );
        }

        if (block.kind === "list") {
          return (
            <View key={i} style={{ gap: 4 }}>
              {block.items.map((item, j) => (
                <View key={j} style={{ flexDirection: "row", gap: 8 }}>
                  <Text style={{ fontSize: 14, lineHeight: 21, color: t.textMuted }}>
                    {block.ordered ? `${j + 1}.` : "•"}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, color: t.text }}>
                    <Inline text={item} color={t.text} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.kind === "table") {
          const columns = Math.max(block.header.length, ...block.rows.map((r) => r.length));
          const widthFor = (c: number) => (c === 0 ? FIRST_COL_WIDTH : COL_WIDTH);

          return (
            <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={[st.row, { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
                  {Array.from({ length: columns }, (_, c) => (
                    <Text
                      key={c}
                      style={[st.cell, st.headerCell, { width: widthFor(c), color: t.text }]}
                    >
                      {block.header[c] ?? ""}
                    </Text>
                  ))}
                </View>
                {block.rows.map((row, r) => (
                  <View
                    key={r}
                    style={[st.row, { borderBottomColor: t.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
                  >
                    {Array.from({ length: columns }, (_, c) => (
                      <Text key={c} style={[st.cell, { width: widthFor(c), color: t.text }]}>
                        <Inline text={row[c] ?? ""} color={t.text} />
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }

        return (
          <Text key={i} style={{ fontSize: 14, lineHeight: 21, color: t.text }}>
            <Inline text={block.text} color={t.text} />
          </Text>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  cell: { paddingVertical: 6, paddingRight: 8, fontSize: 12, lineHeight: 17 },
  headerCell: { fontWeight: "700" },
});
