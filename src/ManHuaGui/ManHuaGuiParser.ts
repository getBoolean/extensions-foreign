import { Chapter, ChapterDetails, HomeSection, LanguageCode, Manga, MangaStatus, MangaTile, MangaUpdates, PagedResults, SearchRequest, TagSection } from "paperback-extensions-common";

// TODO: Remove before publishing
// const ChineseNumber = require('./external/chinese-numbers.js');
// TODO: Replace with minimized version before publishing
const LZString = require('./external/lz-string.js');

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): Manga => {
    const page = $('div.w998.bc.cf') ?? '';
    const infoBox = $('div.book-cont', page);
    const title : string = $('div.book-title h1', infoBox).text();
    const altTitle : string = $('div.book-title h2', infoBox).text();
    const isAltTitleEmpty : boolean = altTitle.length == 0;
    const image : string = $('div.book-cover p.hcover img', infoBox).attr('src') ?? '';

    const bookDetails = $('div.book-detail ul.detail-list', infoBox);
    let author = $('li:nth-child(2) span:nth-child(2) a', bookDetails).attr('title') ?? ''
    let artist = ''
    let rating = $('p.score-avg em', page).text()

    // "连载中" -> ONGOING
    // "已完结" -> COMPLETED
    // "連載中" -> ONGOING
    // "已完結" -> COMPLETED
    let statusText : string = $('li.status span span', bookDetails).first().text();
    let status : MangaStatus;
    if (statusText == '连载中' || statusText == '連載中')
        status = MangaStatus.ONGOING;
    else
        status = MangaStatus.COMPLETED;

    let titles = isAltTitleEmpty ? [title] : [title, altTitle];
    let follows = 0
    let views = 0
    let lastUpdate = $('li.status span span:nth-child(3)', bookDetails).text()
    let hentai = false

    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] })]
    
    const elems = $("span:contains(漫画剧情) > a , span:contains(漫畫劇情) > a").toArray()
    tagSections[0].tags = elems.map((elem) => createTag({ 
        id: ($(elem).attr('href') ?? '').replace('/list/', '').replace('/', ''),
        label: $(elem).attr('title') ?? '' }))

    const time = new Date(lastUpdate)
    lastUpdate = time.toDateString()

    const summary = $('div#intro-all').text().trim();

    return createManga({
        id: mangaId,
        titles,
        image,
        rating: Number(rating),
        status,
        artist,
        author,
        tags: tagSections,
        views,
        follows,
        lastUpdate,
        desc: summary,
        hentai
    });
}


export const parseChapters = (cheerio : CheerioAPI, $: CheerioStatic, mangaId: string): Chapter[] => {
    const page = $('div.w998.bc.cf') ?? '';


    // Try to get R18 manga hidden chapter list
    // Credit to tachiyomi for this impl
    // https://github.com/tachiyomiorg/tachiyomi-extensions/blob/master/src/zh/manhuagui/src/eu/kanade/tachiyomi/extension/zh/manhuagui/Manhuagui.kt
    const hiddenEncryptedChapterList = $("#__VIEWSTATE");
    if (hiddenEncryptedChapterList != null) {
        // Hidden chapter list is LZString encoded
        const encryptedValue : string = $(hiddenEncryptedChapterList).attr('value') ?? '';
        const decodedHiddenChapterList = LZString.decompressFromBase64(encryptedValue);
        $('#erroraudit_show', page).replaceWith(decodedHiddenChapterList)

    }
    
    const chapterList = $("ul > li > a.status0");
    const allChapters = chapterList.toArray()
    const chapters: Chapter[] = [];

    for (let chapter of allChapters) {
        const id: string = ( $(chapter).attr("href")?.split('/').pop() ?? '' ).replace('.html', '')
        const name: string = $(chapter).attr("title")?.trim() ?? ''
        // Commented out since I haven't found any cases of chapter numbers written with chinese characters
        // const convertedString = new ChineseNumber(name).toArabicString();
        const chapNum: number = Number(name.match(/\d+/) ?? 0 )
        // Manhuagui only provides upload date for latest chapter
        const timeText : string = $('li.status span span:nth-child(3)', page).text()
        const time = new Date(timeText)
        chapters.push(createChapter({
            id,
            mangaId,
            name,
            langCode: LanguageCode.CHINEESE,
            chapNum,
            time
        }))
    }
    return chapters
}


export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string, data: any): ChapterDetails => {
    const json = $('[type=application\\/ld\\+json]').html()?.replace(/\t*\n*/g, '') ?? '';
    const parsedJson = JSON.parse(json)
    const firstImageUrl = parsedJson.images[0];
    const baseUrlStartingPosition : number = firstImageUrl.indexOf('//') + 2;
    const baseImageURL = firstImageUrl.slice(0, firstImageUrl.indexOf('/', baseUrlStartingPosition));
    const imageCodes = data?.match(/var z_img='(.*?)';/)?.pop();

    let pages : string[] = []
    if (imageCodes) {
        const imagePaths = JSON.parse(imageCodes) as string[]
        pages = imagePaths.map(imagePath => `${baseImageURL}/${imagePath}`)
    }
    // console.log(pages)

    return createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages,
        longStrip: false
    })
}


export interface UpdatedManga {
    ids: string[];
    loadMore: boolean;
}


export const parseUpdatedManga = ($: CheerioStatic, time: Date, ids: string[]): UpdatedManga => {
    const foundIds: string[] = []
    let passedReferenceTime = false
    const panel = $('.tbox_m')
    const allItems = $('.vbox', panel).toArray()
    for (const item of allItems) {
        const id = (($('a', item).first().attr('href') ?? '').split('/').pop() ?? '' ).replace('.html', '')
        let mangaTime = new Date($($(item).find('h4')[1]).text())

        passedReferenceTime = mangaTime > time
        if (passedReferenceTime) {
            if (ids.includes(id)) {
                foundIds.push(id)
            }
        }
        else break
    }

    return {
        ids: foundIds,
        loadMore: passedReferenceTime
    }
}


export const parseHomeSections = ($: CheerioStatic): MangaTile[] => {
    const recommendedManga: MangaTile[] = []

    // Recommended
    const grid = $('.tbox_m')[0]
    const allItems = $('.vbox', grid).toArray()
    for (const item of allItems) {
        const id = (($('a', item).first().attr('href') ?? '').split('/').pop() ?? '' ).replace('.html', '')
        const title = $('.vbox_t', item).attr('title') ?? 'No title'
        const subtitle = $('.vbox_t span', item).text()
        const image = $('.vbox_t mip-img', item).attr('src') ?? ''

        recommendedManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle })
        }))
    }

    return recommendedManga
}


export const parseHotManga = ($: CheerioStatic): MangaTile[] => {
    const hotManga: MangaTile[] = []

    // New
    const grid = $('.tbox_m')[0]
    const allItems = $('.vbox', grid).toArray()
    for (const item of allItems) {
        const id = (($('a', item).first().attr('href') ?? '').split('/').pop() ?? '' ).replace('.html', '')
        const title = $('.vbox_t', item).attr('title') ?? 'No title'
        const subtitle = $('.vbox_t span', item).text()
        const image = $('.vbox_t mip-img', item).attr('src') ?? ''

        hotManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle })
        }))
    }

    return hotManga
}


export const parseNewManga = ($: CheerioStatic): MangaTile[] => {
    const newManga: MangaTile[] = []

    // New
    const grid = $('.tbox_m')[0]
    const allItems = $('.vbox', grid).toArray()
    for (const item of allItems) {
        const id = (($('a', item).first().attr('href') ?? '').split('/').pop() ?? '' ).replace('.html', '')
        const title = $('.vbox_t', item).attr('title') ?? 'No title'
        const subtitle = $('.vbox_t span', item).text()
        const image = $('.vbox_t mip-img', item).attr('src') ?? ''

        newManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle })
        }))
    }

    return newManga
}


export const generateSearch = (query: SearchRequest): string => {

    let keyword = (query.title ?? '').replace(/ /g, '+')
    if (query.author)
        keyword += (query.author ?? '').replace(/ /g, '+')
    let search: string = `${keyword}`

    return search
}


export const parseSearch = ($: CheerioStatic): MangaTile[] => {
    const panel = $('.tbox_m')
    const allItems = $('.vbox', panel).toArray()
    const manga: MangaTile[] = []
    for (const item of allItems) {
        const id = (($('a', item).first().attr('href') ?? '').split('/').pop() ?? '' ).replace('.html', '')
        const title = $('.vbox_t', item).attr('title') ?? 'No title'
        const subtitle = $('.vbox_t span', item).text()
        const image = $('.vbox_t mip-img', item).attr('src') ?? ''

        manga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }))
    }
    return manga
}


export const parseTags = ($: CheerioStatic): TagSection[] | null => {
    const allItems = $('.tbox a').toArray()
    const genres = createTagSection({
        id: 'genre',
        label: 'Genre',
        tags: []
    })
    for (let item of allItems) {
        let label = $(item).text()
        genres.tags.push(createTag({ id: label, label: label }))
    }
    return [genres]
}


export const parseViewMore = ($: CheerioStatic): MangaTile[] => {
    console.log('parseViewMore($)')
    const panel = $('.tbox_m')
    const allItems = $('.vbox', panel).toArray()
    const manga: MangaTile[] = []
    for (const item of allItems) {
        const id = (($('a', item).first().attr('href') ?? '').split('/').pop() ?? '' ).replace('.html', '')
        const title = $('.vbox_t', item).attr('title') ?? 'No title'
        const subtitle = $('.vbox_t span', item).text()
        const image = $('.vbox_t mip-img', item).attr('src') ?? ''

        manga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }))
    }
    return manga
}


export const isLastPage = ($: CheerioStatic): boolean => {
    // see if the button is disabled
    return $('li', $('.pagination')).last().hasClass('disabled');
}