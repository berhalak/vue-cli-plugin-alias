import * as cheerio from "cheerio"

// traverse all elements in cherrio dom
function traverse(element: CheerioElement, visitor: (e: CheerioElement) => CheerioElement | null): CheerioElement | null {
	let result = visitor(element);
	if (result) return result;
	if (element.childNodes) {
		for (const child of element.childNodes) {
			result = traverse(child, visitor);
			if (result) return result;
		}
	}
	return null;
}

function rewrite(source: string): string {
	// if file doesn't hava aliases as a first line of a document, don't do anything
	if (!source.includes("<template alias")) {
		return source;
	}

	// define aliases dictionary	
	const aliases: { [key: string]: CheerioElement | null | string } = {};

	// load vue template, wrap it in body, for use in html method at the end (html renders inner content)
	const $ = cheerio.load(`<body>${source}</body>`, { recognizeSelfClosing: true, xmlMode: true, decodeEntities: false });

	// function that will read all aliases, declared in a define block, or inline
	function readAllAliases() {
		// get global template
		const template = $("template")[0];
		traverse(template, e => {
			// make sure that it is proper tag
			if (!e || !e.tagName || e.type != "tag") {
				return null;
			}
			// if this is an inline alias (started with a, for example a-header)
			// add this as inline
			if (e.tagName.startsWith("a-")) {
				if (!(e.tagName in aliases)) {
					aliases[e.tagName] = null;
				}
				if (e.attribs["as"]){
					const wasDefined = aliases[e.tagName] && typeof aliases[e.tagName] != 'string';
					if (!wasDefined){
						aliases[e.tagName] = e.attribs["as"];
					}
				}
			}
			// if this is defined alias, add along with all the content
			if (e.tagName == "define") {
				const att = Object.keys(e.attribs);
				if (att && att.length) {
					aliases[att[0]] = e.childNodes.length ? e.childNodes.find(x => x.type == 'tag') || null : null;
				}
			}
			return null;
		});
	}


	function modifyAllTags() {

		// get the template node
		const template = $("template")[0];

		// traverse all tags
		traverse(template, element => {
			// make sure it is valid
			if (!element || !element.tagName || element.type != "tag") {
				return null;
			}
			// if this is an alias
			if (element.tagName in aliases) {
				// get definition
				const def = aliases[element.tagName] as CheerioElement;

				// combine classes

				// first from definition
				let classList = "";
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
				let styleList = "";
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
				if (def && def.attribs){
					for(let key in def.attribs){
						if (key != 'class' && key != 'style'){
							if (!(key in element.attribs)){
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
					let jElement = $(element);

					// copy element content
					const elementHtml = (jElement.html() || "").trim();

					// copy definition content
					const defHtml = ($(def).html() || "").trim();

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
		$("template define").remove()
	}


	// first read all aliases
	readAllAliases();

	// then go through every tag and modify this according to the definition
	modifyAllTags();

	// now serialize body content to html
	return $("body").html() || source;
}

export {
	rewrite
}
