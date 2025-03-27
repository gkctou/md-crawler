import { extract_from_html } from './clipper';
import * as cheerio from 'cheerio';

export interface IPage {
  title: string;
  url: string;
  markdown: string;
  html: string;
  at: number;
}

export async function crawl(url: string, additionalGlobalUrls: string[] = [], waiting: number = 0, headless: boolean = true): Promise<IPage[]> {
  const pages: IPage[] = [];
  const visitedUrls = new Set<string>();
  const urlsToVisit = [url];

  // Custom user agent to mimic a browser
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';

  console.log('additionalGlobalUrls:', additionalGlobalUrls);

  while (urlsToVisit.length > 0) {
    const currentUrl = urlsToVisit.shift();
    
    if (!currentUrl || visitedUrls.has(currentUrl)) {
      continue;
    }
    
    visitedUrls.add(currentUrl);
    
    try {
      console.info(`Fetching ${currentUrl}`);
      
      // Add delay if specified
      if (waiting > 0) {
        await new Promise(resolve => setTimeout(resolve, waiting));
      }
      
      // Fetch the page using native fetch
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': userAgent
        }
      });
      
      if (!response.ok) {
        console.error(`Got ${response.status} for ${currentUrl}`);
        continue;
      }
      
      // Get the HTML content
      const html = await response.text();
      
      // Use cheerio to parse HTML and extract information
      const $ = cheerio.load(html);
      
      const [title, markdown] = await extract_from_html(html);
      
      // Save the page information
      pages.push({
        title,
        url: currentUrl,
        markdown,
        html,
        at: Date.now()
      });
      
      // Extract links from the current page and add them to the queue
      if (additionalGlobalUrls.length > 0) {
        const links = $('a');
        
        links.each((_, element) => {
          const href = $(element).attr('href');
          if (!href) return;
          
          // Skip fragment-only links
          if (href.startsWith('#')) return;
          
          // Skip mailto, tel, javascript links
          if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
          
          // Handle relative URLs
          let fullUrl = href;
          if (href.startsWith('/')) {
            // Absolute path from domain root
            const urlObj = new URL(currentUrl);
            fullUrl = `${urlObj.origin}${href}`;
          } else if (!href.startsWith('http')) {
            // Relative path from current URL
            const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
            fullUrl = new URL(href, baseUrl).href;
          }
          
          // Remove hash/fragment from URL to avoid crawling the same page multiple times
          if (fullUrl.includes('#')) {
            fullUrl = fullUrl.split('#')[0];
          }
          
          // Skip URLs that are not http/https
          if (!fullUrl.startsWith('http')) return;
          
          // Skip URLs that are already visited or in the queue
          if (visitedUrls.has(fullUrl) || urlsToVisit.includes(fullUrl)) return;
          
          // Skip URLs from different domains if not explicitly allowed
          const currentUrlDomain = new URL(currentUrl).hostname;
          const fullUrlDomain = new URL(fullUrl).hostname;
          if (currentUrlDomain !== fullUrlDomain) {
            // Only allow external domains if explicitly matched by a pattern
            let externalAllowed = false;
            for (const pattern of additionalGlobalUrls) {
              if (pattern.includes(fullUrlDomain)) {
                externalAllowed = true;
                break;
              }
            }
            if (!externalAllowed) return;
          }
          
          // Check if the URL matches any of the glob patterns
          for (const pattern of additionalGlobalUrls) {
            const isMatch = matchGlob(fullUrl, pattern);
            
            if (isMatch) {
              console.log(`Enqueuing URL: ${fullUrl} (matched pattern: ${pattern})`);
              urlsToVisit.push(fullUrl);
              break;
            }
          }
        });
      }
      
    } catch (error) {
      console.error(`Error processing ${currentUrl}:`, error);
    }
  }
  
  return pages;
}

/**
 * Match a URL against a glob pattern
 * Supports * (any characters) and ** (any path segments)
 */
function matchGlob(url: string, pattern: string): boolean {
  try {
    // Basic case: exact match
    if (url === pattern) return true;
    
    // Handle the case where the pattern is just a prefix
    if (pattern.endsWith('/**/*')) {
      const basePattern = pattern.slice(0, -5); // Remove '/**/*'
      return url.startsWith(basePattern);
    }
    
    // Handle the case where the pattern is a directory with all files
    if (pattern.endsWith('/*')) {
      const basePattern = pattern.slice(0, -2); // Remove '/*'
      const urlObj = new URL(url);
      const patternObj = new URL(basePattern);
      
      // Check if URL is in the same directory (no additional path segments)
      return urlObj.origin === patternObj.origin && 
             urlObj.pathname.startsWith(patternObj.pathname) &&
             !urlObj.pathname.slice(patternObj.pathname.length).includes('/');
    }
    
    // Convert the glob pattern to a regex pattern
    let regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*\*/g, '__DOUBLE_STAR__')  // Temporarily replace ** with a placeholder
      .replace(/\*/g, '[^/]*')  // Replace * with regex for "any characters except /"
      .replace(/__DOUBLE_STAR__/g, '.*');  // Replace ** with regex for "any characters"
      
    // If the pattern ends with /**, make it match anything after the last /
    if (pattern.endsWith('/**')) {
      regexPattern = regexPattern.replace(/\/\.\*$/, '(\\/.*)?');
    }
    
    // If the pattern ends with *, make it match anything
    if (pattern.endsWith('*') && !pattern.endsWith('**')) {
      regexPattern = regexPattern.replace(/\[\^\/\]\*$/, '.*');
    }
    
    // Create the regex object with case-insensitive matching
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    
    // Test the URL against the regex
    return regex.test(url);
  } catch (error) {
    console.error(`Error matching glob pattern ${pattern} against URL ${url}:`, error);
    // Default to a simple prefix match if regex fails
    return url.startsWith(pattern.replace('/**/*', ''));
  }
}