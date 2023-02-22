import Alpine from 'alpinejs'
import { LaraTips } from "./src/LaraTips.js";
window.Alpine = Alpine;

Alpine.data('lara_tips', () => ({
    sections: [],
    tips: [],
    activeSection: null,
    activeTip: null,
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
        // TODO load the tip to the
    },
}))
Alpine.start();
