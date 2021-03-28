import {Chapter, Manga, MangaStatus, MangaTile, Tag, TagSection, SearchRequest} from 'paperback-extensions-common'
import {reverseLangCode} from "./Languages"

const LM_DOMAIN = 'https://www.lelmangavf.com';

export class LelmangavfParser {


    parseMangaDetails($: CheerioSelector, mangaId: string): Manga {
        const panel = $('.row').first();
        const table = $('.dl-horizontal', panel).first();
        const title = $('.widget-title', panel).first().text() ?? 'No title';
        const titles = [this.decodeHTMLEntity(title)]
        const image = ($('img', panel).attr('src') ?? '' ).replace('//', 'https://');
        const author = $('.dl-horizontal dd:nth-child(6)').text().replace(/\r?\n|\r/g, '');
        const artist = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '');
        const rating = Number($(".rating div[id='item-rating']").attr('data-score'));
        const status = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '').trim() == 'Ongoing' ? MangaStatus.ONGOING : MangaStatus.COMPLETED;
        const arrayTags: Tag[] = []
        let hentai = false;

        // Categories
        const tableElements = $('.dl-horizontal').children().toArray()
        const tableElementsText = tableElements.map(x => $(x).text().trim())
        
        if (tableElementsText.indexOf('Catégories') !== -1) {
            const categoryIndex = tableElementsText.indexOf('Catégories') + 1
            const categories = $(tableElements[categoryIndex]).find('a').toArray()

            for (const category of categories) {
                const label = $(category).text()
                const id = $(category).attr('href')?.split('/').pop() ?? label
                if (['Mature'].includes(label)) {
                    hentai = true;
                }
                arrayTags.push({ id: id, label: label })
            }
        }

        // Genres
        $('.tag-links a', table).each((i, tag) => {
            const label = $(tag).text()
            const id = $(tag).attr('href')?.split('/').pop() ?? label
            if (['Mature'].includes(label)) {
                hentai = true;
            }
            if (!arrayTags.includes({ id: id, label: label })) {
                arrayTags.push({ id: id, label: label })
            }
        })

        const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];

        // Date
        const dateModified = $('.chapters .date-chapter-title-rtl').first().text().trim() ?? '';
        const time = new Date(dateModified);
        const lastUpdate = time.toDateString();

        // Alt Titles
        const altTitles = $('.dl-horizontal dd:nth-child(4)').text().trim().split(', ');
        for (const alt of altTitles) {
            const parsedAlt = (this.decodeHTMLEntity(alt)).trim();
            titles.push(parsedAlt);
        }

        // Description
        let summary = $('.well', panel).children().last().text().replace(/^\s+|\s+$/g, '');

        return createManga({
            id: mangaId,
            titles,
            image,
            rating: Number(rating),
            status,
            artist,
            author: this.decodeHTMLEntity(author ?? ''),
            tags: tagSections,
            // views,
            // follows,
            lastUpdate,
            desc: this.decodeHTMLEntity(summary),
            hentai
        })
    }


    parseChapterList($: CheerioSelector, mangaId: string, source: any): Chapter[] {
        const chapters: Chapter[] = []
        const allChapters = $('.chapters li[class^="volume-"]').toArray()
        for (const chapter of allChapters) {
            const item = $('.chapter-title-rtl', chapter);
            const chapterId = $('a', item).attr('href');
            const name: string = $('em', item).text()
            const chapGroup: string = $(chapter).attr('class') ?? ''
            let chapNum: number = Number($('a', item).text().split(' ').pop())
            if (isNaN(chapNum)) {
                chapNum = 0
            }

            const language = $('html').attr('lang') ?? 'fr'
            const time = source.convertTime($('.action .date-chapter-title-rtl', chapter).text().trim())
            if (typeof chapterId === 'undefined') continue
            chapters.push(createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: chapNum,
                group: this.decodeHTMLEntity(chapGroup),
                langCode: reverseLangCode[language] ?? reverseLangCode['_unknown'],
                name: this.decodeHTMLEntity(name),
                time: time
            }))
        }
        return chapters
    }

    parseChapterDetails($: CheerioSelector): string[] {
        const pages: string[] = []
        
        // Get all of the pages
        const allItems = $('div[id="all"] img', '.col-sm-8').toArray();
        for(const item of allItems)
        {
            const page = $(item).attr('data-src')?.replace(' //', 'https://').trim();
            // If page is undefined, dont push it
            if (typeof page === 'undefined')
                continue;

            pages.push(page);
        }

        return pages
    }

    filterUpdatedManga($: CheerioSelector, time: Date, ids: string[], source: any): { updates: string[], loadNextPage: boolean } {
        const foundIds: string[] = []
        let passedReferenceTime = false
        const panel = $('.mangalist');
        const allItems = $('.manga-item', panel).toArray();

        for (const item of allItems) {
            const url = $('a', item).first().attr('href');
            const urlSplit = url?.split('/');
            const id = urlSplit?.pop();
            if (typeof id === 'undefined') continue

            const mangaTime = source.convertTime($('.pull-right', item).text().trim())
            passedReferenceTime = mangaTime <= time
            if (!passedReferenceTime) {
                if (ids.includes(id)) {
                    foundIds.push(id)
                }
            } else break
        }
        if (!passedReferenceTime) {
            return {updates: foundIds, loadNextPage: true}
        } else {
            return {updates: foundIds, loadNextPage: false}
        }


    }

    parseSearchResults(query: any, data: any): MangaTile[] {
        const parsedJSON = JSON.parse(data)
        const suggestions = parsedJSON['suggestions']
        const mangaTiles: MangaTile[] = []

        for(const manga of suggestions) {
            if((manga.value).toLowerCase().includes(query.title?.toLowerCase() ?? '')) {
                const id = manga.data
                const image = `${LM_DOMAIN}/uploads/manga/${id}/cover/cover_250x350.jpg`
                const title = manga.value
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: this.decodeHTMLEntity(title)}),
                    subtitleText: createIconText({text: ''}),
                    image: image
                }))
            }
        }

        return mangaTiles
    }

    parseTags($: CheerioSelector): TagSection[] {

        const arrayTags: Tag[] = []

        // Categories
        const categories = $('.list-category li').toArray()

        for (const category of categories) {
            const label = $(category).text()
            const id = $(category).attr('href')?.split('/').pop() ?? label
            arrayTags.push({ id: id, label: label })
        }

        // Genres
        $('.tag-links a').each((i, tag) => {
            const label = $(tag).text().trim()
            const id = $(tag).attr('href')?.split('/').pop() ?? label
            if (!arrayTags.includes({ id: id, label: label })) {
                arrayTags.push({ id: id, label: label })
            }
            
        })
        const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];


        return tagSections
    }

    parsePopularMangaTiles($: CheerioSelector): MangaTile[] {
        const tiles: MangaTile[] = []
        const collectedIds: string[] = []

        const panel = $('.hot-thumbnails');
        const allItems = $('.span3', panel).toArray();
        for (const item of allItems) {
            const url = $('a', item).first().attr('href');
            const urlSplit = url?.split('/');
            const id = urlSplit?.pop();
            const titleText = this.decodeHTMLEntity($('.label-warning', item).text().trim())
            const subtitle = this.decodeHTMLEntity($('p', item).text().trim());
            const image = $('img', item).first().attr('src')?.replace('//', 'https://');

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if (!collectedIds.includes(id)) {
                tiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    subtitleText: createIconText({text: subtitle}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return tiles
    }

    parseAllMangaTiles($: CheerioSelector): MangaTile[] {
        const tiles: MangaTile[] = []
        const collectedIds: string[] = []

        const panel = $('.content');
        const allItems = $('.col-sm-6', panel).toArray();
        for (const item of allItems) {
            const url = $('a', item).first().attr('href');
            const urlSplit = url?.split('/');
            const id = urlSplit?.pop();
            const titleText = this.decodeHTMLEntity($('.chart-title', item).text().trim())
            const subtitle = $('.media-body div[style^="position"] a', item).text().trim()
            const image = $('img', item).first().attr('src')?.replace('//', 'https://');

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if (!collectedIds.includes(id)) {
                tiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    subtitleText: createIconText({text: this.decodeHTMLEntity(subtitle)}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return tiles
    }

    // Maintain a set as a class variable and reset it everytime 'getViewMoreItems'
    // is called with null metadata. Check it for duplicate ids
    // Loading the next page is temp disabled until this is fixed
    parseLatestMangaTiles($: CheerioSelector, collectedIds: string[], page: number): [MangaTile[], string[]] {
        const tiles: MangaTile[] = []
        if (page === 1) {
            collectedIds = []
        }
        const panel = $('.mangalist');
        const allItems = $('.manga-item', panel).toArray();
        for (const item of allItems) {
            const url = $('a', item).first().attr('href');
            const urlSplit = url?.split('/');
            const id = urlSplit?.pop();
            const titleText = this.decodeHTMLEntity($('a:nth-child(2)', item).text().trim())
            const subtitle = this.decodeHTMLEntity($('a:nth-child(1)', item).first().text().trim());
            const image = `${LM_DOMAIN}/uploads/manga/${id}/cover/cover_250x350.jpg`;

            if (typeof id === 'undefined') continue
            if (!collectedIds.includes(id)) {
                tiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    subtitleText: createIconText({text: subtitle}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return [tiles, collectedIds]
    }

    isLastPage($: CheerioSelector): boolean {
        return $('ul.pagination li').last().hasClass('disabled');
    }

    decodeHTMLEntity(str: string): string {
        return str.replace(/&#(\d+);/g, function (match, dec) {
            return String.fromCharCode(dec);
        })
    }

}
