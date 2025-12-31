import assert from "node:assert";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type {
  TxtDocumentNode,
  TxtParagraphNode,
} from "@textlint/ast-node-types";
import { test as testAst } from "@textlint/ast-tester";
import { KDocProcessor } from "./KDocProcessor.js";

const __filename = fileURLToPath(import.meta.url);

describe(__filename, () => {
  describe("KDocProcessor", () => {
    describe("availableExtensions", () => {
      it("returns .kt and .kts extensions", () => {
        const processor = new KDocProcessor();
        assert.deepStrictEqual(processor.availableExtensions(), [
          ".kt",
          ".kts",
        ]);
      });
    });

    describe("processor", () => {
      describe("preProcess", () => {
        it("returns valid textlint AST for KDoc comments", () => {
          const processor = new KDocProcessor();
          const { preProcess } = processor.processor(".kt");

          const result = preProcess(
            `
            /**
             * This is a hello world function
             */
            fun main() {
                println("Hello, world!")
            }
            `,
          ) as TxtDocumentNode;

          assert.strictEqual(result.type, "Document");
          assert.strictEqual(result.children.length, 1);

          const firstChild = result.children[0] as TxtParagraphNode;
          assert.strictEqual(firstChild.type, "Paragraph");
          assert.strictEqual(firstChild.children.length, 1);

          assert.doesNotThrow(() => {
            testAst(result as unknown as Record<string, unknown>);
          });
        });

        it("handles multiple KDoc comments", () => {
          const processor = new KDocProcessor();
          const { preProcess } = processor.processor(".kt");

          const result = preProcess(
            `
            /**
             * First function doc.
             */
            fun first() {}
            
            /**
             * Second function doc.
             */
            fun second() {}
            `,
          ) as TxtDocumentNode;

          assert.strictEqual(result.type, "Document");
          // 2つの別々のParagraphになるはず
          assert.strictEqual(result.children.length, 2);

          assert.doesNotThrow(() => {
            testAst(result as unknown as Record<string, unknown>);
          });
        });

        it("ignores regular comments", () => {
          const processor = new KDocProcessor();
          const { preProcess } = processor.processor(".kt");

          const result = preProcess(
            `
            // This is a regular comment.
            fun main() {
                // Another regular comment.
            }
            `,
          ) as TxtDocumentNode;

          assert.strictEqual(result.type, "Document");
          // 通常コメントは除外されるので、childrenは空
          assert.strictEqual(result.children.length, 0);

          assert.doesNotThrow(() => {
            testAst(result as unknown as Record<string, unknown>);
          });
        });

        it("ignores regular block comments", () => {
          const processor = new KDocProcessor();
          const { preProcess } = processor.processor(".kt");

          const result = preProcess(
            `
            /* This is a regular block comment. */
            fun main() {}
            `,
          ) as TxtDocumentNode;

          assert.strictEqual(result.type, "Document");
          // 通常ブロックコメントは除外されるので、childrenは空
          assert.strictEqual(result.children.length, 0);

          assert.doesNotThrow(() => {
            testAst(result as unknown as Record<string, unknown>);
          });
        });

        it("ignores triple-asterisk comments", () => {
          const processor = new KDocProcessor();
          const { preProcess } = processor.processor(".kt");

          const result = preProcess(
            `
            /*** This is not a KDoc comment. ***/
            fun main() {}
            `,
          ) as TxtDocumentNode;

          assert.strictEqual(result.type, "Document");
          // /*** で始まるコメントはKDocではないので除外
          assert.strictEqual(result.children.length, 0);

          assert.doesNotThrow(() => {
            testAst(result as unknown as Record<string, unknown>);
          });
        });

        it("handles KDoc with tags", () => {
          const processor = new KDocProcessor();
          const { preProcess } = processor.processor(".kt");

          const result = preProcess(
            `
            /**
             * Adds two numbers together.
             *
             * @param a The first number.
             * @param b The second number.
             * @return The sum of a and b.
             */
            fun add(a: Int, b: Int): Int = a + b
            `,
          ) as TxtDocumentNode;

          assert.strictEqual(result.type, "Document");
          assert.strictEqual(result.children.length, 1);

          assert.doesNotThrow(() => {
            testAst(result as unknown as Record<string, unknown>);
          });
        });
      });

      describe("postProcess", () => {
        it("returns messages and filePath", () => {
          const processor = new KDocProcessor();
          const { postProcess } = processor.processor(".kt");

          const result = postProcess([], "test.kt") as {
            messages: unknown[];
            filePath: string;
          };

          assert.deepStrictEqual(result.messages, []);
          assert.strictEqual(result.filePath, "test.kt");
        });

        it("uses default filePath when not provided", () => {
          const processor = new KDocProcessor();
          const { postProcess } = processor.processor(".kt");

          const result = postProcess([]) as {
            messages: unknown[];
            filePath: string;
          };

          assert.strictEqual(result.filePath, "<kotlin>");
        });
      });
    });
  });
});
