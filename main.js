import Alpine from 'alpinejs'
import { LaraTips } from "./src/LaraTips.js";
import DOMPurify from "./node_modules/dompurify/dist/purify.es";
window.Alpine = Alpine;
import { marked } from 'marked';
window.marked = marked;
import hljs from 'highlight.js';
import {
    BadgeCheck, Blocks, BookOpen, Bug, Database, Factory, Image, Link, Mail,
    Map, Moon, Package, Pin, Plug, ShieldCheck, Sparkles, Sun, Wrench,
} from 'lucide';

import "././src/highlights.scss";
import "././src/markdown.css";
import "./style.css";

import iconUrl from './src/icon.svg';
import pinUrl from './src/pin.svg';

// Only these named Lucide icons are bundled for the category cards.
const SECTION_ICONS = {
    'db-models-and-eloquent.md': Database,
    'models-relations.md': Link,
    'migrations.md': Blocks,
    'views.md': Image,
    'routing.md': Map,
    'validation.md': BadgeCheck,
    'collections.md': Package,
    'auth.md': ShieldCheck,
    'mail.md': Mail,
    'artisan.md': Wrench,
    'factories.md': Factory,
    'log-and-debug.md': Bug,
    'api.md': Plug,
    'other.md': Sparkles,
};

const FAVORITES_KEY = 'laratips.favorites';
const THEME_KEY = 'laratips.theme';
const ROUTE_PREFIX = '#/';

function iconSvg(icon, className) {
    const nodes = icon.map(([tag, attributes]) => {
        const attrs = Object.entries(attributes)
            .map(([name, value]) => `${name}="${value}"`)
            .join(' ');
        return `<${tag} ${attrs}></${tag}>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${nodes}</svg>`;
}

function sectionRouteKey(file) {
    return file.replace(/\.md$/, '');
}

function parseRoute(hash) {
    const path = hash.startsWith(ROUTE_PREFIX) ? hash.slice(ROUTE_PREFIX.length) : '';
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 0) return { name: 'home' };
    if (parts[0] === 'favorites' && parts.length === 1) return { name: 'favorites' };
    if (parts[0] === 'sections' && parts.length === 2) return { name: 'section', section: decodeURIComponent(parts[1]) };
    if (parts[0] === 'tips' && parts.length === 3) {
        return { name: 'tip', section: decodeURIComponent(parts[1]), title: decodeURIComponent(parts[2]) };
    }

    return { name: 'not-found' };
}

// Delegated click handler for the "Copy" buttons injected into rendered
// code blocks. Attached once, works for any markdown rendered afterwards.
document.addEventListener('click', (event) => {
    const button = event.target.closest('.copy-code-btn');
    if (!button) return;
    const pre = button.closest('.code-block')?.querySelector('pre');
    const code = pre?.innerText ?? '';
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
        const original = button.dataset.label ?? 'Copy';
        button.textContent = 'Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = original;
            button.classList.remove('copied');
        }, 1500);
    }).catch(() => {
        button.textContent = 'Failed';
        setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    });
});

Alpine.data('lara_tips', () => ({
    assets: {
        iconUrl,
        pinUrl,
    },
    isLoading: true,
    sections: [],
    tips: [],
    activeSection: null,
    activeTip: null,
    viewingFavorites: false,
    favorites: [],
    tipSearch: '',
    sectionSearch: '',
    globalSearch: '',
    searchMarkdownContent: true,
    globalSearchResults: [],
    isGlobalSearchLoading: false,
    globalSearchRequest: 0,
    error: null,
    theme: 'dark',
    lt: new LaraTips(),
    showSideNav: false,

    // ---------- lifecycle ----------

    async init() {
        this.favorites = this.loadFavorites();
        this.theme = this.loadTheme();
        await this.readSections();
        await this.applyRoute();
        this.finishLoading();

        window.addEventListener('keydown', (event) => this.handleKeydown(event));
        window.addEventListener('hashchange', () => this.applyRoute());
    },

    async readSections() {
        this.sections = await this.lt.getSections();
        this.error = this.lt.error;
    },

    finishLoading() {
        this.isLoading = false;
    },

    handleKeydown(event) {
        const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

        if (event.key === '/' && !typing) {
            event.preventDefault();
            const input = document.getElementById(this.activeSection || this.viewingFavorites ? 'tip-search-input' : 'home-search-input');
            input?.focus();
        }

        if (event.key === 'Escape') {
            if (this.activeTip) {
                this.closeTip();
            } else if (this.activeSection || this.viewingFavorites) {
                this.goHome();
            } else if (this.showSideNav) {
                this.showSideNav = false;
            }
        }
    },

    // ---------- derived state ----------

    get totalTips() {
        return this.sections.reduce((sum, section) => sum + (parseInt(section.tips, 10) || 0), 0);
    },

    get filteredSections() {
        const query = this.sectionSearch.trim().toLowerCase();
        if (!query) return this.sections;
        return this.sections.filter((section) => section.title.toLowerCase().includes(query));
    },

    get filteredTips() {
        const query = this.tipSearch.trim().toLowerCase();
        const list = this.viewingFavorites ? this.favorites : this.tips;
        if (!query) return list;
        return list.filter((tip) => tip.title.toLowerCase().includes(query));
    },

    get activeTipIndex() {
        const list = this.viewingFavorites ? this.favorites : this.tips;
        return list.findIndex((tip) => this.isSameTip(tip, this.activeTip));
    },

    sectionIcon(file, className = 'w-5 h-5') {
        return iconSvg(SECTION_ICONS[file] ?? BookOpen, className);
    },

    favoriteIcon(className = 'w-5 h-5') {
        return iconSvg(Pin, className);
    },

    themeIcon(className = 'w-5 h-5') {
        return iconSvg(this.theme === 'dark' ? Sun : Moon, className);
    },

    excerpt(markdown, length = 110) {
        if (!markdown) return '';
        const plain = this.searchableText(markdown);
        return plain.length > length ? plain.slice(0, length).trim() + '…' : plain;
    },

    searchableText(markdown) {
        return markdown
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]*)`/g, '$1')
            .replace(/!\[[^\]]*]\([^)]*\)/g, '')
            .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
            .replace(/[#>*_-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    async searchAllTips() {
        const query = this.globalSearch.trim().toLocaleLowerCase();
        const request = ++this.globalSearchRequest;

        if (!query) {
            this.globalSearchResults = [];
            this.isGlobalSearchLoading = false;
            return;
        }

        this.isGlobalSearchLoading = true;
        const allTips = await this.lt.loadAllTips(this.sections);
        if (request !== this.globalSearchRequest) return;

        this.globalSearchResults = allTips
            .filter((tip) => {
                const titleMatches = tip.title.toLocaleLowerCase().includes(query);
                return titleMatches || (this.searchMarkdownContent && this.searchableText(tip.content).toLocaleLowerCase().includes(query));
            })
            .sort((first, second) => {
                const firstTitleMatch = first.title.toLocaleLowerCase().includes(query);
                const secondTitleMatch = second.title.toLocaleLowerCase().includes(query);
                return Number(secondTitleMatch) - Number(firstTitleMatch);
            });
        this.isGlobalSearchLoading = false;
        this.error = this.lt.error;
    },

    // ---------- navigation ----------

    setRoute(path) {
        const hash = `${ROUTE_PREFIX}${path}`;
        if (window.location.hash !== hash) window.location.hash = hash;
    },

    async applyRoute() {
        let route;
        try {
            route = parseRoute(window.location.hash);
        } catch {
            route = { name: 'not-found' };
        }

        if (route.name === 'home') {
            this.goHome({ updateRoute: false });
            return;
        }

        if (route.name === 'favorites') {
            this.openFavorites({ updateRoute: false });
            return;
        }

        const section = this.sections.find((item) => sectionRouteKey(item.file) === route.section);
        if (!section) {
            this.goHome({ updateRoute: false });
            this.error = 'This link does not point to an available tip.';
            return;
        }

        await this.openSection(section, { updateRoute: false });
        if (route.name === 'section') return;

        const tip = this.tips.find((item) => item.title === route.title);
        if (!tip) {
            this.goHome({ updateRoute: false });
            this.error = 'This link does not point to an available tip.';
            return;
        }

        this.openTip(tip, { updateRoute: false });
    },

    async openSection(section, { updateRoute = true } = {}) {
        this.viewingFavorites = false;
        this.activeSection = section;
        this.activeTip = null;
        this.tipSearch = '';
        this.showSideNav = false;
        this.tips = await this.lt.loadTips(section.file);
        this.error = this.lt.error;
        if (updateRoute) this.setRoute(`sections/${encodeURIComponent(sectionRouteKey(section.file))}`);
    },

    async openGlobalSearchResult(result) {
        const section = this.sections.find((item) => item.file === result.sectionFile);
        if (!section) return;

        await this.openSection(section, { updateRoute: false });
        const tip = this.tips.find((item) => item.title === result.title);
        if (tip) this.openTip(tip);
    },

    closeSection() {
        this.activeSection = null;
        this.tips = [];
        this.tipSearch = '';
        this.setRoute('');
    },

    openFavorites({ updateRoute = true } = {}) {
        this.viewingFavorites = true;
        this.activeSection = null;
        this.activeTip = null;
        this.tipSearch = '';
        this.showSideNav = false;
        if (updateRoute) this.setRoute('favorites');
    },

    closeFavorites() {
        this.viewingFavorites = false;
        this.tipSearch = '';
        this.setRoute('');
    },

    goHome({ updateRoute = true } = {}) {
        this.activeTip = null;
        this.activeSection = null;
        this.viewingFavorites = false;
        this.tipSearch = '';
        if (updateRoute) this.setRoute('');
    },

    openTip(tip, { updateRoute = true } = {}) {
        this.activeTip = tip;
        if (updateRoute) {
            const sectionFile = tip.sectionFile ?? this.activeSection?.file;
            this.setRoute(`tips/${encodeURIComponent(sectionRouteKey(sectionFile))}/${encodeURIComponent(tip.title)}`);
        }
        this.$nextTick(() => {
            hljs.highlightAll();
            document.getElementById('tip-content')?.scrollIntoView({ block: 'start' });
        });
    },

    closeTip() {
        this.activeTip = null;
        if (this.viewingFavorites) {
            this.setRoute('favorites');
        } else if (this.activeSection) {
            this.setRoute(`sections/${encodeURIComponent(sectionRouteKey(this.activeSection.file))}`);
        }
    },

    stepTip(direction) {
        const list = this.viewingFavorites ? this.favorites : this.tips;
        const index = this.activeTipIndex;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= list.length) return;
        this.openTip(list[nextIndex]);
    },

    async surpriseMe() {
        if (!this.sections.length) return;
        const result = await this.lt.getRandomTip(this.sections);
        if (!result) return;
        this.viewingFavorites = false;
        this.activeSection = result.section;
        this.tips = await this.lt.loadTips(result.section.file);
        this.openTip(result.tip);
    },

    toggleSideNav() {
        this.showSideNav = !this.showSideNav;
    },

    loadTheme() {
        try {
            return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
        } catch {
            return 'dark';
        }
    },

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        try {
            localStorage.setItem(THEME_KEY, this.theme);
        } catch (e) {
            console.warn('Could not save theme preference', e);
        }
    },

    // ---------- favorites ----------

    loadFavorites() {
        try {
            const raw = localStorage.getItem(FAVORITES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Could not read favorites', e);
            return [];
        }
    },

    saveFavorites() {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(this.favorites));
        } catch (e) {
            console.error('Could not save favorites', e);
        }
    },

    isSameTip(a, b) {
        if (!a || !b) return false;
        const sectionA = a.sectionFile ?? this.activeSection?.file;
        const sectionB = b.sectionFile ?? this.activeSection?.file;
        return a.title === b.title && sectionA === sectionB;
    },

    isFavorite(tip) {
        if (!tip) return false;
        return this.favorites.some((fav) => fav.title === tip.title && fav.sectionFile === (tip.sectionFile ?? this.activeSection?.file));
    },

    toggleFavorite(tip) {
        if (!tip) return;
        const sectionFile = tip.sectionFile ?? this.activeSection?.file;
        const sectionTitle = tip.sectionTitle ?? this.activeSection?.title;

        if (this.isFavorite(tip)) {
            this.favorites = this.favorites.filter((fav) => !(fav.title === tip.title && fav.sectionFile === sectionFile));
        } else {
            this.favorites = [...this.favorites, {
                title: tip.title,
                content: tip.content,
                sectionFile,
                sectionTitle,
            }];
        }
        this.saveFavorites();
    },

    // ---------- markdown ----------

    parseMarkDown(markdown) {
        const html = DOMPurify.sanitize(marked.parse(
            markdown.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, '')
        ));
        return this.enhanceCodeBlocks(html);
    },

    enhanceCodeBlocks(html) {
        const container = document.createElement('div');
        container.innerHTML = html;
        container.querySelectorAll('pre').forEach((pre) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const language = pre.querySelector('code')?.className.match(/language-([\w+-]+)/)?.[1] ?? 'code';
            const toolbar = document.createElement('div');
            toolbar.className = 'code-block__toolbar';

            const label = document.createElement('span');
            label.className = 'code-block__language';
            label.textContent = language;
            toolbar.appendChild(label);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'copy-code-btn';
            button.dataset.label = 'Copy';
            button.textContent = 'Copy';
            toolbar.appendChild(button);
            wrapper.insertBefore(toolbar, pre);
        });
        return container.innerHTML;
    },
}))

Alpine.start();
