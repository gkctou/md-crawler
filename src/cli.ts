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
  .action(async (url: string, output: string) => {
    try {
      console.log('Starting web crawl...');
      const globalUrl = url.endsWith('/') ? `${url}**/*` : `${url.substring(0, url.lastIndexOf('/'))}/**/*`;
      const results = await crawl(url, [globalUrl]);

      console.log('Converting format...');
      const yamlData = yaml.stringify(results.map(({ title, markdown }) => ({ title, content: markdown })));

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
