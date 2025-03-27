# markdown-crawler

[English](README.md) | [繁體中文](README-zhTW.md) | [日本語](README-ja.md)

A web crawler tool optimized for AI reading that converts web content into structured Markdown format. Using intelligent algorithms to clean up noise and extract core content, it generates clean text data suitable for AI model understanding and processing. Its special feature is the ability to integrate all related pages (including the current page and all its subdirectories) into a single YAML file, producing clearly structured Markdown content.

## Why Suitable for AI Reading?

- 🧠 Intelligently extracts main content, removing ads, navigation bars, and other distractions
- 🎯 Preserves logical structure and semantic relationships of articles
- 📋 Converts to standardized Markdown format for easy AI parsing
- 🔄 Automatically handles special characters and encoding
- 📊 Integrates all pages in YAML format for batch processing

## Features

- 🚀 Uses fetch and cheerio for efficient web crawling, supporting modern web pages
- 📝 Uses Mozilla's Readability algorithm for intelligent content extraction
- ✨ Automatically converts to structured Markdown format, removing unnecessary styles and noise
- 🎨 Supports GitHub Flavored Markdown (GFM), preserving important formatting
- 💻 Supports syntax highlighting for code blocks, maintaining technical document readability
- 🔗 Automatically crawls all related pages, integrating them into a single file
- 🧹 Optimized for minimal dependencies, ensuring lightweight and fast operation
- ⚡ Significantly faster performance with optimized processing pipeline
- 📄 Enhanced Markdown output with cleaner formatting and proper link handling

## Data Integration Benefits

- 📚 Automatically crawls target URL and all subdirectory pages
- 🗂️ Integrates all page content into a single YAML file
- 📖 Maintains the integrity of titles and content for each page
- 🎯 Generates Markdown format suitable for both human reading and AI processing
- 🔍 Facilitates quick browsing and searching of large amounts of related content

## Usage

```bash
# Basic usage
npx markdown-crawler <url> <output-filename>

# Example: Crawl website and save as output.yaml
npx markdown-crawler https://example.com output

# For URLs with spaces, use double quotes
npx markdown-crawler "https://example.com/my page" output

# Output file will automatically add .yaml extension
# Results will be saved in the current working directory
```

## Output Format

The tool integrates all related pages into a structured YAML format:
```yaml
- title: "Main Page Title"
  url: "https://example.com/"
  content: |
    # Main Page Content
    Here is the main page content...

- title: "Subpage 1 Title"
  url: "https://example.com/subpage1"
  content: |
    # Subpage 1 Content
    Here is subpage 1 content...

- title: "Subpage 2 Title"
  url: "https://example.com/subpage2"
  content: |
    # Subpage 2 Content
    Here is subpage 2 content...
```

Features:
- Automatically extracts title and main content from each page
- Includes the original URL for each page for reference
- Maintains content hierarchy and formatting
- Removes unnecessary styles and scripts
- Generates clean, readable Markdown with proper link formatting
- Preserves checkboxes and other Markdown elements correctly
- Suitable for both human reading and AI model processing

## System Requirements

- Node.js >= 16.0.0
- npm or yarn package manager

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
