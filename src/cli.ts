#!/usr/bin/env node
import { Command } from 'commander';
import { crawl } from './crawler';
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
      if (waitingTime > 0) {
        additionalGlobalUrls.push(`#**/*`);
      }
      const results = await crawl(url, additionalGlobalUrls, waitingTime);

      console.log('Converting format...');
      const yamlData = yaml.stringify(results.map(({ title, url, markdown }) => ({ url, title, content: markdown })));

      // Check and ensure file path ends with .yaml
      const outputWithExt = output.endsWith('.yaml') ? output : `${output}.yaml`;
      const outputPath = path.resolve(process.cwd(), outputWithExt);
      fs.writeFileSync(outputPath, yamlData);

      console.log(`Success! Results saved to: ${outputPath}`);
    } catch (error) {
      console.error('Error occurred:', error);
      process.exit(1);
    }
  });

program.parse();
