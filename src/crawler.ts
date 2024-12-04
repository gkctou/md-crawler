import { PlaywrightCrawler } from 'crawlee';// , Dataset
import { extract_from_html } from './clipper';
// import { rm, writeFileSync } from 'fs'

export interface IPage {
  title: string;
  url: string;
  markdown: string;
  html: string;
  at: number;
}
export async function crawl(url: string, additionalGlobalUrls: string[] = [], headless: boolean = true,): Promise<IPage[]> {//output: any,
  // PlaywrightCrawler crawls the web using a headless
  // browser controlled by the Playwright library.
  const pages: IPage[] = [];
  const crawler = new PlaywrightCrawler({
    // maxRequestsPerCrawl: 2,
    launchContext: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
    },
    sessionPoolOptions: {
      blockedStatusCodes: [401, 403, 429],
    },
    // Use the requestHandler to process each of the crawled pages.
    async requestHandler({ request, page, response, enqueueLinks, log }) {
      if (!await response?.ok()) {
        log.error(`Got ${response?.status()} for ${request.loadedUrl}`)
        return;
      }
      const title = await page.title()

      log.info(`Title of ${request.loadedUrl} is '${title}'`)

      // scrape html
      const html = await page.content()

      // clip body
      const clip = await extract_from_html(html)

      // Save results as JSON to ./storage/datasets/default
      // await Dataset.pushData({
      //   title,
      //   url: request.loadedUrl,
      //   markdown: clip,
      //   html: html,
      //   at: Date.now(),
      // })
      pages.push({ title, url: request.loadedUrl, markdown: clip, html, at: Date.now() })
      // Extract links from the current page
      // and add them to the crawling queue.
      await enqueueLinks({
        globs: additionalGlobalUrls,
      })
    },
    headless: headless,
  })

  // Add first URL to the queue and start the crawl.
  await crawler.run([url])

  // Open a named dataset
  // const dataset = await Dataset.open("default");

  // Export the dataset to a JSONL file
  // writeFileSync(output, (await dataset.map((d) => JSON.stringify(d))).join('\n'))
  // const data = await dataset.map(({ title, markdown }) => ({ title, markdown }));
  // clean up and remove ./storage/datasets/default directory
  // rm('storage', { recursive: true }, (err) => {
  //   console.error(err)
  // });
  return pages;
}