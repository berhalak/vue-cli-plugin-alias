"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var cheerio = __importStar(require("cheerio"));
// traverse all elements in cherrio dom
function traverse(element, visitor) {
    var result = visitor(element);
    if (result)
        return result;
    if (element.childNodes) {
        for (var _i = 0, _a = element.childNodes; _i < _a.length; _i++) {
            var child = _a[_i];
            result = traverse(child, visitor);
            if (result)
                return result;
        }
    }
    return null;
}
function rewrite(source) {
    // if file doesn't hava aliases as a first line of a document, don't do anything
    if (!source.startsWith("<template alias")) {
        return source;
    }
    var isUpper = source.startsWith("<template alias upper") || source.startsWith("<template alias=\"\" upper=\"\"");
    var template = source.match(/<template alias.*<\/template>/s);
    if (template && template.length) {
        template = template[0];
    }
    else {
        return source;
    }
    // define aliases dictionary	
    var aliases = {};
    // load vue template, wrap it in body, for use in html method at the end (html renders inner content)
    var $ = cheerio.load("<body>" + template + "</body>", { recognizeSelfClosing: true, xmlMode: true, decodeEntities: false });
    // function that will read all aliases, declared in a define block, or inline
    function readAllAliases() {
        // get global template
        var template = $("template")[0];
        traverse(template, function (e) {
            // make sure that it is proper tag
            if (!e || !e.tagName || e.type != "tag") {
                return null;
            }
            // if this is an inline alias (started with a, for example a-header)
            // add this as inline
            var isAlias = e.tagName.startsWith("a-");
            if (!isAlias && isUpper) {
                isAlias = !!/[A-Z]/.exec(e.tagName[0]);
            }
            if (isAlias) {
                if (!(e.tagName in aliases)) {
                    aliases[e.tagName] = null;
                }
                if (e.attribs["as"]) {
                    var wasDefined = aliases[e.tagName] && typeof aliases[e.tagName] != 'string';
                    if (!wasDefined) {
                        aliases[e.tagName] = e.attribs["as"];
                    }
                }
            }
            // if this is defined alias, add along with all the content
            if (e.tagName == "define") {
                var att = Object.keys(e.attribs);
                if (att && att.length) {
                    aliases[att[0]] = e.childNodes.length ? e.childNodes.find(function (x) { return x.type == 'tag'; }) || null : null;
                }
            }
            return null;
        });
    }
    function modifyAllTags() {
        // get the template node
        var template = $("template")[0];
        // traverse all tags
        traverse(template, function (element) {
            // make sure it is valid
            if (!element || !element.tagName || element.type != "tag") {
                return null;
            }
            // if this is an alias
            if (element.tagName in aliases) {
                // get definition
                var def = aliases[element.tagName];
                // combine classes
                // first from definition
                var classList = "";
                if (def && def.attribs) {
                    classList = (def.attribs["class"] || "");
                }
                // next from instance
                if (element.attribs["class"]) {
                    classList += " " + element.attribs["class"];
                }
                // last as tag name
                classList += " " + element.tagName;
                classList = classList.trim();
                // next combine styles
                var styleList = "";
                if (def && def.attribs) {
                    styleList = (def.attribs["style"] || "");
                }
                // next from instance
                if (element.attribs["style"]) {
                    styleList += (styleList ? ";" : "") + element.attribs["style"];
                }
                styleList = styleList.trim();
                if (styleList) {
                    // finally create attributes 
                    element.attribs = Object.assign(element.attribs, {
                        class: classList,
                        style: styleList
                    });
                }
                else {
                    element.attribs = Object.assign(element.attribs, {
                        class: classList
                    });
                }
                // now copy the rest attributes
                if (def && def.attribs) {
                    for (var key in def.attribs) {
                        if (key != 'class' && key != 'style') {
                            if (!(key in element.attribs)) {
                                element.attribs[key] = def.attribs[key];
                            }
                        }
                    }
                }
                // replace tag name
                element.tagName = def && def.tagName ? def.tagName :
                    def && typeof def == 'string' ? def :
                        "div";
                // copy content if there is anything, replacing element content
                if (def && def.childNodes && def.childNodes.length) {
                    var jElement = $(element);
                    // copy element content
                    var elementHtml = (jElement.html() || "").trim();
                    // copy definition content
                    var defHtml = ($(def).html() || "").trim();
                    // clear element content
                    element.childNodes = [];
                    // replace content with definition clone
                    jElement.append(defHtml);
                    // if definition has slots
                    if ($("slot", def).length) {
                        // replace slot with elements content (that we copied previously)
                        // now slot is also on element
                        $("slot", element).replaceWith(elementHtml);
                    }
                }
            }
            // continue
            return null;
        });
        // remove the definition
        $("template define").remove();
    }
    // first read all aliases
    readAllAliases();
    // then go through every tag and modify this according to the definition
    modifyAllTags();
    // now serialize body content to html
    var result = $("body").html();
    result = source.replace(template, result);
    return result;
}
exports.rewrite = rewrite;
//# sourceMappingURL=vue-alias.js.map