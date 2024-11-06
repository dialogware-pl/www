// server.ts
import express from 'express';
import marked from 'marked';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import highlight from 'highlight.js';
import { createHmac } from 'crypto';

interface DocPage {
    slug: string;
    title: string;
    content: string;
    category: string;
    order: number;
    metadata: any;
}

class DocumentationServer {
    private app: express.Application;
    private docs: Map<string, DocPage> = new Map();
    private categories: Set<string> = new Set();
    private readonly docsDir: string;
    private readonly secret: string;

    constructor(options: {
        docsDir: string,
        secret: string,
        port?: number
    }) {
        this.app = express();
        this.docsDir = options.docsDir;
        this.secret = options.secret;

        this.setupMiddleware();
        this.setupRoutes();
        this.setupMarkdown();
        this.startServer(options.port || 3000);
    }

    private setupMiddleware(): void {
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    private setupMarkdown(): void {
        marked.setOptions({
            highlight: (code, lang) => {
                if (lang && highlight.getLanguage(lang)) {
                    return highlight.highlight(code, { language: lang }).value;
                }
                return highlight.highlightAuto(code).value;
            },
            headerIds: true,
            mangle: false
        });
    }

    private async loadDocs(): Promise<void> {
        try {
            const files = await fs.readdir(this.docsDir);

            for (const file of files) {
                if (file.endsWith('.md')) {
                    const filePath = path.join(this.docsDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');

                    // Parse front matter
                    const { data, content: markdown } = matter(content);

                    const slug = file.replace('.md', '');
                    const docPage: DocPage = {
                        slug,
                        title: data.title || slug,
                        content: marked(markdown),
                        category: data.category || 'Uncategorized',
                        order: data.order || 999,
                        metadata: data
                    };

                    this.docs.set(slug, docPage);
                    this.categories.add(docPage.category);
                }
            }
        } catch (error) {
            console.error('Error loading documentation:', error);
        }
    }

    private setupRoutes(): void {
        // Main documentation page
        this.app.get('/', (req, res) => {
            const menu = this.generateMenu();
            const content = this.docs.get('introduction') || { content: 'Welcome to Dialogware Documentation' };

            res.send(this.renderPage(content, menu));
        });

        // Specific documentation pages
        this.app.get('/docs/:slug', (req, res) => {
            const doc = this.docs.get(req.params.slug);
            if (!doc) {
                res.status(404).send('Documentation not found');
                return;
            }

            const menu = this.generateMenu();
            res.send(this.renderPage(doc, menu));
        });

        // API endpoint for updating documentation
        this.app.post('/webhook/update', async (req, res) => {
            const signature = req.headers['x-hub-signature-256'];
            if (!this.verifyWebhookSignature(req.body, signature as string)) {
                res.status(401).send('Invalid signature');
                return;
            }

            try {
                await this.loadDocs();
                res.send({ success: true });
            } catch (error) {
                res.status(500).send({ error: 'Failed to update documentation' });
            }
        });

        // Search endpoint
        this.app.get('/search', (req, res) => {
            const query = req.query.q as string;
            if (!query) {
                res.status(400).send({ error: 'Query parameter is required' });
                return;
            }

            const results = this.searchDocs(query);
            res.send(results);
        });
    }

    private generateMenu(): string {
        let menu = '<nav class="docs-nav">';

        // Sort categories
        const sortedCategories = Array.from(this.categories).sort();

        for (const category of sortedCategories) {
            const categoryDocs = Array.from(this.docs.values())
                .filter(doc => doc.category === category)
                .sort((a, b) => a.order - b.order);

            if (categoryDocs.length > 0) {
                menu += `<div class="category">
          <h3>${category}</h3>
          <ul>`;

                for (const doc of categoryDocs) {
                    menu += `<li>
            <a href="/docs/${doc.slug}" 
               class="doc-link" 
               data-slug="${doc.slug}">
              ${doc.title}
            </a>
          </li>`;
                }

                menu += '</ul></div>';
            }
        }

        menu += '</nav>';
        return menu;
    }

    private renderPage(doc: DocPage, menu: string): string {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${doc.title} - Dialogware Documentation</title>
        <link rel="stylesheet" href="/css/style.css">
        <link rel="stylesheet" href="/css/highlight.css">
        <link rel="icon" type="image/png" href="/favicon.png">
      </head>
      <body>
        <div class="docs-container">
          ${menu}
          <main class="docs-content">
            <h1>${doc.title}</h1>
            ${doc.content}
          </main>
        </div>
        <script src="/js/docs.js"></script>
      </body>
      </html>
    `;
    }

    private searchDocs(query: string): any[] {
        const results = [];
        const searchTerms = query.toLowerCase().split(' ');

        for (const doc of this.docs.values()) {
            const searchableContent = `${doc.title} ${doc.content}`.toLowerCase();
            const matches = searchTerms.every(term => searchableContent.includes(term));

            if (matches) {
                results.push({
                    title: doc.title,
                    slug: doc.slug,
                    category: doc.category,
                    excerpt: this.generateExcerpt(doc.content, searchTerms[0])
                });
            }
        }

        return results;
    }

    private generateExcerpt(content: string, term: string): string {
        const plainText = content.replace(/<[^>]+>/g, '');
        const termIndex = plainText.toLowerCase().indexOf(term);

        if (termIndex === -1) return plainText.slice(0, 200) + '...';

        const start = Math.max(0, termIndex - 100);
        const end = Math.min(plainText.length, termIndex + 100);
        return '...' + plainText.slice(start, end) + '...';
    }

    private verifyWebhookSignature(payload: any, signature: string): boolean {
        const hmac = createHmac('sha256', this.secret);
        const digest = hmac.update(JSON.stringify(payload)).digest('hex');
        return `sha256=${digest}` === signature;
    }

    private startServer(port: number): void {
        this.loadDocs().then(() => {
            this.app.listen(port, () => {
                console.log(`Documentation server running at http://localhost:${port}`);
            });
        });
    }
}

// styles.css
const styles = `
.docs-container {
  display: flex;
  min-height: 100vh;
}

.docs-nav {
  width: 300px;
  padding: 2rem;
  background: #f5f5f5;
  border-right: 1px solid #eaeaea;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.docs-content {
  flex: 1;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.category {
  margin-bottom: 1.5rem;
}

.category h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #333;
}

.doc-link {
  color: #666;
  text-decoration: none;
  display: block;
  padding: 0.25rem 0;
}

.doc-link:hover {
  color: #0066cc;
}

.doc-link.active {
  color: #0066cc;
  font-weight: bold;
}

pre {
  background: #f8f8f8;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

code {
  font-family: 'Fira Code', monospace;
}

.search-box {
  margin-bottom: 1rem;
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .docs-container {
    flex-direction: column;
  }

  .docs-nav {
    width: 100%;
    height: auto;
    position: relative;
  }
}
`;

// docs.js
const clientScript = `
document.addEventListener('DOMContentLoaded', function() {
  // Highlight current page in navigation
  const currentPath = window.location.pathname;
  const currentLink = document.querySelector(\`a[href="\${currentPath}"]\`);
  if (currentLink) {
    currentLink.classList.add('active');
  }

  // Search functionality
  let searchTimeout;
  const searchInput = document.querySelector('.search-box');
  
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = e.target.value;
        if (query.length >= 3) {
          performSearch(query);
        }
      }, 300);
    });
  }

  async function performSearch(query) {
    try {
      const response = await fetch(\`/search?q=\${encodeURIComponent(query)}\`);
      const results = await response.json();
      displaySearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  function displaySearchResults(results) {
    const content = document.querySelector('.docs-content');
    if (!content) return;

    if (results.length === 0) {
      content.innerHTML = '<h2>No results found</h2>';
      return;
    }

    let html = '<h2>Search Results</h2><div class="search-results">';
    results.forEach(result => {
      html += \`
        <div class="search-result">
          <h3><a href="/docs/\${result.slug}">\${result.title}</a></h3>
          <p>\${result.excerpt}</p>
          <span class="category">\${result.category}</span>
        </div>
      \`;
    });
    html += '</div>';

    content.innerHTML = html;
  }
});
`;

// Example usage
const server = new DocumentationServer({
    docsDir: path.join(__dirname, 'docs'),
    secret: process.env.WEBHOOK_SECRET || 'your-secret-key',
    port: 3000
});

export default DocumentationServer;
