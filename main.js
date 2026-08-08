import Alpine from 'alpinejs'
import { LaraTips } from "./src/LaraTips.js";
import DOMPurify from "./node_modules/dompurify/dist/purify.es";
window.Alpine = Alpine;
import { marked } from 'marked';
window.marked = marked;
import hljs from 'highlight.js';

import "././src/highlights.scss";
import "././src/markdown.css";
import "./style.css";

import iconUrl from './src/icon.svg';
import pinUrl from './src/pin.svg';

// Emoji "icons" per category file, purely decorative sugar for the section cards.
const SECTION_EMOJI = {
    'db-models-and-eloquent.md': '🗄️',
    'models-relations.md': '🔗',
    'migrations.md': '🧱',
    'views.md': '🖼️',
    'routing.md': '🧭',
    'validation.md': '✅',
    'collections.md': '📦',
    'auth.md': '🔐',
    'mail.md': '✉️',
    'artisan.md': '⚙️',
    'factories.md': '🏭',
    'log-and-debug.md': '🐞',
    'api.md': '🔌',
    'other.md': '✨',
};

const FAVORITES_KEY = 'laratips.favorites';

// Delegated click handler for the "Copy" buttons injected into rendered
// code blocks. Attached once, works for any markdown rendered afterwards.
document.addEventListener('click', (event) => {
    const button = event.target.closest('.copy-code-btn');
    if (!button) return;
    const pre = button.parentElement?.querySelector('pre');
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
    error: null,
    lt: new LaraTips(),
    showSideNav: false,

    // ---------- lifecycle ----------

    async init() {
        this.favorites = this.loadFavorites();
        await this.readSections();
        this.finishLoading();

        window.addEventListener('keydown', (event) => this.handleKeydown(event));
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

    sectionIcon(file) {
        return SECTION_EMOJI[file] ?? '📘';
    },

    excerpt(markdown, length = 110) {
        if (!markdown) return '';
        const plain = markdown
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]*)`/g, '$1')
            .replace(/!\[[^\]]*]\([^)]*\)/g, '')
            .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
            .replace(/[#>*_-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return plain.length > length ? plain.slice(0, length).trim() + '…' : plain;
    },

    // ---------- navigation ----------

    async openSection(section) {
        this.viewingFavorites = false;
        this.activeSection = section;
        this.activeTip = null;
        this.tipSearch = '';
        this.showSideNav = false;
        this.tips = await this.lt.loadTips(section.file);
        this.error = this.lt.error;
    },

    closeSection() {
        this.activeSection = null;
        this.tips = [];
        this.tipSearch = '';
    },

    openFavorites() {
        this.viewingFavorites = true;
        this.activeSection = null;
        this.activeTip = null;
        this.tipSearch = '';
        this.showSideNav = false;
    },

    closeFavorites() {
        this.viewingFavorites = false;
        this.tipSearch = '';
    },

    goHome() {
        this.activeTip = null;
        this.activeSection = null;
        this.viewingFavorites = false;
        this.tipSearch = '';
    },

    openTip(tip) {
        this.activeTip = tip;
        this.$nextTick(() => {
            hljs.highlightAll();
            document.getElementById('tip-content')?.scrollIntoView({ block: 'start' });
        });
    },

    closeTip() {
        this.activeTip = null;
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

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'copy-code-btn';
            button.dataset.label = 'Copy';
            button.textContent = 'Copy';
            wrapper.appendChild(button);
        });
        return container.innerHTML;
    },
}))

Alpine.start();
