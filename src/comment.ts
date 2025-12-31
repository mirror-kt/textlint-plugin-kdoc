import type { SyntaxNode } from "@keqingmoe/tree-sitter";
import {
  ASTNodeTypes,
  type TxtDocumentNode,
  type TxtParagraphNode,
  type TxtStrNode,
} from "@textlint/ast-node-types";

// ============================================
// KDoc (Kotlin) 用の変換関数
// ============================================

/**
 * KDocコメントかどうかを判定
 * KDocは `/**` で始まり `/***` では始まらないマルチラインコメント
 *
 * @param text - コメントの生テキスト
 * @returns KDocコメントの場合true
 */
function isKdoc(text: string): boolean {
  return text.startsWith("/**") && !text.startsWith("/***");
}

/**
 * KDocコメントからプレフィックスを除去してコンテンツを抽出
 *
 * @param text - コメントの生テキスト
 * @returns プレフィックス除去後のコンテンツとオフセット情報
 */
function extractKdocContent(text: string): {
  content: string;
  prefixLength: number;
} {
  // `/**` と `*/` を除去
  const inner = text.slice(3, -2);
  return {
    content: processKdocBlockContent(inner),
    prefixLength: 3,
  };
}

/**
 * KDocブロックコメントの内容を処理
 * 各行の先頭の ` * ` パターンを除去
 *
 * @param content - ブロックコメントの内部コンテンツ
 * @returns 処理後のコンテンツ
 */
function processKdocBlockContent(content: string): string {
  const lines = content.split("\n");
  return lines
    .map((line) => {
      // 行頭の空白と `*` を除去
      return line.replace(/^\s*\*\s?/, "");
    })
    .join("\n")
    .trim();
}

/**
 * tree-sitterのSyntaxNodeからtextlintのTxtStrNodeを生成（KDoc用）
 *
 * @param node - tree-sitterのSyntaxNode
 * @returns TxtStrNode
 */
function createKdocStrNode(node: SyntaxNode): TxtStrNode {
  const { content, prefixLength } = extractKdocContent(node.text);

  // プレフィックス分だけ開始位置をずらす
  const startColumn = node.startPosition.column + prefixLength;
  const startIndex = node.startIndex + prefixLength;

  return {
    type: ASTNodeTypes.Str,
    raw: content,
    value: content,
    range: [startIndex, node.endIndex],
    loc: {
      start: {
        line: node.startPosition.row + 1, // textlintは1-indexed
        column: startColumn,
      },
      end: {
        line: node.endPosition.row + 1,
        column: node.endPosition.column,
      },
    },
  };
}

/**
 * KDocコメントノードからParagraphノードを生成
 *
 * @param node - SyntaxNode
 * @returns TxtParagraphNode または null
 */
function createKdocParagraphNode(node: SyntaxNode): TxtParagraphNode | null {
  if (!isKdoc(node.text)) return null;

  const strNode = createKdocStrNode(node);

  return {
    type: ASTNodeTypes.Paragraph,
    raw: node.text,
    range: [strNode.range[0], strNode.range[1]],
    loc: {
      start: strNode.loc.start,
      end: strNode.loc.end,
    },
    children: [strNode],
  };
}

/**
 * tree-sitterのKDocコメントノード配列をtextlint ASTのDocumentノードに変換
 *
 * @param commentNodes - コメントを含むSyntaxNodeの配列
 * @param rawText - 元のソースコード全体
 * @returns TxtDocumentNode
 */
export function convertToTextlintAst(
  commentNodes: SyntaxNode[],
  rawText: string,
): TxtDocumentNode {
  // KDocコメントのみをフィルタリング
  const kdocNodes = commentNodes.filter((node) => isKdoc(node.text));

  // 各KDocをParagraphノードに変換
  const children = kdocNodes
    .map((kdocNode) => createKdocParagraphNode(kdocNode))
    .filter((paragraph) => paragraph != null);

  // Documentノードを生成
  const firstChild = children.at(0);
  const lastChild = children.at(-1);

  if (firstChild === undefined || lastChild === undefined) {
    return {
      type: ASTNodeTypes.Document,
      raw: rawText,
      range: [0, rawText.length],
      loc: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 0 },
      },
      children: [],
    };
  }

  return {
    type: ASTNodeTypes.Document,
    raw: rawText,
    range: [firstChild.range[0], lastChild.range[1]],
    loc: {
      start: firstChild.loc.start,
      end: lastChild.loc.end,
    },
    children,
  };
}

// KDoc用のユーティリティ関数をエクスポート
export { isKdoc, extractKdocContent };
