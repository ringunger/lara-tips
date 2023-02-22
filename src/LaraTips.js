import md2json from "md-2-json";

export class LaraTips {
    tipsPath;
    loaded;
    error;

    constructor(tipsPath) {
        this.tipsPath = tipsPath ?? './laravel-tips/';
        this.loaded = false;
    }

    getSections = async () => {
        let sections = [];
        const readme = await this.getFileContent('./laravel-tips/README.md');

        const readmeContents = this.extractSections(readme, 2);
        if (readmeContents.length) {
            const tableOfContents = readmeContents.find((item) => item[0] === "Table of contents");
            const contents = this.extractTableOfContents(tableOfContents[1]);
            if (contents.length) {
                contents.forEach((content) => {
                    sections.push(content);
                });
            }
        }
        await this.loadTips(sections[0].file);
        this.loaded = true;
        return sections;
    }


    loadTips = async (filePath) => {
        const contents = await this.getFileContent(this.tipsPath + filePath);
        if (contents) {
            const tipBlocks = this.extractSections(contents, 3);
            console.log('TIP BLOCKS', tipBlocks);
            return tipBlocks.map((item) => {
                return {
                    title: item[0],
                    content: item[1]
                }
            });
        } else {
            this.error = "Failed to load contents"
        }
        return [];
    }

    /**
     * Get the content of a file (text)
     * @param filePath
     * @returns {Promise<void>}
     */
    getFileContent = async (filePath) => {
        return await fetch(filePath).then(response => response.text());
    }

    extractSections = (content, headingLevel = 2) => {
        const fileDelimiter = '::::';
        const hashes = "".padStart(headingLevel, "#")
        const regexPattern = new RegExp(`^${hashes} (.*)\\s+([\\s\\S]*?)(?=^${hashes} |::::$)`, 'gm');
        console.log('Regex', regexPattern);
        content = content.toString().replace(/\n{2}/g, '\n');
        const matches = [];
        let match;
        while (match = regexPattern.exec(content.toString() + fileDelimiter)) {
            matches.push(match.slice(1));
        }
        return matches;
    }

    extractTableOfContents = (mdString) => {
        const regex = /(- (\[.*)\n)/g
        let matches = mdString.toString().match(regex);
        console.log('CONTENTS ', matches);
        let tableOfContents = [];
        if (matches.length > 0) {
            matches.forEach((item, index) => {
                const regex2 = /\[(.*)\]\((.*)\) \((.*)\)\n/;
                const parts = item.toString().match(regex2);
                const entry = {
                    title: parts[1],
                    file: parts[2],
                    tips: parts[3].toString().replace(' tips', '')
                }
                tableOfContents.push(entry);
            });
        }
        console.log('Table of contents', tableOfContents);
        return tableOfContents;
    }

    extractHeaderFromSection = (section) => {

    }


    addSlashes = (string) => {
        return string.replace(/\\/g, '\\\\').
        replace(/\u0008/g, '\\b').
        replace(/\t/g, '\\t').
        replace(/\n/g, '\\n').
        replace(/\f/g, '\\f').
        replace(/\r/g, '\\r').
        replace(/'/g, '\\\'').
        replace(/"/g, '\\"');
    }

}