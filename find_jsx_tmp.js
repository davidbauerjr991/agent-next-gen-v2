const ts = require("typescript");
const fs = require("fs");
const path = "src/components/AgentNextGenPage.tsx";
const src = fs.readFileSync(path, "utf8");
const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function lineOf(pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1; // 1-indexed
}

let results = [];
function visit(node) {
  if (ts.isJsxElement(node)) {
    const openStartLine = lineOf(node.openingElement.getStart(sf));
    if (openStartLine === 12794) {
      results.push({
        openStart: openStartLine,
        openEnd: lineOf(node.openingElement.getEnd()),
        closeStart: lineOf(node.closingElement.getStart(sf)),
        closeEnd: lineOf(node.closingElement.getEnd()),
      });
    }
  }
  ts.forEachChild(node, visit);
}
visit(sf);
console.log(JSON.stringify(results, null, 2));
