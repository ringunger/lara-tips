import Alpine from 'alpinejs'
import { LaraTips } from "./src/LaraTips.js";
import DOMPurify from "./node_modules/dompurify/dist/purify.es";
window.Alpine = Alpine;
import { marked } from 'marked';
window.marked = marked; // import("./node_modules/marked/marked.min");
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
    readSections() {
        this.sections = this.lt.getSections();
    },
    openSection(section) {
        console.log('Loading section...', section);
        this.tips = this.lt.loadTips(section);
        this.activeSection = section;
        this.activeTip = null;
    },
    openTip(tip) {
        this.activeTip = tip;
        setTimeout(() => {
            hljs.highlightAll();
        }, 100)
        // TODO load the tip to the
    },

    closeTip() {
        this.activeTip = null;
    },
    parseMarkDown(markdown) {
        return DOMPurify.sanitize(marked.parse(
            markdown.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/,"")
        ));
    },
    finishLoading() {
        this.isLoading = false;
    }
}))
Alpine.start();
hljs.highlightAll();