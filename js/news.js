// ANDES Virus Tracker — News feed restricted to vetted authoritative sources only.
// Google News RSS appends "- SourceName" to each title. We match that against an
// allowlist; anything from an unvetted outlet is filtered out.

const TRUSTED_SOURCES = [
  'WHO', 'World Health Organization',
  'CDC', 'Centers for Disease Control',
  'ECDC', 'European Centre for Disease',
  'PAHO', 'Pan American Health',
  'Africa CDC',
  'Reuters',
  'Associated Press', 'AP News',
  'BBC',
  'NPR',
  'France 24',
  'Al Jazeera',
  'Washington Post',
  'New York Times', 'NYT',
  'CNN',
  'The Guardian', 'Guardian',
  'NBC News', 'NBC',
  'CBS News', 'CBS',
  'CTV News', 'CTV',
  'ABC News',
  'Sky News',
  'Bloomberg',
  'Financial Times',
  'Politico',
  'Outbreak News Today',
  'Contagion Live', 'ContagionLive',
  'Forbes',
  'Time', 'TIME',
  'Newsweek',
  'USA Today',
  'Yahoo News',
  'CBC',
  'Deutsche Welle', 'DW',
  'Euronews',
  'STAT', 'STAT News',
  'Healio',
  'Medscape',
  'Becker\'s Hospital Review',
  'NHS',
  'PBS',
  'Live Science',
  'Scientific American',
  'Nature',
  'Science',
  'The Lancet'
];

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=%22Andes+virus%22+OR+%22Andes+hantavirus%22&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=hantavirus+outbreak&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22MV+Hondius%22&hl=en-US&gl=US&ceid=US:en'
];

// Try to extract the source name from a Google News title (last "- Source" segment)
function extractSource(title) {
  if (!title) return null;
  const match = title.match(/[-–—]\s*([^-–—]+)\s*$/);
  return match ? match[1].trim() : null;
}

function isTrustedSource(sourceName) {
  if (!sourceName) return false;
  const lc = sourceName.toLowerCase();
  return TRUSTED_SOURCES.some(s => lc === s.toLowerCase() || lc.includes(s.toLowerCase()) || s.toLowerCase().includes(lc));
}

function stripSourceFromTitle(title) {
  if (!title) return '';
  return title.replace(/\s*[-–—]\s*[^-–—]+\s*$/, '').trim();
}

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list) return;

  const t = TRANSLATIONS[localStorage.getItem('hanta_lang') || 'en'] || TRANSLATIONS.en;
  list.innerHTML = `<div class="news-loading">${t.news_loading}</div>`;

  try {
    const allItems = [];
    for (const feedUrl of RSS_FEEDS) {
      try {
        const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'ok' && Array.isArray(data.items)) {
          allItems.push(...data.items);
        }
      } catch (e) {
        console.warn('Feed failed:', feedUrl, e);
      }
    }

    // Annotate each item with its detected source, then filter to trusted only
    const annotated = allItems.map(item => ({
      ...item,
      _source: extractSource(item.title),
      _cleanTitle: stripSourceFromTitle(item.title)
    }));
    const trusted = annotated.filter(item => isTrustedSource(item._source));

    if (trusted.length === 0) {
      list.innerHTML = `<div class="news-error">${t.news_error}</div>`;
      return;
    }

    // Dedupe by clean title
    const seen = new Set();
    const unique = trusted.filter(item => {
      const key = (item._cleanTitle || item.title || '').toLowerCase().trim().slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date desc
    unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    list.innerHTML = unique.slice(0, 25).map(item => {
      const date = new Date(item.pubDate);
      const dateStr = isNaN(date) ? '' : date.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const desc = item.description
        ? item.description.replace(/<[^>]*>/g, '').slice(0, 220) + (item.description.length > 220 ? '...' : '')
        : '';
      return `
        <div class="news-item">
          <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item._cleanTitle || item.title}</a>
          <div class="news-meta">
            <span class="news-source">${item._source}</span>
            ${dateStr ? `<span>${dateStr}</span>` : ''}
            <span style="color: var(--safe-green);">✓ Verified Source</span>
          </div>
          ${desc ? `<div class="news-description">${desc}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('News load failed:', err);
    list.innerHTML = `<div class="news-error">${t.news_error}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadNews, 100);
});
