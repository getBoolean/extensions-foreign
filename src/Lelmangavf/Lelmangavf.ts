import {
    Source,
    Manga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    TagSection,
    PagedResults,
    SourceInfo,
    MangaUpdates,
    RequestHeaders,
    TagType,
    MangaTile
} from "paperback-extensions-common"
import { LelmangavfParser, } from './LelmangavfParser'

const LM_DOMAIN = 'https://www.lelmangavf.com';
const method = 'GET';
const headers = {
    referer: LM_DOMAIN
};

export const LelmangavfInfo: SourceInfo = {
    version: '2.0.0',
    name: 'Lelmangavf',
    icon: 'default_favicon.png',
    author: 'getBoolean',
    authorWebsite: 'https://github.com/getBoolean',
    description: 'Extension that pulls manga from Lelmangavf',
    hentaiSource: false,
    websiteBaseURL: LM_DOMAIN,
    sourceTags: [
        {
            text: "Notifications",
            type: TagType.GREEN
        },
        {
            text: "French",
            type: TagType.GREY
        }
    ]
}

export class Lelmangavf extends Source {
    parser = new LelmangavfParser()

    collectedIds: string[] = []

    getMangaShareUrl(mangaId: string): string | null {
        return `${LM_DOMAIN}/scan-manga/${mangaId}`
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {

        let request = createRequestObject({
            url: `${LM_DOMAIN}/scan-manga/${mangaId}`,
            method
        })
        const response = await this.requestManager.schedule(request, 1)

        let $ = this.cheerio.load(response.data)

        return this.parser.parseMangaDetails($, mangaId)
    }


    async getChapters(mangaId: string): Promise<Chapter[]> {
        let chapters: Chapter[] = []
        let pageRequest = createRequestObject({
            url: `${LM_DOMAIN}/scan-manga/${mangaId}`,
            method
        })
        const response = await this.requestManager.schedule(pageRequest, 1)
        let $ = this.cheerio.load(response.data)
        chapters = chapters.concat(this.parser.parseChapterList($, mangaId, this))

        return chapters
    }


    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {

        let request = createRequestObject({
            url: chapterId,
            method,
        })

        let response = await this.requestManager.schedule(request, 1)

        let $ = this.cheerio.load(response.data)
        let pages: string[] = this.parser.parseChapterDetails($)

        return createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
            longStrip: false
        })
    }

    async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {

        let loadNextPage: boolean = true
        let currPageNum: number = 1

        while (loadNextPage) {

            let request = createRequestObject({
                url: `${LM_DOMAIN}/latest-release?page=${currPageNum}`,
                method
            })

            let response = await this.requestManager.schedule(request, 1)
            let $ = this.cheerio.load(response.data)

            let updatedManga = this.parser.filterUpdatedManga($, time, ids, this)
            loadNextPage = updatedManga.loadNextPage
            if (loadNextPage) {
                currPageNum++
            }
            if (updatedManga.updates.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.updates
                }))
            }
        }
    }

    async searchRequest(query: SearchRequest, _metadata: any): Promise<PagedResults> {
        const request = createRequestObject({
            url: `${LM_DOMAIN}/search`,
            method,
        })
        const response = await this.requestManager.schedule(request, 1)
        // const $ = this.cheerio.load(response.data)
        const manga = this.parser.parseSearchResults(query, response.data)

        return createPagedResults({
            results: manga,
        })

    }


    async getTags(): Promise<TagSection[] | null> {
        const request = createRequestObject({
            url: `${LM_DOMAIN}/scan-manga-list`,
            method
        })

        const response = await this.requestManager.schedule(request, 1)
        let $ = this.cheerio.load(response.data)

        return this.parser.parseTags($)
    }


    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const sectionsRequests = [
            {
                request: createRequestObject({
                    url: `${LM_DOMAIN}`,
                    method
                }),
                section: createHomeSection({
                    id: 'popularUpdates',
                    title: 'Mises à jour des Manga populaires',
                    view_more: false,
                }),
            },
            {
                request: createRequestObject({
                    url: `${LM_DOMAIN}/scan-manga-list`,
                    method
                }),
                section: createHomeSection({
                    id: 'zAll',
                    title: 'Annuaire des Manga',
                    view_more: true,
                }),
            },
            {
                request: createRequestObject({
                    url: `${LM_DOMAIN}/latest-release`,
                    method
                }),
                section: createHomeSection({
                    id: 'recentUpdates',
                    title: 'Dernières mises à jour Manga',
                    view_more: true
                }),
            },
        ]

        const promises: Promise<void>[] = []

        for (const sectionRequest of sectionsRequests) {
            // Let the app load empty sections
            sectionCallback(sectionRequest.section)

            // Get the section data
            promises.push(
                this.requestManager.schedule(sectionRequest.request, 1).then(response => {
                    const $ = this.cheerio.load(response.data)
                    
                    switch (sectionRequest.section.id) {
                        case 'popularUpdates':
                            sectionRequest.section.items = this.parser.parsePopularMangaTiles($);
                            break;
                        case 'zAll':
                            sectionRequest.section.items = this.parser.parseAllMangaTiles($);
                            break;
                        case 'recentUpdates':
                            this.collectedIds = []
                            let data = this.parser.parseLatestMangaTiles($, this.collectedIds, 1);
                            sectionRequest.section.items = data[0]
                            this.collectedIds = data[1]
                            break;
                        default:
                            console.log('getHomePageSections(): Invalid section ID')
                    }

                    sectionCallback(sectionRequest.section)
                }),
            )
        }

        // Make sure the function completes
        await Promise.all(promises)
    }


    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> {
        if (metadata == null) {
            this.collectedIds = []
        }

        let param = ''
        let page: number = metadata?.page ?? 1
        switch (homepageSectionId) {
            case 'zAll': {
                param = `scan-manga-list?page=${page}`
                break
            }
            case 'recentUpdates': {
                param = `latest-release?page=${page}`
                break
            }
            default:
                return Promise.resolve(null)
        }

        let request = createRequestObject({
            url: `${LM_DOMAIN}/${param}`,
            method
        })

        let data = await this.requestManager.schedule(request, 1)
        let $ = this.cheerio.load(data.data)
        
        let manga: MangaTile[] = [];
        switch (homepageSectionId) {
            case 'zAll':
              manga = this.parser.parseAllMangaTiles($);
              break;
            case 'recentUpdates':
              let result = this.parser.parseLatestMangaTiles($, this.collectedIds, page);
              manga = result[0]
              this.collectedIds = result[1]
              break;
            default:
        }

        let mData
        if (!this.parser.isLastPage($)) {
            mData = { page: (page + 1) }
        } else {
            mData = undefined  // There are no more pages to continue on to, do not provide page metadata
        }

        return createPagedResults({
            results: manga,
            metadata: mData
        })
    }

    getCloudflareBypassRequest() {
        return createRequestObject({
            url: `${LM_DOMAIN}`,
            method,
        })
    }

    protected convertTime(timeAgo: string): Date {
        let time: Date

        if (timeAgo.includes('/')) {
            const dateParts = timeAgo.split("/");
            timeAgo = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
        }

        if (timeAgo === 'Hier') { // Yesterday
            time = new Date()
            time.setDate(time.getDate() - 1);
        } else if (timeAgo.match(/^([^0-9]*)$/)) { // Today (no numbers)
            time = new Date(Date.now())
        } else {
            time = new Date(timeAgo)
        }

        return time
    }

}