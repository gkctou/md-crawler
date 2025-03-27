# markdown-crawler

[English](README.md) | [繁體中文](README-zhTW.md) | [日本語](README-ja.md)

一個專為 AI 閱讀優化的網頁爬蟲工具，可以將網頁內容轉換成結構化的 Markdown 格式。透過智慧演算法清理雜訊，提取核心內容，產生適合 AI 模型理解和處理的純文本資料。特別之處在於能夠將一個網站的所有相關頁面（包含當前頁面及其所有子目錄）整合成單一的 YAML 檔案，產生結構清晰的 Markdown 內容。

## 為何適合 AI 閱讀？

- 🧠 智慧提取主要內容，移除廣告、導航列等干擾元素
- 🎯 保留文章的邏輯結構和語意關係
- 📋 轉換成標準化的 Markdown 格式，便於 AI 解析
- 🔄 自動處理特殊字元和編碼，確保文本品質
- 📊 以 YAML 格式整合所有頁面，方便批次處理

## 功能特點

- 🚀 使用 fetch 和 cheerio 進行高效網頁爬取，支援現代網頁
- 📝 使用 Mozilla 的 Readability 演算法智慧提取主要內容
- ✨ 自動轉換成結構化的 Markdown 格式，移除不必要的樣式和雜訊
- 🎨 支援 GitHub Flavored Markdown (GFM)，保留重要的格式資訊
- 💻 支援程式碼區塊的語法高亮，保持技術文件的可讀性
- 🔗 自動遞迴爬取所有相關頁面，整合成單一檔案
- 🧹 優化最小化依賴項，確保輕量化和快速運行
- ⚡ 顯著提升處理速度，效能大幅優化
- 📄 增強的 Markdown 輸出，格式更乾淨，連結處理更完善

## 資料整合優勢

- 📚 自動爬取目標網址及其所有子目錄頁面
- 🗂️ 將所有頁面內容整合到單一 YAML 檔案中
- 📖 每個頁面都保持其標題和內容的完整性
- 🎯 產生的 Markdown 格式同時適合人類閱讀和 AI 處理
- 🔍 便於快速瀏覽和搜尋大量相關內容

## 使用方法

```bash
# 基本用法
npx markdown-crawler <網址> <輸出檔案名稱>

# 範例：爬取網站並儲存為 output.yaml
npx markdown-crawler https://example.com output

# 如果網址包含空格，請使用雙引號
npx markdown-crawler "https://example.com/my page" output

# 輸出檔案會自動加上 .yaml 副檔名
# 結果會儲存在目前的工作目錄中
```

## 輸出格式

工具會將所有相關頁面整合成結構化的 YAML 格式：
```yaml
- title: "主頁標題"
  url: "https://example.com/"
  content: |
    # 主頁內容
    這裡是主頁的正文...

- title: "子頁面1標題"
  url: "https://example.com/subpage1"
  content: |
    # 子頁面1內容
    這裡是子頁面1的正文...

- title: "子頁面2標題"
  url: "https://example.com/subpage2"
  content: |
    # 子頁面2內容
    這裡是子頁面2的正文...
```

特點：
- 自動提取每個頁面的標題和主要內容
- 包含每個頁面的原始 URL 以供參考
- 保持內容的層級結構和格式
- 移除不必要的樣式和腳本
- 生成乾淨、可讀的 Markdown，連結格式正確
- 正確保留核取方塊和其他 Markdown 元素
- 適合人類閱讀和 AI 模型處理

## 系統需求

- Node.js >= 16.0.0
- npm 或 yarn 套件管理器

## 授權

本專案使用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案。
