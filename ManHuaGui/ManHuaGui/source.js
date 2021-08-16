(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
class Source {
    constructor(cheerio) {
        // <-----------        OPTIONAL METHODS        -----------> //
        /**
         * Manages the ratelimits and the number of requests that can be done per second
         * This is also used to fetch pages when a chapter is downloading
         */
        this.requestManager = createRequestManager({
            requestsPerSecond: 2.5,
            requestTimeout: 5000
        });
        this.cheerio = cheerio;
    }
    /**
     * (OPTIONAL METHOD) This function is called when ANY request is made by the Paperback Application out to the internet.
     * By modifying the parameter and returning it, the user can inject any additional headers, cookies, or anything else
     * a source may need to load correctly.
     * The most common use of this function is to add headers to image requests, since you cannot directly access these requests through
     * the source implementation itself.
     *
     * NOTE: This does **NOT** influence any requests defined in the source implementation. This function will only influence requests
     * which happen behind the scenes and are not defined in your source.
     */
    globalRequestHeaders() { return {}; }
    globalRequestCookies() { return []; }
    /**
     * A stateful source may require user input.
     * By supplying this value to the Source, the app will render your form to the user
     * in the application settings.
     */
    getAppStatefulForm() { return createUserForm({ formElements: [] }); }
    /**
     * When the Advanced Search is rendered to the user, this skeleton defines what
     * fields which will show up to the user, and returned back to the source
     * when the request is made.
     */
    getAdvancedSearchForm() { return createUserForm({ formElements: [] }); }
    /**
     * (OPTIONAL METHOD) Given a manga ID, return a URL which Safari can open in a browser to display.
     * @param mangaId
     */
    getMangaShareUrl(mangaId) { return null; }
    /**
     * If a source is secured by Cloudflare, this method should be filled out.
     * By returning a request to the website, this source will attempt to create a session
     * so that the source can load correctly.
     * Usually the {@link Request} url can simply be the base URL to the source.
     */
    getCloudflareBypassRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which communicates with a given source, and returns a list of all possible tags which the source supports.
     * These tags are generic and depend on the source. They could be genres such as 'Isekai, Action, Drama', or they can be
     * listings such as 'Completed, Ongoing'
     * These tags must be tags which can be used in the {@link searchRequest} function to augment the searching capability of the application
     */
    getTags() { return Promise.resolve(null); }
    /**
     * (OPTIONAL METHOD) A function which should scan through the latest updates section of a website, and report back with a list of IDs which have been
     * updated BEFORE the supplied timeframe.
     * This function may have to scan through multiple pages in order to discover the full list of updated manga.
     * Because of this, each batch of IDs should be returned with the mangaUpdatesFoundCallback. The IDs which have been reported for
     * one page, should not be reported again on another page, unless the relevent ID has been detected again. You do not want to persist
     * this internal list between {@link Request} calls
     * @param mangaUpdatesFoundCallback A callback which is used to report a list of manga IDs back to the API
     * @param time This function should find all manga which has been updated between the current time, and this parameter's reported time.
     *             After this time has been passed, the system should stop parsing and return
     */
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) { return Promise.resolve(); }
    /**
     * (OPTIONAL METHOD) A function which should readonly allf the available homepage sections for a given source, and return a {@link HomeSection} object.
     * The sectionCallback is to be used for each given section on the website. This may include a 'Latest Updates' section, or a 'Hot Manga' section.
     * It is recommended that before anything else in your source, you first use this sectionCallback and send it {@link HomeSection} objects
     * which are blank, and have not had any requests done on them just yet. This way, you provide the App with the sections to render on screen,
     * which then will be populated with each additional sectionCallback method called. This is optional, but recommended.
     * @param sectionCallback A callback which is run for each independant HomeSection.
     */
    getHomePageSections(sectionCallback) { return Promise.resolve(); }
    /**
     * (OPTIONAL METHOD) This function will take a given homepageSectionId and metadata value, and with this information, should return
     * all of the manga tiles supplied for the given state of parameters. Most commonly, the metadata value will contain some sort of page information,
     * and this request will target the given page. (Incrementing the page in the response so that the next call will return relevent data)
     * @param homepageSectionId The given ID to the homepage defined in {@link getHomePageSections} which this method is to readonly moreata about
     * @param metadata This is a metadata parameter which is filled our in the {@link getHomePageSections}'s return
     * function. Afterwards, if the metadata value returned in the {@link PagedResults} has been modified, the modified version
     * will be supplied to this function instead of the origional {@link getHomePageSections}'s version.
     * This is useful for keeping track of which page a user is on, pagnating to other pages as ViewMore is called multiple times.
     */
    getViewMoreItems(homepageSectionId, metadata) { return Promise.resolve(null); }
    /**
     * (OPTIONAL METHOD) This function is to return the entire library of a manga website, page by page.
     * If there is an additional page which needs to be called, the {@link PagedResults} value should have it's metadata filled out
     * with information needed to continue pulling information from this website.
     * Note that if the metadata value of {@link PagedResults} is undefined, this method will not continue to run when the user
     * attempts to readonly morenformation
     * @param metadata Identifying information as to what the source needs to call in order to readonly theext batch of data
     * of the directory. Usually this is a page counter.
     */
    getWebsiteMangaDirectory(metadata) { return Promise.resolve(null); }
    // <-----------        PROTECTED METHODS        -----------> //
    // Many sites use '[x] time ago' - Figured it would be good to handle these cases in general
    convertTime(timeAgo) {
        var _a;
        let time;
        let trimmed = Number(((_a = /\d*/.exec(timeAgo)) !== null && _a !== void 0 ? _a : [])[0]);
        trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
        if (timeAgo.includes('minutes')) {
            time = new Date(Date.now() - trimmed * 60000);
        }
        else if (timeAgo.includes('hours')) {
            time = new Date(Date.now() - trimmed * 3600000);
        }
        else if (timeAgo.includes('days')) {
            time = new Date(Date.now() - trimmed * 86400000);
        }
        else if (timeAgo.includes('year') || timeAgo.includes('years')) {
            time = new Date(Date.now() - trimmed * 31556952000);
        }
        else {
            time = new Date(Date.now());
        }
        return time;
    }
    /**
     * When a function requires a POST body, it always should be defined as a JsonObject
     * and then passed through this function to ensure that it's encoded properly.
     * @param obj
     */
    urlEncodeObject(obj) {
        let ret = {};
        for (const entry of Object.entries(obj)) {
            ret[encodeURIComponent(entry[0])] = encodeURIComponent(entry[1]);
        }
        return ret;
    }
}
exports.Source = Source;

},{}],3:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Source"), exports);

},{"./Source":2}],4:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./base"), exports);
__exportStar(require("./models"), exports);
__exportStar(require("./APIWrapper"), exports);

},{"./APIWrapper":1,"./base":3,"./models":25}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],6:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],7:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],8:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCode = void 0;
var LanguageCode;
(function (LanguageCode) {
    LanguageCode["UNKNOWN"] = "_unknown";
    LanguageCode["BENGALI"] = "bd";
    LanguageCode["BULGARIAN"] = "bg";
    LanguageCode["BRAZILIAN"] = "br";
    LanguageCode["CHINEESE"] = "cn";
    LanguageCode["CZECH"] = "cz";
    LanguageCode["GERMAN"] = "de";
    LanguageCode["DANISH"] = "dk";
    LanguageCode["ENGLISH"] = "gb";
    LanguageCode["SPANISH"] = "es";
    LanguageCode["FINNISH"] = "fi";
    LanguageCode["FRENCH"] = "fr";
    LanguageCode["WELSH"] = "gb";
    LanguageCode["GREEK"] = "gr";
    LanguageCode["CHINEESE_HONGKONG"] = "hk";
    LanguageCode["HUNGARIAN"] = "hu";
    LanguageCode["INDONESIAN"] = "id";
    LanguageCode["ISRELI"] = "il";
    LanguageCode["INDIAN"] = "in";
    LanguageCode["IRAN"] = "ir";
    LanguageCode["ITALIAN"] = "it";
    LanguageCode["JAPANESE"] = "jp";
    LanguageCode["KOREAN"] = "kr";
    LanguageCode["LITHUANIAN"] = "lt";
    LanguageCode["MONGOLIAN"] = "mn";
    LanguageCode["MEXIAN"] = "mx";
    LanguageCode["MALAY"] = "my";
    LanguageCode["DUTCH"] = "nl";
    LanguageCode["NORWEGIAN"] = "no";
    LanguageCode["PHILIPPINE"] = "ph";
    LanguageCode["POLISH"] = "pl";
    LanguageCode["PORTUGUESE"] = "pt";
    LanguageCode["ROMANIAN"] = "ro";
    LanguageCode["RUSSIAN"] = "ru";
    LanguageCode["SANSKRIT"] = "sa";
    LanguageCode["SAMI"] = "si";
    LanguageCode["THAI"] = "th";
    LanguageCode["TURKISH"] = "tr";
    LanguageCode["UKRAINIAN"] = "ua";
    LanguageCode["VIETNAMESE"] = "vn";
})(LanguageCode = exports.LanguageCode || (exports.LanguageCode = {}));

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],11:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],12:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],13:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],14:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],15:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],16:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],17:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],18:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],19:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],20:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagType = void 0;
/**
 * An enumerator which {@link SourceTags} uses to define the color of the tag rendered on the website.
 * Five types are available: blue, green, grey, yellow and red, the default one is blue.
 * Common colors are red for (Broken), yellow for (+18), grey for (Country-Proof)
 */
var TagType;
(function (TagType) {
    TagType["BLUE"] = "default";
    TagType["GREEN"] = "success";
    TagType["GREY"] = "info";
    TagType["YELLOW"] = "warning";
    TagType["RED"] = "danger";
})(TagType = exports.TagType || (exports.TagType = {}));

},{}],22:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],23:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],24:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],25:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Chapter"), exports);
__exportStar(require("./ChapterDetails"), exports);
__exportStar(require("./HomeSection"), exports);
__exportStar(require("./Manga"), exports);
__exportStar(require("./MangaTile"), exports);
__exportStar(require("./RequestObject"), exports);
__exportStar(require("./SearchRequest"), exports);
__exportStar(require("./TagSection"), exports);
__exportStar(require("./SourceTag"), exports);
__exportStar(require("./Languages"), exports);
__exportStar(require("./Constants"), exports);
__exportStar(require("./MangaUpdate"), exports);
__exportStar(require("./PagedResults"), exports);
__exportStar(require("./ResponseObject"), exports);
__exportStar(require("./RequestManager"), exports);
__exportStar(require("./RequestHeaders"), exports);
__exportStar(require("./SourceInfo"), exports);
__exportStar(require("./TrackObject"), exports);
__exportStar(require("./OAuth"), exports);
__exportStar(require("./UserForm"), exports);

},{"./Chapter":5,"./ChapterDetails":6,"./Constants":7,"./HomeSection":8,"./Languages":9,"./Manga":10,"./MangaTile":11,"./MangaUpdate":12,"./OAuth":13,"./PagedResults":14,"./RequestHeaders":15,"./RequestManager":16,"./RequestObject":17,"./ResponseObject":18,"./SearchRequest":19,"./SourceInfo":20,"./SourceTag":21,"./TagSection":22,"./TrackObject":23,"./UserForm":24}],26:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManHuaGui = exports.ManHuaGuiInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const ManHuaGuiParser_1 = require("./ManHuaGuiParser");
const BG_DOMAIN = 'https://www.manhuagui.com';
// TODO: Support option to switch to traditional
const method = 'GET';
const headers = {
    referer: BG_DOMAIN
};
exports.ManHuaGuiInfo = {
    version: '1.1.2',
    name: 'ManHuaGui (漫画柜)',
    icon: 'favicon.ico',
    author: 'getBoolean',
    authorWebsite: 'https://github.com/getBoolean',
    description: 'Extension that pulls manga from ManHuaGui',
    hentaiSource: false,
    websiteBaseURL: BG_DOMAIN,
    sourceTags: [
        // {
        //     text: "Notifications",
        //     type: TagType.GREEN
        // },
        {
            text: "中文",
            type: paperback_extensions_common_1.TagType.GREY
        }
    ]
};
class ManHuaGui extends paperback_extensions_common_1.Source {
    getMangaShareUrl(mangaId) { return `${BG_DOMAIN}/comic/${mangaId}`; }
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${BG_DOMAIN}/comic/`,
                method,
                param: `${mangaId}/`
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return ManHuaGuiParser_1.parseMangaDetails($, mangaId);
        });
    }
    getChapters(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${BG_DOMAIN}/comic/`,
                method,
                param: `${mangaId}/`
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return ManHuaGuiParser_1.parseChapters(this.cheerio, $, mangaId);
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${BM_DOMAIN}/comic/`,
                method,
                headers,
                param: `${mangaId}/${chapterId}.html`
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return ManHuaGuiParser_1.parseChapterDetails($, mangaId, chapterId, response.data);
        });
    }
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        return __awaiter(this, void 0, void 0, function* () {
            let page = 1;
            let updatedManga = {
                ids: [],
                loadMore: true
            };
            while (updatedManga.loadMore) {
                const request = createRequestObject({
                    url: `${BM_DOMAIN}/page/new/`,
                    method,
                    headers,
                    param: `${String(page++)}.html`
                });
                const response = yield this.requestManager.schedule(request, 1);
                const $ = this.cheerio.load(response.data);
                updatedManga = ManHuaGuiParser_1.parseUpdatedManga($, time, ids);
                if (updatedManga.ids.length > 0) {
                    mangaUpdatesFoundCallback(createMangaUpdates({
                        ids: updatedManga.ids
                    }));
                }
            }
        });
    }
    getHomePageSections(sectionCallback) {
        return __awaiter(this, void 0, void 0, function* () {
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
            ];
            const promises = [];
            for (const sectionRequest of sectionRequests) {
                // Let the app load empty sections
                sectionCallback(sectionRequest.section);
                // Get the section data
                promises.push(this.requestManager.schedule(sectionRequest.request, 1).then(response => {
                    const $ = this.cheerio.load(response.data);
                    switch (sectionRequest.section.id) {
                        case 'a_recommended':
                            sectionRequest.section.items = ManHuaGuiParser_1.parseHomeSections($);
                            break;
                        case 'hot_comics':
                            sectionRequest.section.items = ManHuaGuiParser_1.parseHotManga($);
                            break;
                        case 'z_new_updates':
                            sectionRequest.section.items = ManHuaGuiParser_1.parseNewManga($);
                            break;
                        default:
                    }
                    sectionCallback(sectionRequest.section);
                }));
            }
            // Make sure the function completes
            yield Promise.all(promises);
        });
    }
    searchRequest(query, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            const search = ManHuaGuiParser_1.generateSearch(query);
            const request = createRequestObject({
                url: `${BM_DOMAIN}/search/`,
                method,
                headers,
                param: `${search}/${page}.html`
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const manga = ManHuaGuiParser_1.parseSearch($);
            metadata = !ManHuaGuiParser_1.isLastPage($) ? { page: page + 1 } : undefined;
            return createPagedResults({
                results: manga,
                metadata
            });
        });
    }
    getTags() {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${BM_DOMAIN}/page/list.html`,
                method,
                headers,
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return ManHuaGuiParser_1.parseTags($);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // console.log('getViewMoreItems($)')
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            let param = '';
            if (homepageSectionId === 'hot_comics')
                param = `/page/hot/${page}.html`;
            else if (homepageSectionId === 'z_new_updates')
                param = `/page/new/${page}.html`;
            else
                return Promise.resolve(null);
            const request = createRequestObject({
                url: `${BM_DOMAIN}`,
                method,
                param,
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const manga = ManHuaGuiParser_1.parseViewMore($);
            // console.log('isLastPage($) ' + isLastPage($))
            metadata = !ManHuaGuiParser_1.isLastPage($) ? { page: page + 1 } : undefined;
            return createPagedResults({
                results: manga,
                metadata
            });
        });
    }
    globalRequestHeaders() {
        return {
            referer: BG_DOMAIN
        };
    }
}
exports.ManHuaGui = ManHuaGui;

},{"./ManHuaGuiParser":27,"paperback-extensions-common":4}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLastPage = exports.parseViewMore = exports.parseTags = exports.parseSearch = exports.generateSearch = exports.parseNewManga = exports.parseHotManga = exports.parseHomeSections = exports.parseUpdatedManga = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
// TODO: Remove before publishing
// const ChineseNumber = require('./external/chinese-numbers.js');
// TODO: Replace with minimized version before publishing
const LZString = require('./external/lz-string.js');
const parseMangaDetails = ($, mangaId) => {
    var _a, _b, _c;
    const page = (_a = $('div.w998.bc.cf')) !== null && _a !== void 0 ? _a : '';
    const infoBox = $('div.book-cont', page);
    const title = $('div.book-title h1', infoBox).text();
    const altTitle = $('div.book-title h2', infoBox).text();
    const isAltTitleEmpty = altTitle.length == 0;
    const image = (_b = $('div.book-cover p.hcover img', infoBox).attr('src')) !== null && _b !== void 0 ? _b : '';
    const bookDetails = $('div.book-detail ul.detail-list', infoBox);
    let author = (_c = $('li:nth-child(2) span:nth-child(2) a', bookDetails).attr('title')) !== null && _c !== void 0 ? _c : '';
    let artist = '';
    let rating = $('p.score-avg em', page).text();
    // "连载中" -> ONGOING
    // "已完结" -> COMPLETED
    // "連載中" -> ONGOING
    // "已完結" -> COMPLETED
    let statusText = $('li.status span span', bookDetails).first().text();
    let status;
    if (statusText == '连载中' || statusText == '連載中')
        status = paperback_extensions_common_1.MangaStatus.ONGOING;
    else
        status = paperback_extensions_common_1.MangaStatus.COMPLETED;
    let titles = isAltTitleEmpty ? [title] : [title, altTitle];
    let follows = 0;
    let views = 0;
    let lastUpdate = $('li.status span span:nth-child(3)', bookDetails).text();
    let hentai = false;
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] })];
    const elems = $("span:contains(漫画剧情) > a , span:contains(漫畫劇情) > a").toArray();
    tagSections[0].tags = elems.map((elem) => {
        var _a, _b;
        return createTag({
            id: ((_a = $(elem).attr('href')) !== null && _a !== void 0 ? _a : '').replace('/list/', '').replace('/', ''),
            label: (_b = $(elem).attr('title')) !== null && _b !== void 0 ? _b : ''
        });
    });
    const time = new Date(lastUpdate);
    lastUpdate = time.toDateString();
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
};
exports.parseMangaDetails = parseMangaDetails;
const parseChapters = (cheerio, $, mangaId) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const page = (_a = $('div.w998.bc.cf')) !== null && _a !== void 0 ? _a : '';
    // Try to get R18 manga hidden chapter list
    // Credit to tachiyomi for this impl
    // https://github.com/tachiyomiorg/tachiyomi-extensions/blob/master/src/zh/manhuagui/src/eu/kanade/tachiyomi/extension/zh/manhuagui/Manhuagui.kt
    const hiddenEncryptedChapterList = $("#__VIEWSTATE");
    if (hiddenEncryptedChapterList != null) {
        // Hidden chapter list is LZString encoded
        const encryptedValue = (_b = $(hiddenEncryptedChapterList).attr('value')) !== null && _b !== void 0 ? _b : '';
        const decodedHiddenChapterList = LZString.decompressFromBase64(encryptedValue);
        $('#erroraudit_show', page).replaceWith(decodedHiddenChapterList);
    }
    const chapterList = $("ul > li > a.status0");
    const allChapters = chapterList.toArray();
    const chapters = [];
    for (let chapter of allChapters) {
        const id = ((_d = (_c = $(chapter).attr("href")) === null || _c === void 0 ? void 0 : _c.split('/').pop()) !== null && _d !== void 0 ? _d : '').replace('.html', '');
        const name = (_f = (_e = $(chapter).attr("title")) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : '';
        // Commented out since I haven't found any cases of chapter numbers written with chinese characters
        // const convertedString = new ChineseNumber(name).toArabicString();
        const chapNum = Number((_g = name.match(/\d+/)) !== null && _g !== void 0 ? _g : 0);
        // Manhuagui only provides upload date for latest chapter
        const timeText = $('li.status span span:nth-child(3)', page).text();
        const time = new Date(timeText);
        chapters.push(createChapter({
            id,
            mangaId,
            name,
            langCode: paperback_extensions_common_1.LanguageCode.CHINEESE,
            chapNum,
            time
        }));
    }
    return chapters;
};
exports.parseChapters = parseChapters;
const parseChapterDetails = ($, mangaId, chapterId, data) => {
    var _a, _b, _c;
    const json = (_b = (_a = $('[type=application\\/ld\\+json]').html()) === null || _a === void 0 ? void 0 : _a.replace(/\t*\n*/g, '')) !== null && _b !== void 0 ? _b : '';
    const parsedJson = JSON.parse(json);
    const firstImageUrl = parsedJson.images[0];
    const baseUrlStartingPosition = firstImageUrl.indexOf('//') + 2;
    const baseImageURL = firstImageUrl.slice(0, firstImageUrl.indexOf('/', baseUrlStartingPosition));
    const imageCodes = (_c = data === null || data === void 0 ? void 0 : data.match(/var z_img='(.*?)';/)) === null || _c === void 0 ? void 0 : _c.pop();
    let pages = [];
    if (imageCodes) {
        const imagePaths = JSON.parse(imageCodes);
        pages = imagePaths.map(imagePath => `${baseImageURL}/${imagePath}`);
    }
    // console.log(pages)
    return createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages,
        longStrip: false
    });
};
exports.parseChapterDetails = parseChapterDetails;
const parseUpdatedManga = ($, time, ids) => {
    var _a, _b;
    const foundIds = [];
    let passedReferenceTime = false;
    const panel = $('.tbox_m');
    const allItems = $('.vbox', panel).toArray();
    for (const item of allItems) {
        const id = ((_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '').replace('.html', '');
        let mangaTime = new Date($($(item).find('h4')[1]).text());
        passedReferenceTime = mangaTime > time;
        if (passedReferenceTime) {
            if (ids.includes(id)) {
                foundIds.push(id);
            }
        }
        else
            break;
    }
    return {
        ids: foundIds,
        loadMore: passedReferenceTime
    };
};
exports.parseUpdatedManga = parseUpdatedManga;
const parseHomeSections = ($) => {
    var _a, _b, _c, _d;
    const recommendedManga = [];
    // Recommended
    const grid = $('.tbox_m')[0];
    const allItems = $('.vbox', grid).toArray();
    for (const item of allItems) {
        const id = ((_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '').replace('.html', '');
        const title = (_c = $('.vbox_t', item).attr('title')) !== null && _c !== void 0 ? _c : 'No title';
        const subtitle = $('.vbox_t span', item).text();
        const image = (_d = $('.vbox_t mip-img', item).attr('src')) !== null && _d !== void 0 ? _d : '';
        recommendedManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle })
        }));
    }
    return recommendedManga;
};
exports.parseHomeSections = parseHomeSections;
const parseHotManga = ($) => {
    var _a, _b, _c, _d;
    const hotManga = [];
    // New
    const grid = $('.tbox_m')[0];
    const allItems = $('.vbox', grid).toArray();
    for (const item of allItems) {
        const id = ((_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '').replace('.html', '');
        const title = (_c = $('.vbox_t', item).attr('title')) !== null && _c !== void 0 ? _c : 'No title';
        const subtitle = $('.vbox_t span', item).text();
        const image = (_d = $('.vbox_t mip-img', item).attr('src')) !== null && _d !== void 0 ? _d : '';
        hotManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle })
        }));
    }
    return hotManga;
};
exports.parseHotManga = parseHotManga;
const parseNewManga = ($) => {
    var _a, _b, _c, _d;
    const newManga = [];
    // New
    const grid = $('.tbox_m')[0];
    const allItems = $('.vbox', grid).toArray();
    for (const item of allItems) {
        const id = ((_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '').replace('.html', '');
        const title = (_c = $('.vbox_t', item).attr('title')) !== null && _c !== void 0 ? _c : 'No title';
        const subtitle = $('.vbox_t span', item).text();
        const image = (_d = $('.vbox_t mip-img', item).attr('src')) !== null && _d !== void 0 ? _d : '';
        newManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle })
        }));
    }
    return newManga;
};
exports.parseNewManga = parseNewManga;
const generateSearch = (query) => {
    var _a, _b;
    let keyword = ((_a = query.title) !== null && _a !== void 0 ? _a : '').replace(/ /g, '+');
    if (query.author)
        keyword += ((_b = query.author) !== null && _b !== void 0 ? _b : '').replace(/ /g, '+');
    let search = `${keyword}`;
    return search;
};
exports.generateSearch = generateSearch;
const parseSearch = ($) => {
    var _a, _b, _c, _d;
    const panel = $('.tbox_m');
    const allItems = $('.vbox', panel).toArray();
    const manga = [];
    for (const item of allItems) {
        const id = ((_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '').replace('.html', '');
        const title = (_c = $('.vbox_t', item).attr('title')) !== null && _c !== void 0 ? _c : 'No title';
        const subtitle = $('.vbox_t span', item).text();
        const image = (_d = $('.vbox_t mip-img', item).attr('src')) !== null && _d !== void 0 ? _d : '';
        manga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }));
    }
    return manga;
};
exports.parseSearch = parseSearch;
const parseTags = ($) => {
    const allItems = $('.tbox a').toArray();
    const genres = createTagSection({
        id: 'genre',
        label: 'Genre',
        tags: []
    });
    for (let item of allItems) {
        let label = $(item).text();
        genres.tags.push(createTag({ id: label, label: label }));
    }
    return [genres];
};
exports.parseTags = parseTags;
const parseViewMore = ($) => {
    var _a, _b, _c, _d;
    console.log('parseViewMore($)');
    const panel = $('.tbox_m');
    const allItems = $('.vbox', panel).toArray();
    const manga = [];
    for (const item of allItems) {
        const id = ((_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '').replace('.html', '');
        const title = (_c = $('.vbox_t', item).attr('title')) !== null && _c !== void 0 ? _c : 'No title';
        const subtitle = $('.vbox_t span', item).text();
        const image = (_d = $('.vbox_t mip-img', item).attr('src')) !== null && _d !== void 0 ? _d : '';
        manga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }));
    }
    return manga;
};
exports.parseViewMore = parseViewMore;
const isLastPage = ($) => {
    // see if the button is disabled
    return $('li', $('.pagination')).last().hasClass('disabled');
};
exports.isLastPage = isLastPage;

},{"./external/lz-string.js":28,"paperback-extensions-common":4}],28:[function(require,module,exports){
// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.4.4
var LZString = (function() {

    // private property
    var f = String.fromCharCode;
    var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    var baseReverseDic = {};
    
    function getBaseValue(alphabet, character) {
      if (!baseReverseDic[alphabet]) {
        baseReverseDic[alphabet] = {};
        for (var i=0 ; i<alphabet.length ; i++) {
          baseReverseDic[alphabet][alphabet.charAt(i)] = i;
        }
      }
      return baseReverseDic[alphabet][character];
    }
    
    var LZString = {
      compressToBase64 : function (input) {
        if (input == null) return "";
        var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
        switch (res.length % 4) { // To produce valid Base64
        default: // When could this happen ?
        case 0 : return res;
        case 1 : return res+"===";
        case 2 : return res+"==";
        case 3 : return res+"=";
        }
      },
    
      decompressFromBase64 : function (input) {
        if (input == null) return "";
        if (input == "") return null;
        return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
      },
    
      compressToUTF16 : function (input) {
        if (input == null) return "";
        return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
      },
    
      decompressFromUTF16: function (compressed) {
        if (compressed == null) return "";
        if (compressed == "") return null;
        return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
      },
    
      //compress into uint8array (UCS-2 big endian format)
      compressToUint8Array: function (uncompressed) {
        var compressed = LZString.compress(uncompressed);
        var buf=new Uint8Array(compressed.length*2); // 2 bytes per character
    
        for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
          var current_value = compressed.charCodeAt(i);
          buf[i*2] = current_value >>> 8;
          buf[i*2+1] = current_value % 256;
        }
        return buf;
      },
    
      //decompress from uint8array (UCS-2 big endian format)
      decompressFromUint8Array:function (compressed) {
        if (compressed===null || compressed===undefined){
            return LZString.decompress(compressed);
        } else {
            var buf=new Array(compressed.length/2); // 2 bytes per character
            for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
              buf[i]=compressed[i*2]*256+compressed[i*2+1];
            }
    
            var result = [];
            buf.forEach(function (c) {
              result.push(f(c));
            });
            return LZString.decompress(result.join(''));
    
        }
    
      },
    
    
      //compress into a string that is already URI encoded
      compressToEncodedURIComponent: function (input) {
        if (input == null) return "";
        return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
      },
    
      //decompress from an output of compressToEncodedURIComponent
      decompressFromEncodedURIComponent:function (input) {
        if (input == null) return "";
        if (input == "") return null;
        input = input.replace(/ /g, "+");
        return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
      },
    
      compress: function (uncompressed) {
        return LZString._compress(uncompressed, 16, function(a){return f(a);});
      },
      _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
        if (uncompressed == null) return "";
        var i, value,
            context_dictionary= {},
            context_dictionaryToCreate= {},
            context_c="",
            context_wc="",
            context_w="",
            context_enlargeIn= 2, // Compensate for the first entry which should not count
            context_dictSize= 3,
            context_numBits= 2,
            context_data=[],
            context_data_val=0,
            context_data_position=0,
            ii;
    
        for (ii = 0; ii < uncompressed.length; ii += 1) {
          context_c = uncompressed.charAt(ii);
          if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
            context_dictionary[context_c] = context_dictSize++;
            context_dictionaryToCreate[context_c] = true;
          }
    
          context_wc = context_w + context_c;
          if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
            context_w = context_wc;
          } else {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
              if (context_w.charCodeAt(0)<256) {
                for (i=0 ; i<context_numBits ; i++) {
                  context_data_val = (context_data_val << 1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                }
                value = context_w.charCodeAt(0);
                for (i=0 ; i<8 ; i++) {
                  context_data_val = (context_data_val << 1) | (value&1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              } else {
                value = 1;
                for (i=0 ; i<context_numBits ; i++) {
                  context_data_val = (context_data_val << 1) | value;
                  if (context_data_position ==bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i=0 ; i<16 ; i++) {
                  context_data_val = (context_data_val << 1) | (value&1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
              delete context_dictionaryToCreate[context_w];
            } else {
              value = context_dictionary[context_w];
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
    
    
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            // Add wc to the dictionary.
            context_dictionary[context_wc] = context_dictSize++;
            context_w = String(context_c);
          }
        }
    
        // Output the code for w.
        if (context_w !== "") {
          if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
            if (context_w.charCodeAt(0)<256) {
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
              }
              value = context_w.charCodeAt(0);
              for (i=0 ; i<8 ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            } else {
              value = 1;
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1) | value;
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = 0;
              }
              value = context_w.charCodeAt(0);
              for (i=0 ; i<16 ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            delete context_dictionaryToCreate[context_w];
          } else {
            value = context_dictionary[context_w];
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
    
    
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
        }
    
        // Mark the end of the stream
        value = 2;
        for (i=0 ; i<context_numBits ; i++) {
          context_data_val = (context_data_val << 1) | (value&1);
          if (context_data_position == bitsPerChar-1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
    
        // Flush the last char
        while (true) {
          context_data_val = (context_data_val << 1);
          if (context_data_position == bitsPerChar-1) {
            context_data.push(getCharFromInt(context_data_val));
            break;
          }
          else context_data_position++;
        }
        return context_data.join('');
      },
    
      decompress: function (compressed) {
        if (compressed == null) return "";
        if (compressed == "") return null;
        return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
      },
    
      _decompress: function (length, resetValue, getNextValue) {
        var dictionary = [],
            next,
            enlargeIn = 4,
            dictSize = 4,
            numBits = 3,
            entry = "",
            result = [],
            i,
            w,
            bits, resb, maxpower, power,
            c,
            data = {val:getNextValue(0), position:resetValue, index:1};
    
        for (i = 0; i < 3; i += 1) {
          dictionary[i] = i;
        }
    
        bits = 0;
        maxpower = Math.pow(2,2);
        power=1;
        while (power!=maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb>0 ? 1 : 0) * power;
          power <<= 1;
        }
    
        switch (next = bits) {
          case 0:
              bits = 0;
              maxpower = Math.pow(2,8);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
            c = f(bits);
            break;
          case 1:
              bits = 0;
              maxpower = Math.pow(2,16);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
            c = f(bits);
            break;
          case 2:
            return "";
        }
        dictionary[3] = c;
        w = c;
        result.push(c);
        while (true) {
          if (data.index > length) {
            return "";
          }
    
          bits = 0;
          maxpower = Math.pow(2,numBits);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
    
          switch (c = bits) {
            case 0:
              bits = 0;
              maxpower = Math.pow(2,8);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
    
              dictionary[dictSize++] = f(bits);
              c = dictSize-1;
              enlargeIn--;
              break;
            case 1:
              bits = 0;
              maxpower = Math.pow(2,16);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
              dictionary[dictSize++] = f(bits);
              c = dictSize-1;
              enlargeIn--;
              break;
            case 2:
              return result.join('');
          }
    
          if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
          }
    
          if (dictionary[c]) {
            entry = dictionary[c];
          } else {
            if (c === dictSize) {
              entry = w + w.charAt(0);
            } else {
              return null;
            }
          }
          result.push(entry);
    
          // Add w+entry[0] to the dictionary.
          dictionary[dictSize++] = w + entry.charAt(0);
          enlargeIn--;
    
          w = entry;
    
          if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
          }
    
        }
      }
    };
      return LZString;
    })();
    
    if (typeof define === 'function' && define.amd) {
      define(function () { return LZString; });
    } else if( typeof module !== 'undefined' && module != null ) {
      module.exports = LZString
    } else if( typeof angular !== 'undefined' && angular != null ) {
      angular.module('LZString', [])
      .factory('LZString', function () {
        return LZString;
      });
    }
},{}]},{},[26])(26)
});
