import * as acorn from 'acorn';
import { DriftLexer } from './lexer.js';
import type {
  Token,
  TokenSource,
  ProgramNode,
  TemplateChildNode,
  ElementNode,
  AttributeNode,
  InterpolationNode,
  IfNode,
  ForNode,
  SwitchNode,
  CaseBranch,
  AsyncNode,
  CatchBranch,
} from '../types/index.js';
import {
  TokenType,
  ASTNodeType,
  DriftParserError,
} from '../types/index.js';
import {
  VOID_ELEMENTS,
  hasMatchingOuterParens,
} from 'driftjs-shared';

class ArrayTokenSource implements TokenSource {
  private readonly tokens: readonly Token[];
  private current = 0;

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  public nextToken(): Token {
    if (this.current >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1]!;
    }

    const token = this.tokens[this.current]!;
    this.current++;
    return token;
  }
}

const HTML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0',
  copy: '©', reg: '®', trade: '™', mdash: '—', ndash: '–', hellip: '…',
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  sbquo: '‚', bdquo: '„', bull: '•', times: '×', divide: '÷', plusmn: '±',
  euro: '€', pound: '£', yen: '¥', cent: '¢', deg: '°', para: '¶',
  sect: '§', micro: 'µ', middot: '·', frac14: '¼', frac12: '½', frac34: '¾',
  sup1: '¹', sup2: '²', sup3: '³', dagger: '†', Dagger: '‡', permil: '‰',
  prime: '′', Prime: '″', infin: '∞', radic: '√', sim: '∼', asymp: '≈',
  ne: '≠', equiv: '≡', le: '≤', ge: '≥', sub: '⊂', sup: '⊃', nsub: '⊄',
  sube: '⊆', supe: '⊇', oplus: '⊕', otimes: '⊗', perp: '⊥', sdot: '⋅',
  sum: '∑', prod: '∏', minus: '−', lowast: '∗', forall: '∀', part: '∂',
  exist: '∃', empty: '∅', nabla: '∇', isin: '∈', notin: '∉', ni: '∋',
  and: '∧', or: '∨', cap: '∩', cup: '∪', int: '∫', there4: '∴', cong: '≅',
  ang: '∠', loz: '◊', spades: '♠', clubs: '♣', hearts: '♥', diams: '♦',
  larr: '←', uarr: '↑', rarr: '→', darr: '↓', harr: '↔', crarr: '↵',
  Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Epsilon: 'Ε', Zeta: 'Ζ',
  Eta: 'Η', Theta: 'Θ', Iota: 'Ι', Kappa: 'Κ', Lambda: 'Λ', Mu: 'Μ',
  Nu: 'Ν', Xi: 'Ξ', Omicron: 'Ο', Pi: 'Π', Rho: 'Ρ', Sigma: 'Σ',
  Tau: 'Τ', Upsilon: 'Υ', Phi: 'Φ', Chi: 'Χ', Psi: 'Ψ', Omega: 'Ω',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ',
  eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
  nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', rho: 'ρ', sigmaf: 'ς',
  sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ',
  omega: 'ω',
};

/**
 * Decodes standard named and numeric HTML character references in text nodes and attributes.
 */
export function decodeHTMLEntities(text: string): string {
  if (!text || !text.includes('&')) return text;
  return text.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z0-9]+));/g, (match, dec, hex, named) => {
    if (dec) {
      const code = parseInt(dec, 10);
      try {
        if (!isNaN(code) && code >= 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff)) {
          return String.fromCodePoint ? String.fromCodePoint(code) : String.fromCharCode(code);
        }
        return '\uFFFD';
      } catch {
        return '\uFFFD';
      }
    }
    if (hex) {
      const code = parseInt(hex, 16);
      try {
        if (!isNaN(code) && code >= 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff)) {
          return String.fromCodePoint ? String.fromCodePoint(code) : String.fromCharCode(code);
        }
        return '\uFFFD';
      } catch {
        return '\uFFFD';
      }
    }
    if (named) {
      return HTML_NAMED_ENTITIES[named] || match;
    }
    return match;
  });
}

/**
 * Parser for Drift template tokens producing a structured AST.
 *
 * The parser lazily pulls tokens from the lexer on demand and keeps a small
 * lookahead buffer for local decisions.
 */
export class DriftParser {
  private readonly tokenSource: TokenSource;
  private readonly lookahead: Token[] = [];

  constructor(input: DriftLexer | readonly Token[]) {
    this.tokenSource = Array.isArray(input) ? new ArrayTokenSource(input) : (input as DriftLexer);
  }

  public parse(): ProgramNode {
    this.lookahead.length = 0;
    return this.parseProgram();
  }

  private parseProgram(): ProgramNode {
    const startLoc = this.peek().loc.start;
    const body: TemplateChildNode[] = [];

    while (!this.isAtEnd()) {
      body.push(this.parseChild());
    }

    const endLoc = this.peek().loc.end;

    return {
      type: ASTNodeType.Program,
      body,
      loc: { start: startLoc, end: endLoc },
    };
  }

  private parseChild(): TemplateChildNode {
    const token = this.peek();

    if (token.type === TokenType.Comment) {
      this.advance();
      return {
        type: ASTNodeType.Comment,
        content: token.value,
        loc: token.loc,
      };
    }

    if (token.type === TokenType.Interpolation) {
      this.advance();
      return {
        type: ASTNodeType.Interpolation,
        expression: token.value,
        loc: token.loc,
      };
    }

    if (token.type === TokenType.TagOpen) {
      return this.parseElement();
    }

    if (token.type === TokenType.DirectiveIf) {
      return this.parseIfDirective();
    }

    if (token.type === TokenType.DirectiveFor) {
      return this.parseForDirective();
    }

    if (token.type === TokenType.DirectiveSwitch) {
      return this.parseSwitchDirective();
    }

    if (token.type === TokenType.DirectiveAsync) {
      return this.parseAsyncDirective();
    }

    if (token.type === TokenType.Text) {
      this.advance();
      return {
        type: ASTNodeType.Text,
        content: decodeHTMLEntities(token.value),
        loc: token.loc,
      };
    }

    if (token.type === TokenType.TagOpenSlash) {
      throw new DriftParserError(
        `Unexpected closing tag '</${this.peek(1).value}>' without opening tag`,
        token.loc.start.line,
        token.loc.start.column,
        token.loc.start.offset
      );
    }

    throw new DriftParserError(
      `Unexpected token '${token.value}' of type '${token.type}'`,
      token.loc.start.line,
      token.loc.start.column,
      token.loc.start.offset
    );
  }

  private parseElement(): ElementNode {
    const openToken = this.consume(TokenType.TagOpen, 'Expected opening tag bracket');
    const startLoc = openToken.loc.start;

    const tagToken = this.consume(TokenType.Identifier, 'Expected tag name after opening bracket');
    const tagName = tagToken.value;

    const attributes: AttributeNode[] = [];
    while (
      !this.check(TokenType.TagClose) &&
      !this.check(TokenType.TagSelfClose) &&
      !this.isAtEnd()
    ) {
      attributes.push(this.parseAttribute());
    }

    if (this.check(TokenType.TagSelfClose)) {
      const selfCloseToken = this.advance();
      return {
        type: ASTNodeType.Element,
        tagName,
        attributes,
        children: [],
        isSelfClosing: true,
        loc: { start: startLoc, end: selfCloseToken.loc.end },
      };
    }

    const closeToken = this.consume(TokenType.TagClose, 'Expected closing bracket after attributes');

    if (VOID_ELEMENTS.has(tagName.toLowerCase())) {
      return {
        type: ASTNodeType.Element,
        tagName,
        attributes,
        children: [],
        isSelfClosing: true,
        loc: { start: startLoc, end: closeToken.loc.end },
      };
    }

    const isRaw = tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'style';
    const children: TemplateChildNode[] = [];
    while (!this.check(TokenType.TagOpenSlash) && !this.isAtEnd()) {
      if (isRaw && this.check(TokenType.Text)) {
        const textToken = this.advance();
        children.push({
          type: ASTNodeType.Text,
          content: textToken.value,
          loc: textToken.loc,
        });
      } else {
        children.push(this.parseChild());
      }
    }

    if (this.isAtEnd()) {
      throw new DriftParserError(
        `Unclosed element '<${tagName}>', expected closing tag '</${tagName}>'`,
        startLoc.line,
        startLoc.column,
        startLoc.offset
      );
    }

    this.consume(TokenType.TagOpenSlash, `Expected closing tag '</${tagName}>'`);
    const closingTagToken = this.consume(
      TokenType.Identifier,
      'Expected closing tag name'
    );

    if (closingTagToken.value !== tagName && closingTagToken.value.toLowerCase() !== tagName.toLowerCase()) {
      throw new DriftParserError(
        `Mismatched closing tag. Expected '</${tagName}>' but got '</${closingTagToken.value}>'`,
        closingTagToken.loc.start.line,
        closingTagToken.loc.start.column,
        closingTagToken.loc.start.offset
      );
    }

    const closeBracketToken = this.consume(
      TokenType.TagClose,
      `Expected '>' after closing tag name`
    );

    return {
      type: ASTNodeType.Element,
      tagName,
      attributes,
      children,
      isSelfClosing: false,
      loc: { start: startLoc, end: closeBracketToken.loc.end },
    };
  }

  private parseAttribute(): AttributeNode {
    const nameToken = this.consume(TokenType.Identifier, 'Expected attribute name');
    const startLoc = nameToken.loc.start;
    const name = nameToken.value;

    if (this.matchToken(TokenType.Equals)) {
      const valueToken = this.peek();

      if (valueToken.type === TokenType.StringLiteral) {
        this.advance();
        return {
          type: ASTNodeType.Attribute,
          name,
          value: decodeHTMLEntities(valueToken.value),
          loc: { start: startLoc, end: valueToken.loc.end },
        };
      }

      if (valueToken.type === TokenType.Interpolation) {
        this.advance();
        const interpNode: InterpolationNode = {
          type: ASTNodeType.Interpolation,
          expression: valueToken.value,
          loc: valueToken.loc,
        };
        return {
          type: ASTNodeType.Attribute,
          name,
          value: interpNode,
          loc: { start: startLoc, end: valueToken.loc.end },
        };
      }

      throw new DriftParserError(
        `Expected string literal or interpolation after '=' for attribute '${name}'`,
        valueToken.loc.start.line,
        valueToken.loc.start.column,
        valueToken.loc.start.offset
      );
    }

    return {
      type: ASTNodeType.Attribute,
      name,
      value: null,
      loc: { start: startLoc, end: nameToken.loc.end },
    };
  }

  private parseIfDirective(): IfNode {
    const ifToken = this.consume(TokenType.DirectiveIf, 'Expected @if directive');
    const startLoc = ifToken.loc.start;
    const test = ifToken.value;

    const consequent: TemplateChildNode[] = [];
    while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
      consequent.push(this.parseChild());
    }
    const endBlockToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @if block');

    let alternate: TemplateChildNode[] | IfNode | null = null;
    let endLoc = endBlockToken.loc.end;

    this.skipWhitespaceTokens();

    if (this.check(TokenType.DirectiveElseIf)) {
      alternate = this.parseElseIfChain();
      endLoc = alternate.loc.end;
    } else if (this.check(TokenType.DirectiveElse)) {
      this.advance(); // consume @else
      const elseBody: TemplateChildNode[] = [];
      while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
        elseBody.push(this.parseChild());
      }
      const elseCloseToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @else block');
      alternate = elseBody;
      endLoc = elseCloseToken.loc.end;
    }

    return {
      type: ASTNodeType.If,
      test,
      consequent,
      alternate,
      loc: { start: startLoc, end: endLoc },
    };
  }

  private parseElseIfChain(): IfNode {
    const elseIfToken = this.consume(TokenType.DirectiveElseIf, 'Expected @else if directive');
    const startLoc = elseIfToken.loc.start;
    const test = elseIfToken.value;

    const consequent: TemplateChildNode[] = [];
    while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
      consequent.push(this.parseChild());
    }
    const endBlockToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @else if block');

    let alternate: TemplateChildNode[] | IfNode | null = null;
    let endLoc = endBlockToken.loc.end;

    this.skipWhitespaceTokens();

    if (this.check(TokenType.DirectiveElseIf)) {
      alternate = this.parseElseIfChain();
      endLoc = alternate.loc.end;
    } else if (this.check(TokenType.DirectiveElse)) {
      this.advance(); // consume @else
      const elseBody: TemplateChildNode[] = [];
      while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
        elseBody.push(this.parseChild());
      }
      const elseCloseToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @else block');
      alternate = elseBody;
      endLoc = elseCloseToken.loc.end;
    }

    return {
      type: ASTNodeType.If,
      test,
      consequent,
      alternate,
      loc: { start: startLoc, end: endLoc },
    };
  }

  private parseForDirective(): ForNode {
    const forToken = this.consume(TokenType.DirectiveFor, 'Expected @for directive');
    const startLoc = forToken.loc.start;
    let header = forToken.value.trim();

    while (hasMatchingOuterParens(header)) {
      header = header.slice(1, -1).trim();
    }

    // 1. Locate the top-level 'in' keyword using Acorn's tokenizer with depth tracking
    let inToken: any = null;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let tokenizerError: any = null;

    try {
      const tokenizer = acorn.tokenizer(header, { ecmaVersion: 'latest' });
      for (const tok of tokenizer) {
        if (tok.type === acorn.tokTypes.parenL) {
          parenDepth++;
        } else if (tok.type === acorn.tokTypes.parenR) {
          parenDepth = Math.max(0, parenDepth - 1);
        } else if (tok.type === acorn.tokTypes.bracketL) {
          bracketDepth++;
        } else if (tok.type === acorn.tokTypes.bracketR) {
          bracketDepth = Math.max(0, bracketDepth - 1);
        } else if (tok.type === acorn.tokTypes.braceL || tok.type === acorn.tokTypes.dollarBraceL) {
          braceDepth++;
        } else if (tok.type === acorn.tokTypes.braceR) {
          braceDepth = Math.max(0, braceDepth - 1);
        } else if (
          tok.type === acorn.tokTypes._in &&
          parenDepth === 0 &&
          bracketDepth === 0 &&
          braceDepth === 0
        ) {
          inToken = tok;
          break;
        }
      }
    } catch (err) {
      tokenizerError = err;
    }

    if (!inToken) {
      if (tokenizerError) {
        throw new DriftParserError(
          `Syntax error in @for header: ${tokenizerError.message}`,
          forToken.loc.start.line,
          forToken.loc.start.column,
          forToken.loc.start.offset
        );
      }
      throw new DriftParserError(
        `Invalid @for header syntax '${forToken.value.trim()}'. Expected format: 'item in list' or '(item, index) in list'`,
        forToken.loc.start.line,
        forToken.loc.start.column,
        forToken.loc.start.offset
      );
    }

    // 2. Parse Target Bindings (LHS) via Acorn token stream
    let lhs = header.slice(0, inToken.start).trim();

    if (lhs.length === 0) {
      throw new DriftParserError(
        `Invalid @for header syntax '${forToken.value.trim()}'. Expected format: 'item in list' or '(item, index) in list'`,
        forToken.loc.start.line,
        forToken.loc.start.column,
        forToken.loc.start.offset
      );
    }

    let item = '';
    let index: string | null = null;

    if (hasMatchingOuterParens(lhs)) {
      const inner = lhs.slice(1, -1).trim();
      const commaIndices: number[] = [];
      let pDepth = 0;
      let bDepth = 0;
      let brDepth = 0;

      try {
        const tokenizer = acorn.tokenizer(inner, { ecmaVersion: 'latest' });
        for (const tok of tokenizer) {
          if (tok.type === acorn.tokTypes.parenL) pDepth++;
          else if (tok.type === acorn.tokTypes.parenR) pDepth = Math.max(0, pDepth - 1);
          else if (tok.type === acorn.tokTypes.bracketL) bDepth++;
          else if (tok.type === acorn.tokTypes.bracketR) bDepth = Math.max(0, bDepth - 1);
          else if (tok.type === acorn.tokTypes.braceL || tok.type === acorn.tokTypes.dollarBraceL) brDepth++;
          else if (tok.type === acorn.tokTypes.braceR) brDepth = Math.max(0, brDepth - 1);
          else if (tok.type === acorn.tokTypes.comma && pDepth === 0 && bDepth === 0 && brDepth === 0) {
            commaIndices.push(tok.start);
          }
        }
      } catch (err: any) {
        throw new DriftParserError(
          `Invalid @for target bindings '${lhs}': ${err.message}`,
          forToken.loc.start.line,
          forToken.loc.start.column,
          forToken.loc.start.offset
        );
      }

      if (commaIndices.length === 0) {
        item = inner;
      } else if (commaIndices.length === 1) {
        const comma = commaIndices[0]!;
        item = inner.slice(0, comma).trim();
        index = inner.slice(comma + 1).trim();
      } else {
        throw new DriftParserError(
          `Invalid @for target bindings. Expected at most 2 variables (item, index).`,
          forToken.loc.start.line,
          forToken.loc.start.column,
          forToken.loc.start.offset
        );
      }
    } else {
      // Step 2: Reject unparenthesized top-level comma
      let pDepth = 0;
      let bDepth = 0;
      let brDepth = 0;
      let hasTopLevelComma = false;
      try {
        const tokenizer = acorn.tokenizer(lhs, { ecmaVersion: 'latest' });
        for (const tok of tokenizer) {
          if (tok.type === acorn.tokTypes.parenL) pDepth++;
          else if (tok.type === acorn.tokTypes.parenR) pDepth = Math.max(0, pDepth - 1);
          else if (tok.type === acorn.tokTypes.bracketL) bDepth++;
          else if (tok.type === acorn.tokTypes.bracketR) bDepth = Math.max(0, bDepth - 1);
          else if (tok.type === acorn.tokTypes.braceL || tok.type === acorn.tokTypes.dollarBraceL) brDepth++;
          else if (tok.type === acorn.tokTypes.braceR) brDepth = Math.max(0, brDepth - 1);
          else if (tok.type === acorn.tokTypes.comma && pDepth === 0 && bDepth === 0 && brDepth === 0) {
            hasTopLevelComma = true;
            break;
          }
        }
      } catch {
        // Handled below by item binding validation
      }

      if (hasTopLevelComma) {
        throw new DriftParserError(
          `Invalid @for target bindings '${lhs}'. Multiple loop variables must be enclosed in parentheses: '(${lhs})'.`,
          forToken.loc.start.line,
          forToken.loc.start.column,
          forToken.loc.start.offset
        );
      }

      item = lhs;
    }

    // Step 1: Validate item binding via Acorn AST inspection
    if (item.length === 0) {
      throw new DriftParserError(
        `Expected item identifier in @for target bindings.`,
        forToken.loc.start.line,
        forToken.loc.start.column,
        forToken.loc.start.offset
      );
    }
    try {
      const parsed: any = acorn.parse(`let ${item} = 0;`, { ecmaVersion: 'latest' });
      if (
        !parsed ||
        !Array.isArray(parsed.body) ||
        parsed.body.length !== 1 ||
        parsed.body[0].type !== 'VariableDeclaration' ||
        !Array.isArray(parsed.body[0].declarations) ||
        parsed.body[0].declarations.length !== 1
      ) {
        throw new Error();
      }
    } catch {
      throw new DriftParserError(
        `Invalid @for item binding '${item}'. Expected a valid variable identifier or destructuring pattern.`,
        forToken.loc.start.line,
        forToken.loc.start.column,
        forToken.loc.start.offset
      );
    }

    // Validate index binding if present
    if (index !== null) {
      if (index.length === 0) {
        throw new DriftParserError(
          `Unexpected trailing comma in @for target bindings. Expected index identifier.`,
          forToken.loc.start.line,
          forToken.loc.start.column,
          forToken.loc.start.offset
        );
      }
      try {
        const indexAst = acorn.parseExpressionAt(index, 0, { ecmaVersion: 'latest' });
        if (indexAst.type !== 'Identifier' || index.slice(indexAst.end).trim().length > 0) {
          throw new Error();
        }
      } catch {
        throw new DriftParserError(
          `Invalid @for index binding '${index}'. Array index must be a valid identifier.`,
          forToken.loc.start.line,
          forToken.loc.start.column,
          forToken.loc.start.offset
        );
      }
    }

    // 3. Parse Iterable Expression (RHS) via Acorn
    const rhsStart = inToken.end;
    const rhsRaw = header.slice(rhsStart);
    const leadingWhitespaceLen = rhsRaw.length - rhsRaw.trimStart().length;
    const iterExprStart = rhsStart + leadingWhitespaceLen;

    let iterable = '';
    let iterAst: any = null;

    try {
      iterAst = acorn.parseExpressionAt(header, iterExprStart, { ecmaVersion: 'latest' });
      iterable = header.slice(iterExprStart, iterAst.end).trim();
    } catch {
      throw new DriftParserError(
        `Invalid @for iterable expression in '${forToken.value.trim()}'`,
        forToken.loc.start.line,
        forToken.loc.start.column,
        forToken.loc.start.offset
      );
    }

    // 4. Parse Optional 'key' Clause
    let key: string | null = null;
    const remaining = header.slice(iterAst.end).trim();

    if (remaining.length > 0) {
      if (remaining.startsWith('key ') || remaining.startsWith('key\t') || remaining.startsWith('key\n')) {
        const keyRaw = remaining.slice(3).trim();
        try {
          const keyAst = acorn.parseExpressionAt(keyRaw, 0, { ecmaVersion: 'latest' });
          key = keyRaw.slice(0, keyAst.end).trim();
          const keyRemaining = keyRaw.slice(keyAst.end).trim();
          if (keyRemaining.length > 0) {
            throw new DriftParserError(
              `Unexpected token '${keyRemaining}' after key expression in @for directive.`,
              forToken.loc.start.line,
              forToken.loc.start.column,
              forToken.loc.start.offset
            );
          }
        } catch (err: any) {
          if (err instanceof DriftParserError) throw err;
          throw new DriftParserError(
            `Invalid key expression in @for directive: '${keyRaw}'`,
            forToken.loc.start.line,
            forToken.loc.start.column,
            forToken.loc.start.offset
          );
        }
      } else {
        throw new DriftParserError(
          `Unexpected token '${remaining}' in @for header. Expected 'key <expression>' or block opening '{'.`,
          forToken.loc.start.line,
          forToken.loc.start.column,
          forToken.loc.start.offset
        );
      }
    }

    const body: TemplateChildNode[] = [];
    while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
      body.push(this.parseChild());
    }
    const endBlockToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @for block');

    return {
      type: ASTNodeType.For,
      item,
      index,
      iterable,
      key,
      body,
      loc: { start: startLoc, end: endBlockToken.loc.end },
    };
  }

  private parseSwitchDirective(): SwitchNode {
    const switchToken = this.consume(TokenType.DirectiveSwitch, 'Expected @switch directive');
    const startLoc = switchToken.loc.start;
    const discriminant = switchToken.value;
    const cases: CaseBranch[] = [];

    this.skipWhitespaceTokens();
    while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
      if (this.check(TokenType.DirectiveCase)) {
        const caseToken = this.advance();
        const caseBody: TemplateChildNode[] = [];
        while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
          caseBody.push(this.parseChild());
        }
        const closeToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @case block');
        cases.push({
          expression: caseToken.value,
          body: caseBody,
          loc: { start: caseToken.loc.start, end: closeToken.loc.end },
        });
      } else if (this.check(TokenType.DirectiveDefault)) {
        const defaultToken = this.advance();
        const defaultBody: TemplateChildNode[] = [];
        while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
          defaultBody.push(this.parseChild());
        }
        const closeToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @default block');
        cases.push({
          expression: null,
          body: defaultBody,
          loc: { start: defaultToken.loc.start, end: closeToken.loc.end },
        });
      } else {
        throw new DriftParserError(
          `Unexpected token '${this.peek().value}' inside @switch block. Expected @case or @default.`,
          this.peek().loc.start.line,
          this.peek().loc.start.column,
          this.peek().loc.start.offset
        );
      }
      this.skipWhitespaceTokens();
    }

    const endBlockToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @switch block');

    return {
      type: ASTNodeType.Switch,
      discriminant,
      cases,
      loc: { start: startLoc, end: endBlockToken.loc.end },
    };
  }

  private parseAsyncDirective(): AsyncNode {
    const asyncToken = this.consume(TokenType.DirectiveAsync, 'Expected @async directive');
    const startLoc = asyncToken.loc.start;
    let header = asyncToken.value.trim();

    while (hasMatchingOuterParens(header)) {
      header = header.slice(1, -1).trim();
    }

    let promiseAst: any = null;
    try {
      promiseAst = acorn.parseExpressionAt(header, 0, { ecmaVersion: 'latest' });
    } catch {
      throw new DriftParserError(
        `Invalid @async header syntax '${asyncToken.value.trim()}'. Expected format: '@async <promise> as <alias>'`,
        asyncToken.loc.start.line,
        asyncToken.loc.start.column,
        asyncToken.loc.start.offset
      );
    }

    const promise = header.slice(0, promiseAst.end).trim();
    const remaining = header.slice(promiseAst.end).trim();

    let alias = 'data';
    if (remaining.length > 0) {
      if (remaining.startsWith('as ') || remaining.startsWith('as\t') || remaining.startsWith('as\n')) {
        alias = remaining.slice(2).trim();
        while (hasMatchingOuterParens(alias)) {
          alias = alias.slice(1, -1).trim();
        }
      } else {
        throw new DriftParserError(
          `Unexpected token '${remaining}' in @async header. Expected 'as <alias>'.`,
          asyncToken.loc.start.line,
          asyncToken.loc.start.column,
          asyncToken.loc.start.offset
        );
      }
    }

    if (!promise || !alias) {
      throw new DriftParserError(
        `Invalid @async header syntax '${asyncToken.value.trim()}'. Expected format: '@async <promise> as <alias>'`,
        asyncToken.loc.start.line,
        asyncToken.loc.start.column,
        asyncToken.loc.start.offset
      );
    }

    const body: TemplateChildNode[] = [];
    while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
      body.push(this.parseChild());
    }
    let endToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @async block');

    let fallback: TemplateChildNode[] | null = null;
    let catchBranch: CatchBranch | null = null;

    while (!this.isAtEnd()) {
      this.skipWhitespaceTokens();

      if (this.check(TokenType.DirectiveFallback)) {
        if (fallback !== null) {
          const tok = this.peek();
          throw new DriftParserError(
            `Duplicate @fallback directive for @async block`,
            tok.loc.start.line,
            tok.loc.start.column,
            tok.loc.start.offset
          );
        }
        this.consume(TokenType.DirectiveFallback, 'Expected @fallback directive');
        const fallbackBody: TemplateChildNode[] = [];
        while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
          fallbackBody.push(this.parseChild());
        }
        endToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @fallback block');
        fallback = fallbackBody;
      } else if (this.check(TokenType.DirectiveCatch)) {
        if (catchBranch !== null) {
          const tok = this.peek();
          throw new DriftParserError(
            `Duplicate @catch directive for @async block`,
            tok.loc.start.line,
            tok.loc.start.column,
            tok.loc.start.offset
          );
        }
        const catchToken = this.consume(TokenType.DirectiveCatch, 'Expected @catch directive');
        let errAlias = catchToken.value.trim() || 'error';
        while (hasMatchingOuterParens(errAlias)) {
          errAlias = errAlias.slice(1, -1).trim();
        }
        const catchBody: TemplateChildNode[] = [];
        while (!this.check(TokenType.BlockClose) && !this.isAtEnd()) {
          catchBody.push(this.parseChild());
        }
        endToken = this.consume(TokenType.BlockClose, 'Expected closing brace } for @catch block');
        catchBranch = {
          errorVar: errAlias,
          body: catchBody,
          loc: { start: catchToken.loc.start, end: endToken.loc.end },
        };
      } else {
        break;
      }
    }

    return {
      type: ASTNodeType.Async,
      promise,
      alias,
      body,
      fallback,
      catchBranch,
      loc: { start: startLoc, end: endToken.loc.end },
    };
  }

  private skipWhitespaceTokens(): void {
    while (this.check(TokenType.Text) && this.peek().value.trim().length === 0) {
      this.advance();
    }
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(relativeOffset = 0): Token {
    this.ensureLookahead(relativeOffset);
    return this.lookahead[Math.min(relativeOffset, this.lookahead.length - 1)]!;
  }

  private advance(): Token {
    const token = this.peek();
    if (token.type !== TokenType.EOF) {
      this.lookahead.shift();
    }
    return token;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private matchToken(type: TokenType): boolean {
    if (!this.check(type)) {
      return false;
    }

    this.advance();
    return true;
  }

  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    const token = this.peek();
    throw new DriftParserError(
      errorMessage,
      token.loc.start.line,
      token.loc.start.column,
      token.loc.start.offset
    );
  }

  private ensureLookahead(relativeOffset: number): void {
    while (this.lookahead.length <= relativeOffset) {
      const nextToken = this.tokenSource.nextToken();
      this.lookahead.push(nextToken);

      if (nextToken.type === TokenType.EOF) {
        break;
      }
    }
  }
}
