import { Readability } from '@mozilla/readability';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';
import TurndownService from 'turndown';
import { JSDOM, VirtualConsole } from 'jsdom';
import { cleanMarkdownWithRemark } from './clearup';

// 配置TurndownService
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  linkStyle: 'inlined',  // 使用内联链接样式
  linkReferenceStyle: 'full',  // 使用完整引用样式
});

// 使用GitHub风格的Markdown扩展
turndownService.use(gfm);

// 重写转义函数，完全禁用转义
turndownService.escape = function(string) {
  // 不转义任何字符，保持原始格式
  return string;
};

// 自定义链接规则，确保正确格式化
turndownService.addRule('links', {
  filter: ['a'],
  replacement: function(content, node) {
    const href = (node as HTMLAnchorElement).getAttribute('href') || '';
    const title = (node as HTMLAnchorElement).title;
    
    if (href === '') {
      return content;
    }
    
    // 清理URL中的转义字符
    const cleanHref = href.replace(/\\(.)/g, '$1');
    const cleanContent = content.replace(/\\(.)/g, '$1');
    
    // 标准Markdown链接格式
    return title
      ? `[${cleanContent}](${cleanHref} "${title}")`
      : `[${cleanContent}](${cleanHref})`;
  }
});

// 添加对复选框的特殊处理
turndownService.addRule('checkbox', {
  filter: function(node) {
    return (
      node.nodeName === 'INPUT' &&
      node.getAttribute('type') === 'checkbox'
    );
  },
  replacement: function(content, node) {
    const isChecked = (node as HTMLInputElement).checked;
    return isChecked ? '[x] ' : '[ ] ';
  }
});

turndownService.addRule('fenceAllPreformattedText', {
  filter: ['pre'],

  replacement: function (content, node) {
    const ext = getExt(node);

    const code = [...node.childNodes]
      .map(c => c.textContent)
      .join('');

    return `\n\`\`\`${ext}\n${code}\n\`\`\`\n\n`;
  }
});

turndownService.addRule('strikethrough', {
  filter: ['del', 's'],

  replacement: function (content) {
    return '~' + content + '~';
  }
});

const getExt = (node: any) => {
  // Simple match where the <pre> has the `highlight-source-js` tags
  const getFirstTag = (node: Element) =>
    node.outerHTML.split('>').shift()! + '>';

  const match = node.outerHTML.match(
    /(highlight-source-|language-)[a-z]+/
  );

  if (match) return match[0].split('-').pop();

  // Check the parent just in case
  const parent = getFirstTag(node.parentNode!).match(
    /(highlight-source-|language-)[a-z]+/
  );

  if (parent) return parent[0].split('-').pop();

  const getInnerTag = (node: Element) =>
    node.innerHTML.split('>').shift()! + '>';

  const inner = getInnerTag(node).match(
    /(highlight-source-|language-)[a-z]+/
  );

  if (inner) return inner[0].split('-').pop();

  // Nothing was found...
  return ''
}

function extract_from_dom(dom: JSDOM): [title: string, markdown: string] {
  // 预处理HTML内容，修复链接格式问题
  const document = dom.window.document;
  const links = document.querySelectorAll('a');
  
  // 处理所有链接，确保它们的格式正确
  links.forEach(link => {
    // 如果链接没有文本内容但有href，添加文本内容
    if ((link.textContent || '').trim() === '' && link.getAttribute('href')) {
      link.textContent = link.getAttribute('href') || '';
    }
    
    // 确保链接的href属性不包含转义字符
    if (link.getAttribute('href')) {
      const cleanHref = link.getAttribute('href')?.replace(/\\(.)/g, '$1');
      link.setAttribute('href', cleanHref || '');
    }
    
    // 移除链接文本中的换行符
    if (link.textContent) {
      link.textContent = link.textContent.replace(/\s+/g, ' ').trim();
    }
  });
  
  let article = new Readability(dom.window.document, {
    keepClasses: true,
    debug: false,
    charThreshold: 100,
  }).parse();
  
  // 提取标题，但不再用于内容处理
  const title = article && article.title?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || '';
  
  if (!article) {
    throw new Error("Failed to parse article");
  }
  
  // remove HTML comments
  article.content = article.content?.replace(/(\<!--.*?\-->)/g, "") || '';

  // 不再处理标题和h1，保持原始内容结构
  
  // 重新处理HTML内容，确保链接格式正确
  const tempDom = new JSDOM(article.content);
  const tempLinks = tempDom.window.document.querySelectorAll('a');
  
  tempLinks.forEach(link => {
    if (link.getAttribute('href')) {
      // 移除链接URL中的转义字符
      const cleanHref = link.getAttribute('href')?.replace(/\\(.)/g, '$1');
      link.setAttribute('href', cleanHref || '');
    }
  });
  
  // 更新处理后的HTML内容
  article.content = tempDom.window.document.body.innerHTML;
  
  // convert to markdown
  let res = turndownService.turndown(article.content);

  // // replace weird header refs
  // const pattern = /\[\]\(#[^)]*\)/g;
  // res = res.replace(pattern, '');
  
  // // 修复任何可能仍然存在的转义问题
  // res = res.replace(/\\\[/g, '[');
  // res = res.replace(/\\\]/g, ']');
  // res = res.replace(/\\\(/g, '(');
  // res = res.replace(/\\\)/g, ')');
  // res = res.replace(/\\_/g, '_');
  // res = res.replace(/\\\*/g, '*');
  
  // // 修复被错误转义的Markdown链接 - 覆盖所有可能的转义组合
  // res = res.replace(/\\\[([^\]]+)\\\]\\\(([^)]+)\\\)/g, '[$1]($2)');
  // res = res.replace(/\\\[([^\]]+)\\\]\\\(([^)]+)\)/g, '[$1]($2)');
  // res = res.replace(/\\\[([^\]]+)\]\\\(([^)]+)\\\)/g, '[$1]($2)');
  // res = res.replace(/\\\[([^\]]+)\]\\\(([^)]+)\)/g, '[$1]($2)');
  // res = res.replace(/\[([^\]]+)\\\]\\\(([^)]+)\\\)/g, '[$1]($2)');
  // res = res.replace(/\[([^\]]+)\\\]\\\(([^)]+)\)/g, '[$1]($2)');
  // res = res.replace(/\[([^\]]+)\]\\\(([^)]+)\\\)/g, '[$1]($2)');
  // res = res.replace(/\[([^\]]+)\]\\\(([^)]+)\)/g, '[$1]($2)');
  
  // // 修复URL中的转义下划线
  // res = res.replace(/\(([^)]*?)\\\_([^)]*?)\)/g, '($1_$2)');
  
  // // 特别处理空链接
  // res = res.replace(/\[\]\(([^)]+)\)/g, '[$1]($1)');
  
  // // 处理多行链接文本 - 更全面的处理
  // res = res.replace(/\[\s*\n\s*([^\]]+)\s*\n\s*\]\(([^)]+)\)/g, '[$1]($2)');
  // res = res.replace(/\[([^\n\]]*)\n\s*([^\n\]]*)\]\(([^)]+)\)/g, '[$1 $2]($3)');
  
  // // 修复可能被错误处理的复选框
  // res = res.replace(/- \\\[ \\\]/g, '- [ ]');
  // res = res.replace(/- \\\[x\\\]/g, '- [x]');
  // res = res.replace(/- \\\[ \]/g, '- [ ]');
  // res = res.replace(/- \\\[x\]/g, '- [x]');
  // res = res.replace(/- \[ \\\]/g, '- [ ]');
  // res = res.replace(/- \[x\\\]/g, '- [x]');
  
  // // 修复导航链接中的格式问题
  // res = res.replace(/- - \\\[/g, '- - [');
  // res = res.replace(/\]\\\(/g, '](');
  
  // // 修复特殊的导航链接格式
  // res = res.replace(/- - \[(.*?)\]\((.*?)\)\n\s*- \\(.*?)\n\s*\]\((.*?)\)/gm, '- - [$1]($2)\n      - [$3]($4)');
  
  // // 修复Instagram API文档中的特殊链接格式
  // res = res.replace(/\\\[##\s+(.*?)\n\s*(.*?)\n\s*(.*?)\n\s*(.*?)\n\s*(.*?)\n\s*(.*?)\n\s*(.*?)\n\s*(.*?)\n\s*\]\(([^)]+)\)/gm, 
  //                  '## $1\n\n$2\n\n$3\n\n$4\n\n$5\n\n$6\n\n$7\n\n$8\n\n$9\n\n[$1]($10)');
  
  // // 修复about:链接
  // res = res.replace(/\(about:\/([^)]+)\)/g, '(https://$1)');
  
  return [title, cleanMarkdownWithRemark(res)]
}

export async function extract_from_url(page: string): Promise<[title: string, markdown: string]> {
  const virtualConsole = new VirtualConsole();
  const dom = await JSDOM.fromURL(page, {
    runScripts: 'outside-only',
    virtualConsole,
    pretendToBeVisual: false  // 不需要模擬視覺環境
  });
  return extract_from_dom(dom)
}

export function extract_from_html(html: string): [title: string, markdown: string] {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    virtualConsole,
    pretendToBeVisual: false  // 不需要模擬視覺環境
  });
  return extract_from_dom(dom)
}
