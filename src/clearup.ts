import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit, SKIP } from 'unist-util-visit';
import { Node } from 'unist';

// Define the image node type
interface ImageNode extends Node {
  type: 'image';
  url: string;
  alt?: string;
}

// Define the parent node type
interface ParentNode extends Node {
  type: string;
  children: Node[];
}

function cleanMarkdownWithRemark(markdownContent: string): string {
  const processor = unified()
    .use(remarkParse) // 解析 Markdown 為 AST
    .use(() => (tree) => {
      // 選擇性地移除圖像節點
      visit(tree, 'image', (node: ImageNode, index, parent: ParentNode | null) => {
        // 檢查圖像 URL 是否為 base64 格式
        if (node.url.startsWith('data:image')) {
          if (parent && index !== null) {
            // 創建一個替代的文字節點
            const replacementNode = {
              type: 'text',
              value: `[${node.alt || ''} (base64 image removed)]`
            };
            
            // 用替代節點替換 base64 圖像節點
            parent.children.splice(index, 1, replacementNode);
            return [SKIP, index + 1];
          }
        }
        // 對於外部連結圖像，保持不變
      });
    })
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      listItemIndent: 'one',
    });
  
  const result = processor.processSync(markdownContent);
  return String(result);
}

export { cleanMarkdownWithRemark };