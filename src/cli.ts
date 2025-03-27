#!/usr/bin/env node
import { Command } from 'commander';
import { crawl } from './crawler';
import { extract_from_url} from './clipper';
import yaml from 'yaml';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('md-crawler')
  .description('Crawl web pages and convert to YAML format Markdown. Will recursively crawl all pages in subdirectories.')
  .argument('<url>', 'URL to crawl. For URLs containing spaces, wrap them in double quotes: "http://example.com/my page"')
  .argument('<output>', 'Output YAML file name. Will be saved in the current working directory.')
  .argument('[waiting]', 'Optional: Waiting time in milliseconds. Default is 0 milliseconds. If you get nothing for some SPA web pages, recommended to set a waiting time about 500 milliseconds.')
  .action(async (url: string, output: string, waiting?: string) => {
    try {
      const waitingTime = parseInt(waiting || '0');
      if (isNaN(waitingTime)) {
        throw new Error('Waiting time must be a number.');
      }
      console.log('Starting web crawl...');
      const additionalGlobalUrls = [url.endsWith('/') ? `${url}**/*` : `${url.substring(0, url.lastIndexOf('/'))}/**/*`];

      const results = await crawl(url, additionalGlobalUrls, waitingTime);

      console.log('Converting format...');
      
      // 创建YAML文档，确保Markdown内容保持正确格式
      const yamlData = results.map(({ title, url, markdown }) => {
        // 使用YAML的块字符串格式(|)，并保持原始格式
        return {
          url,
          title,
          content: markdown
        };
      });
      
      // 使用yaml.stringify并设置正确的选项
      const yamlString = yaml.stringify(yamlData, {
        indent: 2,
        lineWidth: 0, // 禁用行宽限制，避免长行被折断
        doubleQuotedAsJSON: false, // 避免过度转义
        doubleQuotedMinMultiLineLength: Infinity, // 避免多行字符串使用双引号
        defaultStringType: 'BLOCK_LITERAL' // 使用块字符串格式(|)
      });

      // 后处理YAML字符串，移除内容中不必要的反斜杠
      const processedYamlString = yamlString
        // 保留YAML结构，但移除内容中的反斜杠+换行符组合
        .replace(/(\s*content: \|[\r\n]+)([^]*?)(?=\n\s*-|\n\s*$)/g, (match, prefix, content) => {
          // 只处理content部分，保留前缀
          const processedContent = content
            // 移除反斜杠+换行符组合，但保留实际换行
            .replace(/\\(\r?\n\s*)/g, '$1')
            // 修复URL中的反斜杠
            .replace(/\\\&/g, '&')
            // 移除链接中的反斜杠
            .replace(/\\\[/g, '[')
            .replace(/\\\]/g, ']')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            // 保留Markdown代码块中的反斜杠
            .replace(/```([^`]*?)```/g, (codeMatch) => codeMatch.replace(/\\\\/g, '\\\\'));
          
          return prefix + processedContent;
        });

      // Check and ensure file path ends with .yaml
      const outputWithExt = output.endsWith('.yaml') ? output : `${output}.yaml`;
      const outputPath = path.resolve(process.cwd(), outputWithExt);
      fs.writeFileSync(outputPath, processedYamlString);

      console.log(`Success! Results saved to: ${outputPath}`);
    } catch (error) {
      console.error('Error occurred:', error);
      process.exit(1);
    }
  });

program.parse();
