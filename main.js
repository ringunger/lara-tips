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

Alpine.data('lara_tips', () => ({
    assets: {
        iconUrl: iconUrl
    },
    isLoading: true,
    sections: [],
    tips: [],
    activeSection: null,
    activeTip: null,
    tipSearch: '',
    sectionSearch: '',
    error: null,
    lt: new LaraTips(),
    showSideNav: false,
    readSections() {
        this.sections = this.lt.getSections();
    },
    openSection(section) {
        this.tips = this.lt.loadTips(section);
        this.activeSection = section;
        this.activeTip = null;
        this.showSideNav = false;
    },
    openTip(tip) {
        this.activeTip = tip;
        setTimeout(() => {
            hljs.highlightAll();
        }, 100)
    },
    closeTip() {
        this.activeTip = null;
    },
    closeSection() {
        this.activeSection = null;
    },
    parseMarkDown(markdown) {
        return DOMPurify.sanitize(marked.parse(
            markdown.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/,"")
        ));
    },
    finishLoading() {
        this.isLoading = false;
    },
    toggleSideNav() {
        this.showSideNav = !this.showSideNav;
        console.log('ShowSideNav', this.showSideNav);
    },
    getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return Object.fromEntries(urlParams.entries());
    },
    init() {
        console.log("PARAMS", this.getUrlParams());
    }
}))
Alpine.start();
hljs.highlightAll();