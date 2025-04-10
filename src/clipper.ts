import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom'; // Added VirtualConsole import
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { cleanMarkdownWithRemark } from './clearup.js';
import * as cheerio from 'cheerio';

// 配置TurndownService
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  linkStyle: 'inlined',  // 使用内联链接样式
  linkReferenceStyle: 'full',  // 使用完整引用样式
  blankReplacement: function (content, node) {
    return node.isBlock ? '\n\n' : '';
  },
  keepReplacement: function (content, node) {
    return node.isBlock ? '\n\n' + content + '\n\n' : content;
  },
  defaultReplacement: function (content, node) {
    return node.isBlock ? '\n\n' + content + '\n\n' : content;
  }
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

// 自定义处理换行的规则
turndownService.addRule('lineBreaks', {
  filter: 'br',
  replacement: function(content) {
    return '\n';  // 使用单纯的换行符，不添加反斜杠
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

  // 恢复标题处理功能
  // Try to add proper h1 if title is missing
  if (title.length > 0) {
    // check if first h2 is the same as title
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/;
    const match = article.content.match(h2Regex);
    if (match?.[0].includes(title)) {
      // replace fist h2 with h1
      article.content = article.content.replace("<h2", "<h1").replace("</h2", "</h1")
    } else {
      // add title as h1
      article.content = `<h1>${title}</h1>\n${article.content}`
    }
  }
  
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

  // 移除行尾多余的反斜杠（硬换行符号）
  res = res.replace(/\\$/gm, '');
  
  // 处理日文文本中常见的段落格式
  res = res.replace(/\\\s+/g, ' ');  // 移除反斜杠后跟空白
  res = res.replace(/\\\n/g, '\n');  // 移除反斜杠后跟换行
  
  // 清理多余的空行
  res = res.replace(/\n{3,}/g, '\n\n');
  
  // 特别处理日文文本中的格式
  res = res.replace(/【(.+?)】\\\s*/g, '【$1】\n');
  
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
