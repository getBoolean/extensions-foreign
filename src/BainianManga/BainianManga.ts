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
    TagType
  } from "paperback-extensions-common"
  import { generateSearch, isLastPage, parseChapterDetails, parseChapters, parseHomeSections, parseHotManga, parseNewManga, parseMangaDetails, parseSearch, parseTags, parseUpdatedManga, parseViewMore, UpdatedManga } from "./BainianMangaParser"
  
  const BM_DOMAIN = 'https://m.bnmanhua.com';
  const method = 'GET';
  const headers = {
      referer: BM_DOMAIN
  };
  
  export const BainianMangaInfo: SourceInfo = {
    version: '1.1.2',
    name: 'BainianManga (百年漫画)',
    icon: 'favicon.png',
    author: 'getBoolean',
    authorWebsite: 'https://github.com/getBoolean',
    description: 'Extension that pulls manga from BainianManga',
    hentaiSource: false,
    websiteBaseURL: `${BM_DOMAIN}/comic.html`,
    sourceTags: [
        {
            text: "Notifications",
            type: TagType.GREEN
        },
        {
            text: "中文",
            type: TagType.GREY
        }
    ]
  }
  
  export class BainianManga extends Source {
    getMangaShareUrl(mangaId: string): string | null { return `${BM_DOMAIN}/comic/${mangaId}` }
  
    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${BM_DOMAIN}/comic/`,
            method,
            param: `${mangaId}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)

        let result : [Manga, string] = parseMangaDetails($, mangaId)

        return result[0]
    }
  

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${BM_DOMAIN}/comic/`,
            method,
            param: `${mangaId}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseChapters($, mangaId)
    }
  

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        let request = createRequestObject({
            url: `${BM_DOMAIN}/comic/`,
            method,
            headers,
            param: `${mangaId}/${chapterId}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)

        return parseChapterDetails($, mangaId, chapterId, response.data)
    }
  

    async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        let page = 1
            let updatedManga: UpdatedManga = {
            ids: [],
            loadMore: true
        }

        while (updatedManga.loadMore) {
        const request = createRequestObject({
            url: `${BM_DOMAIN}/page/new/`,
            method,
            headers,
            param: `${String(page++)}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        updatedManga = parseUpdatedManga($, time, ids)

        if (updatedManga.ids.length > 0) {
            mangaUpdatesFoundCallback(createMangaUpdates({
            ids: updatedManga.ids
            }))
        }
        }
    }
  
 
    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        // Give Paperback a skeleton of what these home sections should look like to pre-render them

        const sectionRequests = [
            {
                request: createRequestObject({
                    url: `${BM_DOMAIN}/comic.html`,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'a_recommended',
                    title: '推荐漫画'
                }),
            },
            {
                request: createRequestObject({
                    url: `${BM_DOMAIN}/page/hot/1.html`,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'hot_comics',
                    title: '热门漫画',
                    view_more: true,
                }),
            },
            {
                request: createRequestObject({
                    url: `${BM_DOMAIN}/page/new/1.html`,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'z_new_updates',
                    title: '最近更新',
                    view_more: true
                }),
            },
        ]

        const promises: Promise<void>[] = []

        for (const sectionRequest of sectionRequests) {
            // Let the app load empty sections
            sectionCallback(sectionRequest.section)

            // Get the section data
            promises.push(
                this.requestManager.schedule(sectionRequest.request, 1).then(response => {
                    const $ = this.cheerio.load(response.data)
                    switch(sectionRequest.section.id) {
                        case 'a_recommended':
                            sectionRequest.section.items = parseHomeSections($)
                            break
                        case 'hot_comics':
                            sectionRequest.section.items = parseHotManga($)
                            break
                        case 'z_new_updates':
                            sectionRequest.section.items = parseNewManga($)
                            break
                        default:
                    }
                    sectionCallback(sectionRequest.section)
                }),
            )
        }

        // Make sure the function completes
        await Promise.all(promises)
    }
  

    async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {
        let page : number = metadata?.page ?? 1
        const search = generateSearch(query)
        const request = createRequestObject({
            url: `${BM_DOMAIN}/search/`,
            method,
            headers,
            param: `${search}/${page}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        const manga = parseSearch($)
        metadata = !isLastPage($) ? {page: page + 1} : undefined
        
        return createPagedResults({
            results: manga,
            metadata
        })
    }
  

    async getTags(): Promise<TagSection[] | null> {
        const request = createRequestObject({
            url: `${BM_DOMAIN}/page/list.html`,
            method,
            headers,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseTags($)
    }
  

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> {
        // console.log('getViewMoreItems($)')
        let page : number = metadata?.page ?? 1
        let param = ''
        if (homepageSectionId === 'hot_comics')
            param = `/page/hot/${page}.html`
        else if (homepageSectionId === 'z_new_updates')
            param = `/page/new/${page}.html`
        else return Promise.resolve(null)

        const request = createRequestObject({
            url: `${BM_DOMAIN}`,
            method,
            param,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        const manga = parseViewMore($)
        // console.log('isLastPage($) ' + isLastPage($))
        metadata = !isLastPage($) ? { page: page + 1 } : undefined

        return createPagedResults({
            results: manga,
            metadata
        })
    }
  

    globalRequestHeaders(): RequestHeaders {
        return {
            referer: BM_DOMAIN
        }
    }
  }