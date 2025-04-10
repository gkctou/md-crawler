import { extract_from_html } from './clipper.js';
import { minimatch } from 'minimatch';
import * as cheerio from 'cheerio'; // Added cheerio import

export interface IPage {
  title: string;
  url: string;
  markdown: string;
  html: string;
  at: number;
}

// Helper function to resolve relative URLs in markdown content
function resolveRelativeUrls(markdown: string, baseUrl: string): string {
  // Regex to find markdown links ![alt](src) and [text](link)
  // It captures the prefix (![...]( or [...]( ), the URL, and the closing parenthesis )
  const regex = /(!?\[.*?\]\()(.+?)(\))/g;

  return markdown.replace(regex, (match, prefix, url, suffix) => {
    try {
      // Check if the URL is already absolute (starts with http/https or is protocol-relative)
      if (/^(?:[a-z]+:)?\/\//i.test(url)) {
        return match; // It's already absolute or protocol-relative, return the original match
      }

      // Attempt to resolve the relative URL against the base URL
      const absoluteUrl = new URL(url, baseUrl).href;
      return `${prefix}${absoluteUrl}${suffix}`; // Return the link/image with the resolved URL
    } catch (resolveError) {
      // If resolving fails (e.g., invalid characters, unsupported scheme), return the original match
      console.warn(`Could not resolve URL '${url}' against base '${baseUrl}':`, resolveError instanceof Error ? resolveError.message : resolveError);
      return match;
    }
  });
}

export async function crawl(url: string, additionalGlobalUrls: string[] = []): Promise<IPage[]> {
  const pages: IPage[] = [];
  const visitedUrls = new Set<string>();
  const urlsToVisit = [url];
  const urlsToVisitSet = new Set<string>(urlsToVisit); // Set for quick lookups

  // Custom user agent to mimic a browser
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';

  console.log('additionalGlobalUrls:', additionalGlobalUrls);

  while (urlsToVisit.length > 0) {
    const currentUrl = urlsToVisit.shift();

    if (!currentUrl || visitedUrls.has(currentUrl)) {
      continue;
    }

    visitedUrls.add(currentUrl);
    // console.log(`[Debug] Processing: ${currentUrl}. Queue length after shift: ${urlsToVisit.length}`); // Added Debug Log

    try {
      console.info(`Fetching ${currentUrl}`);

      // Fetch the page using native fetch
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': userAgent
        }
      });

      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
        console.error(`Got ${response.status} for ${currentUrl}`);
        continue;
      }

      // Get the HTML content
      const html = await response.text();

      // Use cheerio to parse HTML and extract information
      const $ = cheerio.load(html);

      const [title, rawMarkdown] = await extract_from_html(html); // Use original HTML

      // Resolve relative URLs in the extracted markdown
      const resolvedMarkdown = resolveRelativeUrls(rawMarkdown, currentUrl);

      // Save the page information
      pages.push({
        title,
        url: currentUrl,
        markdown: resolvedMarkdown, // Use resolved markdown
        html,
        at: Date.now()
      });

      // Extract links from the current page, resolve them, and add to the queue if they match patterns
      if (additionalGlobalUrls.length > 0) {
        const links = $('a');

        links.each((_, element) => {
          const href = $(element).attr('href');
          if (!href) return;

          // Skip mailto, tel, javascript links early
          if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

          let fullUrl: string;
          try {
            // Resolve the href against the current page's URL to get an absolute URL
            // This handles relative paths, absolute paths, and already absolute URLs correctly.
            fullUrl = new URL(href, currentUrl).href;
          } catch (e) {
            // Log and skip if the href is invalid and cannot be resolved
            console.warn(`Skipping invalid URL '${href}' on page ${currentUrl}:`, e instanceof Error ? e.message : e);
            return;
          }

          // Remove hash/fragment from URL to avoid crawling the same logical page multiple times
          const hashIndex = fullUrl.indexOf('#');
          if (hashIndex !== -1) {
            fullUrl = fullUrl.substring(0, hashIndex);
          }

          // Skip URLs that are not http or https
          if (!fullUrl.startsWith('http:') && !fullUrl.startsWith('https:')) return;

          // Skip URLs that are already visited or already in the queue (using Set for efficiency)
          if (visitedUrls.has(fullUrl) || urlsToVisitSet.has(fullUrl)) return;

          // Check if the resolved URL matches any of the allowed glob patterns
          for (const pattern of additionalGlobalUrls) {
            // Use minimatch for reliable glob pattern matching
            if (minimatch(fullUrl, pattern)) {
              console.log(`Enqueuing URL: ${fullUrl} (matched pattern: ${pattern})`);
              urlsToVisit.push(fullUrl);
              urlsToVisitSet.add(fullUrl); // Add to set for quick lookup
              break; // Stop checking other patterns once matched
            }
          }
        });
      }

    } catch (error) {
      console.error(`Error processing ${currentUrl}:`, error);
    } // End of catch block
  } // End of while loop

  return pages;
}
