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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseLangCode = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
exports.reverseLangCode = {
    '_unknown': paperback_extensions_common_1.LanguageCode.UNKNOWN,
    'bd': paperback_extensions_common_1.LanguageCode.BENGALI,
    'bg': paperback_extensions_common_1.LanguageCode.BULGARIAN,
    'br': paperback_extensions_common_1.LanguageCode.BRAZILIAN,
    'cn': paperback_extensions_common_1.LanguageCode.CHINEESE,
    'cz': paperback_extensions_common_1.LanguageCode.CZECH,
    'de': paperback_extensions_common_1.LanguageCode.GERMAN,
    'dk': paperback_extensions_common_1.LanguageCode.DANISH,
    'gb': paperback_extensions_common_1.LanguageCode.ENGLISH,
    'es': paperback_extensions_common_1.LanguageCode.SPANISH,
    'fi': paperback_extensions_common_1.LanguageCode.FINNISH,
    'fr': paperback_extensions_common_1.LanguageCode.FRENCH,
    'gr': paperback_extensions_common_1.LanguageCode.GREEK,
    'hk': paperback_extensions_common_1.LanguageCode.CHINEESE_HONGKONG,
    'hu': paperback_extensions_common_1.LanguageCode.HUNGARIAN,
    'id': paperback_extensions_common_1.LanguageCode.INDONESIAN,
    'il': paperback_extensions_common_1.LanguageCode.ISRELI,
    'in': paperback_extensions_common_1.LanguageCode.INDIAN,
    'ir': paperback_extensions_common_1.LanguageCode.IRAN,
    'it': paperback_extensions_common_1.LanguageCode.ITALIAN,
    'jp': paperback_extensions_common_1.LanguageCode.JAPANESE,
    'kr': paperback_extensions_common_1.LanguageCode.KOREAN,
    'lt': paperback_extensions_common_1.LanguageCode.LITHUANIAN,
    'mn': paperback_extensions_common_1.LanguageCode.MONGOLIAN,
    'mx': paperback_extensions_common_1.LanguageCode.MEXIAN,
    'my': paperback_extensions_common_1.LanguageCode.MALAY,
    'nl': paperback_extensions_common_1.LanguageCode.DUTCH,
    'no': paperback_extensions_common_1.LanguageCode.NORWEGIAN,
    'ph': paperback_extensions_common_1.LanguageCode.PHILIPPINE,
    'pl': paperback_extensions_common_1.LanguageCode.POLISH,
    'pt': paperback_extensions_common_1.LanguageCode.PORTUGUESE,
    'ro': paperback_extensions_common_1.LanguageCode.ROMANIAN,
    'ru': paperback_extensions_common_1.LanguageCode.RUSSIAN,
    'sa': paperback_extensions_common_1.LanguageCode.SANSKRIT,
    'si': paperback_extensions_common_1.LanguageCode.SAMI,
    'th': paperback_extensions_common_1.LanguageCode.THAI,
    'tr': paperback_extensions_common_1.LanguageCode.TURKISH,
    'ua': paperback_extensions_common_1.LanguageCode.UKRAINIAN,
    'vn': paperback_extensions_common_1.LanguageCode.VIETNAMESE
};

},{"paperback-extensions-common":4}],27:[function(require,module,exports){
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
exports.Lelmangavf = exports.LelmangavfInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const LelmangavfParser_1 = require("./LelmangavfParser");
const LM_DOMAIN = 'https://www.lelmangavf.com';
const method = 'GET';
const headers = {
    referer: LM_DOMAIN
};
exports.LelmangavfInfo = {
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
            type: paperback_extensions_common_1.TagType.GREEN
        },
        {
            text: "French",
            type: paperback_extensions_common_1.TagType.GREY
        }
    ]
};
class Lelmangavf extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.parser = new LelmangavfParser_1.LelmangavfParser();
        this.collectedIds = [];
    }
    getMangaShareUrl(mangaId) {
        return `${LM_DOMAIN}/scan-manga/${mangaId}`;
    }
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${LM_DOMAIN}/scan-manga/${mangaId}`,
                method
            });
            const response = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(response.data);
            return this.parser.parseMangaDetails($, mangaId);
        });
    }
    getChapters(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let chapters = [];
            let pageRequest = createRequestObject({
                url: `${LM_DOMAIN}/scan-manga/${mangaId}`,
                method
            });
            const response = yield this.requestManager.schedule(pageRequest, 1);
            let $ = this.cheerio.load(response.data);
            chapters = chapters.concat(this.parser.parseChapterList($, mangaId, this));
            return chapters;
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: chapterId,
                method,
            });
            let response = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(response.data);
            let pages = this.parser.parseChapterDetails($);
            return createChapterDetails({
                id: chapterId,
                mangaId: mangaId,
                pages: pages,
                longStrip: false
            });
        });
    }
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        return __awaiter(this, void 0, void 0, function* () {
            let loadNextPage = true;
            let currPageNum = 1;
            while (loadNextPage) {
                let request = createRequestObject({
                    url: `${LM_DOMAIN}/latest-release?page=${currPageNum}`,
                    method
                });
                let response = yield this.requestManager.schedule(request, 1);
                let $ = this.cheerio.load(response.data);
                let updatedManga = this.parser.filterUpdatedManga($, time, ids, this);
                loadNextPage = updatedManga.loadNextPage;
                if (loadNextPage) {
                    currPageNum++;
                }
                if (updatedManga.updates.length > 0) {
                    mangaUpdatesFoundCallback(createMangaUpdates({
                        ids: updatedManga.updates
                    }));
                }
            }
        });
    }
    searchRequest(query, _metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${LM_DOMAIN}/search`,
                method,
            });
            const response = yield this.requestManager.schedule(request, 1);
            // const $ = this.cheerio.load(response.data)
            const manga = this.parser.parseSearchResults(query, response.data);
            return createPagedResults({
                results: manga,
            });
        });
    }
    getTags() {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${LM_DOMAIN}/scan-manga-list`,
                method
            });
            const response = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(response.data);
            return this.parser.parseTags($);
        });
    }
    getHomePageSections(sectionCallback) {
        return __awaiter(this, void 0, void 0, function* () {
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
            ];
            const promises = [];
            for (const sectionRequest of sectionsRequests) {
                // Let the app load empty sections
                sectionCallback(sectionRequest.section);
                // Get the section data
                promises.push(this.requestManager.schedule(sectionRequest.request, 1).then(response => {
                    const $ = this.cheerio.load(response.data);
                    switch (sectionRequest.section.id) {
                        case 'popularUpdates':
                            sectionRequest.section.items = this.parser.parsePopularMangaTiles($);
                            break;
                        case 'zAll':
                            sectionRequest.section.items = this.parser.parseAllMangaTiles($);
                            break;
                        case 'recentUpdates':
                            this.collectedIds = [];
                            let data = this.parser.parseLatestMangaTiles($, this.collectedIds, 1);
                            sectionRequest.section.items = data[0];
                            this.collectedIds = data[1];
                            break;
                        default:
                            console.log('getHomePageSections(): Invalid section ID');
                    }
                    sectionCallback(sectionRequest.section);
                }));
            }
            // Make sure the function completes
            yield Promise.all(promises);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (metadata == null) {
                this.collectedIds = [];
            }
            let param = '';
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            switch (homepageSectionId) {
                case 'zAll': {
                    param = `scan-manga-list?page=${page}`;
                    break;
                }
                case 'recentUpdates': {
                    param = `latest-release?page=${page}`;
                    break;
                }
                default:
                    return Promise.resolve(null);
            }
            let request = createRequestObject({
                url: `${LM_DOMAIN}/${param}`,
                method
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let manga = [];
            switch (homepageSectionId) {
                case 'zAll':
                    manga = this.parser.parseAllMangaTiles($);
                    break;
                case 'recentUpdates':
                    let result = this.parser.parseLatestMangaTiles($, this.collectedIds, page);
                    manga = result[0];
                    this.collectedIds = result[1];
                    break;
                default:
            }
            let mData;
            if (!this.parser.isLastPage($)) {
                mData = { page: (page + 1) };
            }
            else {
                mData = undefined; // There are no more pages to continue on to, do not provide page metadata
            }
            return createPagedResults({
                results: manga,
                metadata: mData
            });
        });
    }
    getCloudflareBypassRequest() {
        return createRequestObject({
            url: `${LM_DOMAIN}`,
            method,
        });
    }
    convertTime(timeAgo) {
        let time;
        if (timeAgo.includes('/')) {
            const dateParts = timeAgo.split("/");
            timeAgo = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        }
        if (timeAgo === 'Hier') { // Yesterday
            time = new Date();
            time.setDate(time.getDate() - 1);
        }
        else if (timeAgo.match(/^([^0-9]*)$/)) { // Today (no numbers)
            time = new Date(Date.now());
        }
        else {
            time = new Date(timeAgo);
        }
        return time;
    }
}
exports.Lelmangavf = Lelmangavf;

},{"./LelmangavfParser":28,"paperback-extensions-common":4}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LelmangavfParser = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const Languages_1 = require("./Languages");
const LM_DOMAIN = 'https://www.lelmangavf.com';
class LelmangavfParser {
    parseMangaDetails($, mangaId) {
        var _a, _b, _c, _d, _e;
        const panel = $('.row').first();
        const table = $('.dl-horizontal', panel).first();
        const title = (_a = $('.widget-title', panel).first().text()) !== null && _a !== void 0 ? _a : 'No title';
        const titles = [this.decodeHTMLEntity(title)];
        const image = ((_b = $('img', panel).attr('src')) !== null && _b !== void 0 ? _b : '').replace('//', 'https://');
        const author = $('.dl-horizontal dd:nth-child(6)').text().replace(/\r?\n|\r/g, '');
        const artist = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '');
        const rating = Number($(".rating div[id='item-rating']").attr('data-score'));
        const status = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '').trim() == 'Ongoing' ? paperback_extensions_common_1.MangaStatus.ONGOING : paperback_extensions_common_1.MangaStatus.COMPLETED;
        const arrayTags = [];
        let hentai = false;
        // Categories
        const tableElements = $('.dl-horizontal').children().toArray();
        const tableElementsText = tableElements.map(x => $(x).text().trim());
        if (tableElementsText.indexOf('Catégories') !== -1) {
            const categoryIndex = tableElementsText.indexOf('Catégories') + 1;
            const categories = $(tableElements[categoryIndex]).find('a').toArray();
            for (const category of categories) {
                const label = $(category).text();
                const id = (_d = (_c = $(category).attr('href')) === null || _c === void 0 ? void 0 : _c.split('/').pop()) !== null && _d !== void 0 ? _d : label;
                if (['Mature'].includes(label)) {
                    hentai = true;
                }
                arrayTags.push({ id: id, label: label });
            }
        }
        // Genres
        $('.tag-links a', table).each((i, tag) => {
            var _a, _b;
            const label = $(tag).text();
            const id = (_b = (_a = $(tag).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : label;
            if (['Mature'].includes(label)) {
                hentai = true;
            }
            if (!arrayTags.includes({ id: id, label: label })) {
                arrayTags.push({ id: id, label: label });
            }
        });
        const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
        // Date
        const dateModified = (_e = $('.chapters .date-chapter-title-rtl').first().text().trim()) !== null && _e !== void 0 ? _e : '';
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
            author: this.decodeHTMLEntity(author !== null && author !== void 0 ? author : ''),
            tags: tagSections,
            // views,
            // follows,
            lastUpdate,
            desc: this.decodeHTMLEntity(summary),
            hentai
        });
    }
    parseChapterList($, mangaId, source) {
        var _a, _b, _c;
        const chapters = [];
        const allChapters = $('.chapters li[class^="volume-"]').toArray();
        for (const chapter of allChapters) {
            const item = $('.chapter-title-rtl', chapter);
            const chapterId = $('a', item).attr('href');
            const name = $('em', item).text();
            const chapGroup = (_a = $(chapter).attr('class')) !== null && _a !== void 0 ? _a : '';
            let chapNum = Number($('a', item).text().split(' ').pop());
            if (isNaN(chapNum)) {
                chapNum = 0;
            }
            const language = (_b = $('html').attr('lang')) !== null && _b !== void 0 ? _b : 'fr';
            const time = source.convertTime($('.action .date-chapter-title-rtl', chapter).text().trim());
            if (typeof chapterId === 'undefined')
                continue;
            chapters.push(createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: chapNum,
                group: this.decodeHTMLEntity(chapGroup),
                langCode: (_c = Languages_1.reverseLangCode[language]) !== null && _c !== void 0 ? _c : Languages_1.reverseLangCode['_unknown'],
                name: this.decodeHTMLEntity(name),
                time: time
            }));
        }
        return chapters;
    }
    parseChapterDetails($) {
        var _a;
        const pages = [];
        // Get all of the pages
        const allItems = $('div[id="all"] img', '.col-sm-8').toArray();
        for (const item of allItems) {
            const page = (_a = $(item).attr('data-src')) === null || _a === void 0 ? void 0 : _a.replace(' //', 'https://').trim();
            // If page is undefined, dont push it
            if (typeof page === 'undefined')
                continue;
            pages.push(page);
        }
        return pages;
    }
    filterUpdatedManga($, time, ids, source) {
        const foundIds = [];
        let passedReferenceTime = false;
        const panel = $('.mangalist');
        const allItems = $('.manga-item', panel).toArray();
        for (const item of allItems) {
            const url = $('a', item).first().attr('href');
            const urlSplit = url === null || url === void 0 ? void 0 : url.split('/');
            const id = urlSplit === null || urlSplit === void 0 ? void 0 : urlSplit.pop();
            if (typeof id === 'undefined')
                continue;
            const mangaTime = source.convertTime($('.pull-right', item).text().trim());
            passedReferenceTime = mangaTime <= time;
            if (!passedReferenceTime) {
                if (ids.includes(id)) {
                    foundIds.push(id);
                }
            }
            else
                break;
        }
        if (!passedReferenceTime) {
            return { updates: foundIds, loadNextPage: true };
        }
        else {
            return { updates: foundIds, loadNextPage: false };
        }
    }
    parseSearchResults(query, data) {
        var _a, _b;
        const parsedJSON = JSON.parse(data);
        const suggestions = parsedJSON['suggestions'];
        const mangaTiles = [];
        for (const manga of suggestions) {
            if ((manga.value).toLowerCase().includes((_b = (_a = query.title) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '')) {
                const id = manga.data;
                const image = `${LM_DOMAIN}/uploads/manga/${id}/cover/cover_250x350.jpg`;
                const title = manga.value;
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: this.decodeHTMLEntity(title) }),
                    subtitleText: createIconText({ text: '' }),
                    image: image
                }));
            }
        }
        return mangaTiles;
    }
    parseTags($) {
        var _a, _b;
        const arrayTags = [];
        // Categories
        const categories = $('.list-category li').toArray();
        for (const category of categories) {
            const label = $(category).text();
            const id = (_b = (_a = $(category).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : label;
            arrayTags.push({ id: id, label: label });
        }
        // Genres
        $('.tag-links a').each((i, tag) => {
            var _a, _b;
            const label = $(tag).text().trim();
            const id = (_b = (_a = $(tag).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : label;
            if (!arrayTags.includes({ id: id, label: label })) {
                arrayTags.push({ id: id, label: label });
            }
        });
        const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
        return tagSections;
    }
    parsePopularMangaTiles($) {
        var _a;
        const tiles = [];
        const collectedIds = [];
        const panel = $('.hot-thumbnails');
        const allItems = $('.span3', panel).toArray();
        for (const item of allItems) {
            const url = $('a', item).first().attr('href');
            const urlSplit = url === null || url === void 0 ? void 0 : url.split('/');
            const id = urlSplit === null || urlSplit === void 0 ? void 0 : urlSplit.pop();
            const titleText = this.decodeHTMLEntity($('.label-warning', item).text().trim());
            const subtitle = this.decodeHTMLEntity($('p', item).text().trim());
            const image = (_a = $('img', item).first().attr('src')) === null || _a === void 0 ? void 0 : _a.replace('//', 'https://');
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            if (!collectedIds.includes(id)) {
                tiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: titleText }),
                    subtitleText: createIconText({ text: subtitle }),
                    image: image
                }));
                collectedIds.push(id);
            }
        }
        return tiles;
    }
    parseAllMangaTiles($) {
        var _a;
        const tiles = [];
        const collectedIds = [];
        const panel = $('.content');
        const allItems = $('.col-sm-6', panel).toArray();
        for (const item of allItems) {
            const url = $('a', item).first().attr('href');
            const urlSplit = url === null || url === void 0 ? void 0 : url.split('/');
            const id = urlSplit === null || urlSplit === void 0 ? void 0 : urlSplit.pop();
            const titleText = this.decodeHTMLEntity($('.chart-title', item).text().trim());
            const subtitle = $('.media-body div[style^="position"] a', item).text().trim();
            const image = (_a = $('img', item).first().attr('src')) === null || _a === void 0 ? void 0 : _a.replace('//', 'https://');
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            if (!collectedIds.includes(id)) {
                tiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: titleText }),
                    subtitleText: createIconText({ text: this.decodeHTMLEntity(subtitle) }),
                    image: image
                }));
                collectedIds.push(id);
            }
        }
        return tiles;
    }
    // Maintain a set as a class variable and reset it everytime 'getViewMoreItems'
    // is called with null metadata. Check it for duplicate ids
    // Loading the next page is temp disabled until this is fixed
    parseLatestMangaTiles($, collectedIds, page) {
        const tiles = [];
        if (page === 1) {
            collectedIds = [];
        }
        const panel = $('.mangalist');
        const allItems = $('.manga-item', panel).toArray();
        for (const item of allItems) {
            const url = $('a', item).first().attr('href');
            const urlSplit = url === null || url === void 0 ? void 0 : url.split('/');
            const id = urlSplit === null || urlSplit === void 0 ? void 0 : urlSplit.pop();
            const titleText = this.decodeHTMLEntity($('a:nth-child(2)', item).text().trim());
            const subtitle = this.decodeHTMLEntity($('a:nth-child(1)', item).first().text().trim());
            const image = `${LM_DOMAIN}/uploads/manga/${id}/cover/cover_250x350.jpg`;
            if (typeof id === 'undefined')
                continue;
            if (!collectedIds.includes(id)) {
                tiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: titleText }),
                    subtitleText: createIconText({ text: subtitle }),
                    image: image
                }));
                collectedIds.push(id);
            }
        }
        return [tiles, collectedIds];
    }
    isLastPage($) {
        return $('ul.pagination li').last().hasClass('disabled');
    }
    decodeHTMLEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
            return String.fromCharCode(dec);
        });
    }
}
exports.LelmangavfParser = LelmangavfParser;

},{"./Languages":26,"paperback-extensions-common":4}]},{},[27])(27)
});
