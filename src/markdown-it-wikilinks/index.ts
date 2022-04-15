// Adapted from https://gitlab.com/charlyisidore/markdown-it-internal-link
// MIT License

import type MarkdownIt from 'markdown-it';
import type Renderer from 'markdown-it/lib/renderer';
import type Token from 'markdown-it/lib/token';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline';
type OptionsAsAttrs = Record<string, string | ((content: string, env: unknown) => string)>;

type Options =
	| OptionsAsAttrs
	| ((content: string, isEmbedding: boolean, env: unknown) => string | Record<string, string>);

export default function (md: MarkdownIt, options?: Options): void {
	const openExcChar = '!'.charCodeAt(0);
	const openBracketChar = '['.charCodeAt(0);
	const closeBracketChar = ']'.charCodeAt(0);
	const newlineChar = '\n'.charCodeAt(0);

	function tokenize(state: StateInline, silent: boolean) {
		if (silent) return false;

		const start = state.pos;
		const max = state.posMax;

		// at least 5 characters long (including brackets)
		if (start + 5 >= max) return false;

		let embeddingMode = false;
		// must start with a first '['
		if (state.src.charCodeAt(start) !== openBracketChar) {
			// must start with a second '['
			if (
				state.src.charCodeAt(start) === openExcChar &&
				state.src.charCodeAt(start + 1) === openBracketChar &&
				state.src.charCodeAt(start + 2) === openBracketChar
			) {
				embeddingMode = true;
			} else {
				return false;
			}
		} else {
			if (state.src.charCodeAt(start + 1) !== openBracketChar) return false;
		}
		let pos;
		let foundEnd = false;

		// read content until "]]"
		for (pos = start + (embeddingMode ? 3 : 2); pos + 1 < max; ++pos) {
			const c = state.src.charCodeAt(pos);
			if (c === newlineChar) {
				// no new line
				return false;
			} else if (c === closeBracketChar) {
				// no empty link "[[]]" allowed
				if (pos === start + (embeddingMode ? 3 : 2)) return false;
				// must end with a second ']'
				if (state.src.charCodeAt(pos + 1) !== closeBracketChar) return false;
				foundEnd = true;
				break;
			}
		}

		if (!foundEnd) return false;

		// "[[content]]"
		//  ^        ^
		//  start    pos

		state.pos = start + (embeddingMode ? 3 : 2);
		state.posMax = pos;

		const token = state.push('internal_link', '', 0);
		token.content = state.src.slice(start + (embeddingMode ? 3 : 2), pos);
		token.markup = state.src.slice(start, pos);
		state.pos = pos + (embeddingMode ? 3 : 2);
		state.posMax = max;
		return true;
	}

	function render(
		tokens: Token[],
		idx: number,
		mdopts: MarkdownIt.Options,
		env: unknown,
		self: Renderer
	) {
		const token = tokens[idx];
		const content = token.content;
		let isEmbedding = false;
		if (token.markup && token.markup.charAt(0) === '!') {
			isEmbedding = true;
			console.log('embedding',content)
		}
		console.log({options})
		const result = typeof options === 'function' ? options(content, isEmbedding, env) : options;
		console.log(result, 'test',{result})

		if (typeof result === 'string' || result == undefined) {
			return result || "";
		}
		const attrs: OptionsAsAttrs = result;

		Object.keys(attrs).forEach((key) => {
			const attr = attrs[key];
			if (typeof attr === 'function') {
				attrs[key] = attr(content, env);
			}
		});

		const text = attrs.text;
		delete attrs.text;
		var x = function () {
			console.log('hi ich bins, X');
		};
		token.attrs = Object.keys(attrs)
			.sort()
			.map((key) => [key, attrs[key] as string]);
		if (isEmbedding) {
			return `<figure><img${self.renderAttrs(token)}/></figure>`;
		} else {
			return `<a ${self.renderAttrs(
				token
			)}>${text}</a>`;
		}
	}

	md.inline.ruler.push('internal_link', tokenize);
	md.renderer.rules.internal_link = render;
}
