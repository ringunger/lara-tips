
export class LaraTips {
    tipsPath;
    loaded;
    error;
    #tipsCache = new Map();

    constructor(tipsPath) {
        this.tipsPath = tipsPath ?? './laravel-tips/';
        this.loaded = false;
        this.error = null;
    }

    /**
     * Load the main list of sections from the README table of contents.
     * @returns {Promise<*[]>}
     */
    getSections = async () => {
        this.error = null;
        try {
            const readme = await this.getFileContent('./laravel-tips/README.md');
            const readmeContents = this.extractSections(readme, 2);
            const tableOfContents = readmeContents.find((item) => item[0] === 'Table of contents');

            if (!tableOfContents) {
                throw new Error('Could not find a table of contents in the README.');
            }

            const sections = this.extractTableOfContents(tableOfContents[1]);
            this.loaded = true;
            return sections;
        } catch (e) {
            console.error(e);
            this.error = 'Unable to load the list of tip categories. Please try again.';
            this.loaded = false;
            return [];
        }
    };

    /**
     * Load tips from a MarkDown file. Results are cached per file so re-opening
     * a section doesn't trigger another network request.
     * @param filePath
     * @returns {Promise<{title: *, content: *}[]|*[]>}
     */
    loadTips = async (filePath) => {
        if (this.#tipsCache.has(filePath)) {
            return this.#tipsCache.get(filePath);
        }

        try {
            const contents = await this.getFileContent(this.tipsPath + filePath);
            const tipBlocks = this.extractSections(contents, 3);
            const tips = tipBlocks.map((item) => ({
                title: item[0]?.trim(),
                content: item[1]
            }));
            this.#tipsCache.set(filePath, tips);
            return tips;
        } catch (e) {
            console.error(e);
            this.error = 'Unable to load tips for this category. Please try again.';
            return [];
        }
    };

    /**
     * Load every category for the global search, preserving its category
     * metadata on each result. Individual files remain cached by loadTips().
     * @param {{title: string, file: string}[]} sections
     * @returns {Promise<{title: string, content: string, sectionFile: string, sectionTitle: string}[]>}
     */
    loadAllTips = async (sections) => {
        const groups = await Promise.all(sections.map(async (section) => {
            const tips = await this.loadTips(section.file);
            return tips.map((tip) => ({
                ...tip,
                sectionFile: section.file,
                sectionTitle: section.title,
            }));
        }));

        return groups.flat();
    };

    /**
     * Pick one random tip from a random section. Used for the "Surprise me" action.
     * @param sections
     * @returns {Promise<{section: *, tip: *}|null>}
     */
    getRandomTip = async (sections) => {
        if (!sections || !sections.length) return null;
        const section = sections[Math.floor(Math.random() * sections.length)];
        const tips = await this.loadTips(section.file);
        if (!tips.length) return null;
        const tip = tips[Math.floor(Math.random() * tips.length)];
        return { section, tip };
    };

    /**
     * Get the text content of a file, throwing on network/HTTP failures.
     * @param filePath
     * @returns {Promise<string>}
     */
    getFileContent = async (filePath) => {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    };

    /**
     * Extract sections based on level of heading
     * @param content
     * @param headingLevel
     * @returns {*[]}
     */
    extractSections = (content, headingLevel = 2) => {
        const fileDelimiter = '::::';
        const hashes = ''.padStart(headingLevel, '#');
        const regexPattern = new RegExp(`^${hashes} (.*)\\s+([\\s\\S]*?)(?=^${hashes} |::::$)`, 'gm');
        content = content.toString().replace(/\n{2}/g, '\n');
        const matches = [];
        let match;
        while ((match = regexPattern.exec(content.toString() + fileDelimiter))) {
            matches.push(match.slice(1));
        }
        return matches;
    };

    /**
     * Extract table of contents entries (title, file, tip count) from the
     * "Table of contents" markdown section.
     * @param mdString
     * @returns {*[]}
     */
    extractTableOfContents = (mdString) => {
        const regex = /(- (\[.*)\n)/g;
        const matches = mdString.toString().match(regex) ?? [];
        const tableOfContents = [];
        matches.forEach((item) => {
            const regex2 = /\[(.*)\]\((.*)\) \((.*)\)\n/;
            const parts = item.toString().match(regex2);
            if (!parts) return;
            tableOfContents.push({
                title: parts[1],
                file: parts[2],
                tips: parts[3].toString().replace(' tips', '').replace(' tip', '')
            });
        });
        return tableOfContents;
    };
}
