import Parser, { Query } from "@keqingmoe/tree-sitter";
import type {
  TextlintMessage,
  TextlintPluginOptions,
  TextlintPluginPostProcessResult,
  TextlintPluginPreProcessResult,
  TextlintPluginProcessor,
} from "@textlint/types";
import KotlinLanguage from "tree-sitter-kotlin";
import { convertToTextlintAst } from "./comment.js";

// KDocコメントを抽出するクエリ
// マルチラインコメントを全て取得し、後でKDocかどうかをフィルタリング
const KDOC_QUERY = `
; マルチラインコメント（/** */ を含む）
(multiline_comment) @comment
`;

export class KDocProcessor implements TextlintPluginProcessor {
  options: TextlintPluginOptions;
  private readonly parser: Parser;
  private readonly query: Query;

  constructor(options: TextlintPluginOptions = {}) {
    this.options = options;
    this.parser = new Parser();
    this.parser.setLanguage(KotlinLanguage);
    this.query = new Query(KotlinLanguage, KDOC_QUERY);
  }

  availableExtensions(): Array<string> {
    return [".kt", ".kts"];
  }

  processor(_extension: string): {
    preProcess(
      text: string,
      filePath?: string,
    ): TextlintPluginPreProcessResult | Promise<TextlintPluginPreProcessResult>;
    postProcess(
      messages: Array<TextlintMessage>,
      filePath?: string,
    ):
      | TextlintPluginPostProcessResult
      | Promise<TextlintPluginPostProcessResult>;
  } {
    const parser = this.parser;
    const query = this.query;

    return {
      preProcess(
        text: string,
        _filePath?: string,
      ): TextlintPluginPreProcessResult {
        // Kotlinソースコードをパース
        const tree = parser.parse(text);
        const rootNode = tree.rootNode;

        // クエリを実行してコメントノードを取得
        const captures = query.captures(rootNode);

        // キャプチャされたノードを抽出（重複を除去）
        const seenNodes = new Set<number>();
        const commentNodes = captures
          .map((capture) => capture.node)
          .filter((node) => {
            // startIndexで重複をチェック
            if (seenNodes.has(node.startIndex)) {
              return false;
            }
            seenNodes.add(node.startIndex);
            return true;
          })
          // 出現順にソート
          .sort((a, b) => a.startIndex - b.startIndex);

        // textlint ASTに変換
        return convertToTextlintAst(commentNodes, text);
      },

      postProcess(
        messages: Array<TextlintMessage>,
        filePath?: string,
      ): TextlintPluginPostProcessResult {
        return {
          messages,
          filePath: filePath ?? "<kotlin>",
        };
      },
    };
  }
}
