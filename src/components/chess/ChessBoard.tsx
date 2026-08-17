import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Marker, Path, Polygon } from "react-native-svg";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Piece artwork traced from the "cburnett" SVG chess set (CC BY-SA 3.0,
// the same set Lichess uses) rather than Unicode chess glyphs: glyph
// rendering is font-dependent (the "white" piece codepoints render as
// near-invisible hollow outlines in most Android fonts) and a hand-drawn
// simplified silhouette looked noticeably worse than a real piece set.
const PIECE_PATHS: Record<string, React.ReactNode> = {
  K: (
    <G fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
      <Path strokeLinejoin="miter" d="M22.5 11.63V6M20 8h5" />
      <Path fill="#fff" strokeLinecap="butt" strokeLinejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
      <Path fill="#fff" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" />
      <Path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" />
    </G>
  ),
  k: (
    <G fill="none" fillRule="evenodd" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22.5 11.63V6" stroke="#000" strokeLinejoin="miter" />
      <Path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" strokeLinecap="butt" strokeLinejoin="miter" />
      <Path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4v3.5-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="#000" />
      <Path d="M20 8h5" stroke="#000" strokeLinejoin="miter" />
      <Path d="M32 29.5s8.5-4 6-9.65C34.15 14 25 18 22.5 24.5v2.1-2.1C20 18 10.85 14 6.97 19.85c-2.47 5.65 6 9.65 6 9.65" fill="none" stroke="#fff" />
      <Path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" fill="none" stroke="#fff" />
    </G>
  ),
  Q: (
    <G fill="#fff" stroke="#000" strokeWidth={1.5} strokeLinejoin="round">
      <Path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1L25.5 24.5 22.5 10l-3 14.5-5.7-14.1L14 25 6.5 13.5 9 26z" />
      <Path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
      <Path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" />
      <Circle cx="6" cy="12" r="2" />
      <Circle cx="14" cy="9" r="2" />
      <Circle cx="22.5" cy="8" r="2" />
      <Circle cx="31" cy="9" r="2" />
      <Circle cx="39" cy="12" r="2" />
    </G>
  ),
  q: (
    <G fill="#000" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1L25.5 24.5 22.5 10l-3 14.5-5.7-14.1L14 25 6.5 13.5 9 26z" strokeLinecap="butt" />
      <Path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
      <Path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" />
      <Circle cx="6" cy="12" r="2" />
      <Circle cx="14" cy="9" r="2" />
      <Circle cx="22.5" cy="8" r="2" />
      <Circle cx="31" cy="9" r="2" />
      <Circle cx="39" cy="12" r="2" />
      <Path d="M11 38.5a35 35 1 0 0 23 0" fill="none" strokeLinecap="butt" />
      <G fill="none" stroke="#fff">
        <Path d="M11 29a35 35 1 0 1 23 0" />
        <Path d="M12.5 31.5h20" />
        <Path d="M11.5 34.5a35 35 1 0 0 22 0" />
        <Path d="M10.5 37.5a35 35 1 0 0 24 0" />
      </G>
    </G>
  ),
  R: (
    <G fill="#fff" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 39h27v-3H9v3z" strokeLinecap="butt" />
      <Path d="M12 36v-4h21v4H12z" strokeLinecap="butt" />
      <Path d="M11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
      <Path d="M34 14l-3 3H14l-3-3" />
      <Path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter" />
      <Path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
      <Path d="M11 14h23" fill="none" stroke="#000" strokeLinejoin="miter" />
    </G>
  ),
  r: (
    <G fill="#000" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 39h27v-3H9v3z" strokeLinecap="butt" />
      <Path d="M12.5 32l1.5-2.5h17l1.5 2.5h-20z" strokeLinecap="butt" />
      <Path d="M12 36v-4h21v4H12z" strokeLinecap="butt" />
      <Path d="M14 29.5v-13h17v13H14z" strokeLinecap="butt" strokeLinejoin="miter" />
      <Path d="M14 16.5L11 14h23l-3 2.5H14z" strokeLinecap="butt" />
      <Path d="M11 14V9h4v2h5V9h5v2h5V9h4v5H11z" strokeLinecap="butt" />
      <G fill="none" stroke="#fff" strokeWidth={1} strokeLinejoin="miter">
        <Path d="M12 35.5h21" />
        <Path d="M13 31.5h19" />
        <Path d="M14 29.5h17" />
        <Path d="M14 16.5h17" />
        <Path d="M11 14h23" />
      </G>
    </G>
  ),
  N: (
    <G fill="none" fillRule="evenodd" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff" stroke="#000" />
      <Path
        d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4-1-4-6 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"
        fill="#fff"
        stroke="#000"
      />
      <Circle cx="9" cy="25.5" r="0.5" fill="#000" stroke="#000" />
      <Circle cx="15" cy="15.5" r="0.5" fill="#000" stroke="#000" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" />
    </G>
  ),
  n: (
    <G fill="none" fillRule="evenodd" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000" stroke="#000" />
      <Path
        d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4-1-4-6 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"
        fill="#000"
        stroke="#000"
      />
      <Circle cx="9" cy="25.5" r="0.5" fill="#fff" stroke="#fff" />
      <Circle cx="15" cy="15.5" r="0.5" fill="#fff" stroke="#fff" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" />
      <Path
        d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75 2.25 4.26 3.25 10.31 2.75 20.25l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z"
        fill="#fff"
        stroke="none"
      />
    </G>
  ),
  B: (
    <G fill="none" fillRule="evenodd" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <G fill="#fff" stroke="#000" strokeLinecap="butt">
        <Path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
        <Path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
        <Circle cx="22.5" cy="8" r="2.5" />
      </G>
      <Path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#000" strokeLinejoin="miter" />
    </G>
  ),
  b: (
    <G fill="none" fillRule="evenodd" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <G fill="#000" stroke="#000" strokeLinecap="butt">
        <Path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
        <Path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
        <Circle cx="22.5" cy="8" r="2.5" />
      </G>
      <Path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#fff" strokeLinejoin="miter" />
    </G>
  ),
  P: (
    <Path
      d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
      fill="#fff"
      stroke="#000"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  ),
  p: (
    <Path
      d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
      fill="#000"
      stroke="#000"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  ),
};

function PieceIcon({ type, size }: { type: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      {PIECE_PATHS[type]}
    </Svg>
  );
}

function parseFenBoard(fen: string): (string | null)[][] {
  const placement = fen.split(" ")[0];
  const rows = placement.split("/");
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

function squareToCoords(square: string, orientation: "white" | "black", size: number): { x: number; y: number } {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 7 - rank : rank;
  return { x: col * size + size / 2, y: row * size + size / 2 };
}

export interface SquareHighlight {
  square: string;
  color: string;
}

export interface BoardArrow {
  from: string;
  to: string;
  color: string;
}

export function ChessBoard({
  fen,
  orientation = "white",
  size = 320,
  highlights = [],
  arrow,
  lightSquare = "#eeeed2",
  darkSquare = "#769656",
}: {
  fen: string;
  orientation?: "white" | "black";
  size?: number;
  highlights?: SquareHighlight[];
  arrow?: BoardArrow | null;
  lightSquare?: string;
  darkSquare?: string;
}) {
  const squareSize = size / 8;
  const board = parseFenBoard(fen);
  const highlightMap = new Map(highlights.map((h) => [h.square, h.color]));

  const displayRows = orientation === "white" ? board : [...board].reverse();

  return (
    <View style={[st.wrap, { width: size, height: size, backgroundColor: darkSquare }]}>
      {displayRows.map((row, rIdx) => {
        const rank = orientation === "white" ? 8 - rIdx : rIdx + 1;
        const displayCells = orientation === "white" ? row : [...row].reverse();
        return (
          <View key={rIdx} style={{ flexDirection: "row" }}>
            {displayCells.map((piece, cIdx) => {
              const file = orientation === "white" ? cIdx : 7 - cIdx;
              const square = `${FILES[file]}${rank}`;
              // `file` is 0-indexed (a=0) but `rank` is 1-indexed, so a dark
              // square is odd parity, not even: a1 = 0+1 = dark, h1 = 7+1 = light.
              const isDark = (file + rank) % 2 === 1;
              const highlight = highlightMap.get(square);
              return (
                <View
                  key={square}
                  style={{
                    width: squareSize,
                    height: squareSize,
                    backgroundColor: highlight ?? (isDark ? darkSquare : lightSquare),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {piece && (
                    <PieceIcon type={piece} size={squareSize * 0.86} />
                  )}
                </View>
              );
            })}
          </View>
        );
      })}

      {arrow && (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Marker id="arrowhead" markerWidth="3.2" markerHeight="3.6" refX="1.6" refY="1.8" orient="auto">
              <Polygon points="0 0, 3.2 1.8, 0 3.6" fill={arrow.color} />
            </Marker>
          </Defs>
          {(() => {
            const from = squareToCoords(arrow.from, orientation, squareSize);
            const to = squareToCoords(arrow.to, orientation, squareSize);
            return (
              <Line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={arrow.color}
                strokeWidth={squareSize * 0.14}
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
              />
            );
          })()}
        </Svg>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    overflow: "hidden",
  },
});
