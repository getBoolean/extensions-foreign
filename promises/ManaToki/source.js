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
exports.ManaToki = exports.ManaTokiInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const ManaTokiParser_1 = require("./ManaTokiParser");
const MANATOKI_DOMAIN = 'https://manatoki95.net';
const MANATOKI_COMIC = MANATOKI_DOMAIN + '/comic/';
const method = 'GET';
exports.ManaTokiInfo = {
    version: '1.0.4',
    name: '마나토끼',
    icon: 'icon.png',
    author: 'nar1n',
    authorWebsite: 'https://github.com/nar1n',
    description: 'Extension that pulls manga from ManaToki',
    hentaiSource: false,
    websiteBaseURL: MANATOKI_DOMAIN,
    sourceTags: [
        {
            text: "Korean",
            type: paperback_extensions_common_1.TagType.GREY
        }
    ]
};
class ManaToki extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = createRequestManager({
            requestsPerSecond: 2,
            requestTimeout: 10000
        });
        // Commented out as this leads to IP ban
        // async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        //     let page: number = 1
        //     let loadNextPage = true
        //     while (loadNextPage) {
        //         const request = createRequestObject({
        //             url: `${MANATOKI_DOMAIN}/bbs/page.php?hid=update&page=${page}`,
        //             method: 'GET'
        //         })
        //         let data = await this.requestManager.schedule(request, 3)
        //         let $ = this.cheerio.load(data.data)
        //         let updatedManga = parseUpdatedMangas($, time, ids, this)
        //         loadNextPage = updatedManga.loadNextPage
        //         if (loadNextPage) {
        //             page++
        //         }
        //         if (updatedManga.updates.length > 0) {
        //             mangaUpdatesFoundCallback(createMangaUpdates({
        //                 ids: updatedManga.updates
        //             }))
        //         }
        //     }
        // }
    }
    getMangaShareUrl(mangaId) { return `${MANATOKI_COMIC}${mangaId}`; }
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: MANATOKI_COMIC,
                method,
                param: mangaId
            });
            const response = yield this.requestManager.schedule(request, 3);
            let $ = this.cheerio.load(response.data);
            return ManaTokiParser_1.parseMangaDetails($, mangaId);
        });
    }
    getChapters(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: MANATOKI_COMIC,
                method,
                param: mangaId
            });
            const response = yield this.requestManager.schedule(request, 3);
            let $ = this.cheerio.load(response.data);
            return ManaTokiParser_1.parseChapters($, mangaId);
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: MANATOKI_COMIC,
                method,
                param: chapterId
            });
            const response = yield this.requestManager.schedule(request, 3);
            const $ = this.cheerio.load(response.data);
            return ManaTokiParser_1.parseChapterDetails($, this.cheerio.load, mangaId, chapterId);
        });
    }
    getHomePageSections(sectionCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const sections = [
                {
                    request: createRequestObject({
                        url: `${MANATOKI_DOMAIN}/bbs/page.php?hid=update`,
                        method: 'GET'
                    }),
                    section: createHomeSection({
                        id: 'updates',
                        title: '최신화',
                        view_more: true,
                    }),
                },
                {
                    request: createRequestObject({
                        url: `${MANATOKI_DOMAIN}/comic`,
                        method: 'GET'
                    }),
                    section: createHomeSection({
                        id: 'list',
                        title: '만화목록',
                        view_more: true
                    }),
                },
            ];
            const promises = [];
            for (const section of sections) {
                // Let the app load empty sections
                sectionCallback(section.section);
                // Get the section data
                promises.push(this.requestManager.schedule(section.request, 3).then(response => {
                    const $ = this.cheerio.load(response.data);
                    switch (section.section.id) {
                        case 'updates':
                            section.section.items = ManaTokiParser_1.parseHomeUpdates($).manga;
                            break;
                        case 'list':
                            section.section.items = ManaTokiParser_1.parseHomeList($).manga;
                            break;
                    }
                    sectionCallback(section.section);
                }));
            }
            // Make sure the function completes
            yield Promise.all(promises);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            let collectedIds = (_b = metadata === null || metadata === void 0 ? void 0 : metadata.collectedIds) !== null && _b !== void 0 ? _b : [];
            let manga;
            let mData = undefined;
            switch (homepageSectionId) {
                case 'updates': {
                    let request = createRequestObject({
                        url: `${MANATOKI_DOMAIN}/bbs/page.php?hid=update&page=${page}`,
                        method: 'GET'
                    });
                    let data = yield this.requestManager.schedule(request, 3);
                    let $ = this.cheerio.load(data.data);
                    let parsedData = ManaTokiParser_1.parseHomeUpdates($, collectedIds);
                    manga = parsedData.manga;
                    collectedIds = parsedData.collectedIds;
                    if (page <= 9) {
                        mData = { page: (page + 1), collectedIds: collectedIds };
                    }
                    break;
                }
                case 'list': {
                    let request = createRequestObject({
                        url: `${MANATOKI_DOMAIN}/comic/p${page}`,
                        method: 'GET'
                    });
                    let data = yield this.requestManager.schedule(request, 3);
                    let $ = this.cheerio.load(data.data);
                    let parsedData = ManaTokiParser_1.parseHomeList($, collectedIds);
                    manga = parsedData.manga;
                    collectedIds = parsedData.collectedIds;
                    if (page <= 9) {
                        mData = { page: (page + 1), collectedIds: collectedIds };
                    }
                    break;
                }
                default:
                    return Promise.resolve(null);
            }
            return createPagedResults({
                results: manga,
                metadata: mData
            });
        });
    }
    searchRequest(query) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const search = (_a = query.title) !== null && _a !== void 0 ? _a : '';
            const request = createRequestObject({
                url: `${MANATOKI_DOMAIN}/comic?stx=`,
                method,
                param: encodeURI(search.replace(/ /g, '+'))
            });
            const response = yield this.requestManager.schedule(request, 3);
            const $ = this.cheerio.load(response.data);
            const manga = ManaTokiParser_1.parseSearch($);
            return createPagedResults({
                results: manga,
            });
        });
    }
}
exports.ManaToki = ManaToki;

},{"./ManaTokiParser":27,"paperback-extensions-common":4}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUpdatedMangas = exports.parseSearch = exports.parseHomeList = exports.parseHomeUpdates = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
function parseTime(timeString) {
    if (timeString.includes(':')) {
        // Time
        let currentKoreaDate = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Seoul' }).split('/');
        currentKoreaDate = [currentKoreaDate[2], currentKoreaDate[0], currentKoreaDate[1]];
        for (var [index, item] of currentKoreaDate.entries()) {
            if (item.length < 2) {
                currentKoreaDate[index] = '0' + item;
            }
        }
        return new Date(currentKoreaDate.join('-') + 'T' + timeString + ':00+09:00');
    }
    else {
        // Date
        return new Date(timeString.replace(/\./g, '-') + 'T00:00:00+09:00');
    }
}
function html_encoder(str) {
    var i = 0;
    var out = '';
    var l = str.length;
    for (; i < l; i += 3) {
        out += String.fromCharCode(parseInt(str.substr(i, 2), 16));
    }
    return out;
}
const parseMangaDetails = ($, mangaId) => {
    var _a;
    let rating = 0;
    for (const star of $('i', 'th.active').toArray()) {
        const starClass = $(star).attr('class');
        if (starClass == 'fa fa-star crimson') {
            rating += 1;
        }
        else if (starClass == 'fa fa-star-half-empty crimson') {
            rating += 0.5;
        }
    }
    let status = paperback_extensions_common_1.MangaStatus.ONGOING;
    if ($('a', 'div.col-sm-9').last().text() == '완결') {
        status = paperback_extensions_common_1.MangaStatus.COMPLETED;
    }
    const tags = [];
    const tagsList = $('a', 'div.tags').toArray().map(x => $(x).text());
    for (const tag of tagsList) {
        tags.push(createTag({
            id: tag,
            label: tag
        }));
    }
    const tagSections = [createTagSection({
            id: '분류',
            label: '분류',
            tags: tags
        })];
    const lastUpdate = parseTime($('div.wr-date.hidden-xs', 'div.serial-list').first().text().replace('\n', '').replace(' ', '').trim());
    return createManga({
        id: mangaId,
        titles: [$('b', 'div.col-sm-9').first().text()],
        image: (_a = $('img.img-tag').attr('src')) !== null && _a !== void 0 ? _a : '',
        rating,
        status,
        author: $('a', 'div.col-sm-9').first().text(),
        follows: Number($('b#wr_good').text()),
        tags: tagSections,
        lastUpdate: lastUpdate.toString(),
        // hentai: tagsList.includes('17')
        hentai: false
    });
};
exports.parseMangaDetails = parseMangaDetails;
const parseChapters = ($, mangaId) => {
    var _a, _b, _c;
    const chapters = [];
    for (const chapter of $('li', $('ul.list-body', 'div.serial-list').first()).toArray()) {
        const name = $('a', chapter).children().remove().end().text().trim();
        const id = (_c = (_b = (_a = $('a', chapter).first().attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) === null || _b === void 0 ? void 0 : _b.split('?')[0]) !== null && _c !== void 0 ? _c : '';
        const time = parseTime($('div.wr-date.hidden-xs', chapter).text().replace('\n', '').trim());
        chapters.push(createChapter({
            id,
            mangaId,
            name,
            langCode: paperback_extensions_common_1.LanguageCode.KOREAN,
            chapNum: Number($('div.wr-num', chapter).text()),
            time
        }));
    }
    return chapters;
};
exports.parseChapters = parseChapters;
const parseChapterDetails = ($, load, mangaId, chapterId) => {
    var _a, _b, _c;
    const script = $('script[type="text/javascript"]').toArray().map(x => $(x).html()).filter(x => x === null || x === void 0 ? void 0 : x.includes('html_data+='))[0];
    const imgdivs = html_encoder((_a = script === null || script === void 0 ? void 0 : script.split('html_data+=').slice(1, -1).map(x => x.replace(/[\';/\n]/g, '')).join('')) !== null && _a !== void 0 ? _a : '');
    $ = load(imgdivs);
    let pages = [];
    let maxImg = 0;
    for (const div of $('div', imgdivs).toArray()) {
        const length = $('img', div).length;
        if (length >= maxImg) {
            pages = (_c = (_b = $(div).html()) === null || _b === void 0 ? void 0 : _b.split('data-').map(x => x.split('"')[1]).slice(1)) !== null && _c !== void 0 ? _c : [];
            maxImg = length;
        }
    }
    return createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages,
        longStrip: false
    });
};
exports.parseChapterDetails = parseChapterDetails;
const parseHomeUpdates = ($, collectedIds) => {
    var _a, _b, _c;
    let mangaTiles = [];
    if (!collectedIds) {
        collectedIds = [];
    }
    for (const item of $('.post-row', '.miso-post-webzine').toArray()) {
        const id = (_b = (_a = $('a', $('.pull-right.post-info', item)).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
        const title = $('a', $('.post-subject', item)).children().remove().end().text().trim();
        const image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
        if (!collectedIds.includes(id)) {
            mangaTiles.push(createMangaTile({
                id: id,
                title: createIconText({ text: title }),
                image: image
            }));
            collectedIds.push(id);
        }
    }
    return { manga: mangaTiles, collectedIds: collectedIds };
};
exports.parseHomeUpdates = parseHomeUpdates;
const parseHomeList = ($, collectedIds) => {
    var _a, _b, _c;
    let mangaTiles = [];
    if (!collectedIds) {
        collectedIds = [];
    }
    for (const item of $('li', '#webtoon-list-all').toArray()) {
        const id = (_b = (_a = $('a', item).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
        const title = $('span.title.white', item).text();
        const image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
        if (!collectedIds.includes(id)) {
            mangaTiles.push(createMangaTile({
                id: id,
                title: createIconText({ text: title }),
                image: image
            }));
            collectedIds.push(id);
        }
    }
    return { manga: mangaTiles, collectedIds: collectedIds };
};
exports.parseHomeList = parseHomeList;
const parseSearch = ($) => {
    var _a, _b, _c, _d;
    const manga = [];
    const items = $('li', '#webtoon-list-all').toArray();
    for (const item of items) {
        const id = (_b = (_a = $('a', item).attr('href')) === null || _a === void 0 ? void 0 : _a.split('?')[0].split('/').pop()) !== null && _b !== void 0 ? _b : '';
        const image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
        const title = (_d = $('span.title.white', item).text()) !== null && _d !== void 0 ? _d : '';
        manga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title })
        }));
    }
    return manga;
};
exports.parseSearch = parseSearch;
const parseUpdatedMangas = ($, time, ids, source) => {
    var _a, _b;
    let passedReferenceTime = false;
    let updatedManga = [];
    for (const item of $('.post-row', '.miso-post-webzine').toArray()) {
        const id = (_b = (_a = $('a', $('.pull-right.post-info', item)).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
        const mangaTime = $('span.txt-normal', item).text().split(' ');
        const parsedTime = new Date('2021-' + mangaTime[0] + 'T' + mangaTime[1] + ':00+09:00');
        passedReferenceTime = parsedTime <= time;
        if (!passedReferenceTime) {
            if (ids.includes(id)) {
                updatedManga.push(id);
            }
        }
        else
            break;
    }
    if (!passedReferenceTime) {
        return { updates: updatedManga, loadNextPage: true };
    }
    else {
        return { updates: updatedManga, loadNextPage: false };
    }
};
exports.parseUpdatedMangas = parseUpdatedMangas;

},{"paperback-extensions-common":4}]},{},[26])(26)
});
