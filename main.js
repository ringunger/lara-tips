import Alpine from 'alpinejs'
import { LaraTips } from "./src/LaraTips.js";
import DOMPurify from "./node_modules/dompurify/dist/purify.es";
window.Alpine = Alpine;
window.marked = import("./node_modules/marked/marked.min");
import hljs from 'highlight.js';
Alpine.data('lara_tips', () => ({
    isLoading: true,
    sections: [],
    tips: [],
    activeSection: null,
    activeTip: null,
    tipSearch: '',
    sectionSearch: '',
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
        console.log('Loading tip ...', tip);
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