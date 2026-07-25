/**
 * Rust syntax tokenizer and structural parser for Solana / Anchor smart contracts.
 * Provides line-by-line precise structural representations of parsed files.
 */

export function tokenize(source) {
  const tokens = [];
  let index = 0;
  let line = 1;
  const len = source.length;

  while (index < len) {
    const char = source[index];

    if (char === '\n') { line++; index++; continue; }
    if (/\s/.test(char)) { index++; continue; }

    // Block comments
    if (char === '/' && source[index + 1] === '*') {
      index += 2;
      while (index < len && !(source[index] === '*' && source[index + 1] === '/')) {
        if (source[index] === '\n') line++;
        index++;
      }
      index += 2;
      continue;
    }

    // Line comments
    if (char === '/' && source[index + 1] === '/') {
      index += 2;
      while (index < len && source[index] !== '\n') index++;
      continue;
    }

    // Multi-char operators
    if (source.startsWith('::', index))  { tokens.push({ type: 'PUNCT',    value: '::',  line }); index += 2; continue; }
    if (source.startsWith('->', index))  { tokens.push({ type: 'PUNCT',    value: '->',  line }); index += 2; continue; }
    if (source.startsWith('=>', index))  { tokens.push({ type: 'PUNCT',    value: '=>',  line }); index += 2; continue; }
    if (source.startsWith('+=', index))  { tokens.push({ type: 'OPERATOR', value: '+=',  line }); index += 2; continue; }
    if (source.startsWith('-=', index))  { tokens.push({ type: 'OPERATOR', value: '-=',  line }); index += 2; continue; }
    if (source.startsWith('*=', index))  { tokens.push({ type: 'OPERATOR', value: '*=',  line }); index += 2; continue; }
    if (source.startsWith('/=', index))  { tokens.push({ type: 'OPERATOR', value: '/=',  line }); index += 2; continue; }
    if (source.startsWith('==', index))  { tokens.push({ type: 'OPERATOR', value: '==',  line }); index += 2; continue; }
    if (source.startsWith('!=', index))  { tokens.push({ type: 'OPERATOR', value: '!=',  line }); index += 2; continue; }

    // Attributes #[...]
    if (char === '#' && source[index + 1] === '[') {
      let attrLine = line;
      let startIdx = index;
      index += 2;
      let bracketCount = 1;
      while (index < len && bracketCount > 0) {
        if (source[index] === '[') bracketCount++;
        else if (source[index] === ']') bracketCount--;
        else if (source[index] === '\n') line++;
        index++;
      }
      tokens.push({ type: 'ATTRIBUTE', value: source.slice(startIdx, index), line: attrLine });
      continue;
    }

    // Identifiers / Keywords
    if (/[a-zA-Z_]/.test(char)) {
      let startIdx = index++;
      while (index < len && /[a-zA-Z0-9_]/.test(source[index])) index++;
      const value = source.slice(startIdx, index);
      const isKeyword = ['pub','struct','fn','impl','let','mut','match','if','else','for','in','return','use','mod','type','enum','const'].includes(value);
      tokens.push({ type: isKeyword ? 'KEYWORD' : 'IDENT', value, line });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      let startIdx = index++;
      while (index < len && /[0-9a-zA-Z_.]/.test(source[index])) index++;
      tokens.push({ type: 'NUMBER', value: source.slice(startIdx, index), line });
      continue;
    }

    // Operators / Punctuation
    if ('{}()[],;.:+-*/%=&|<>!'.includes(char)) {
      const type = '+-*/%&|<>!'.includes(char) ? 'OPERATOR' : 'PUNCT';
      tokens.push({ type, value: char, line });
      index++;
      continue;
    }

    // String literals
    if (char === '"') {
      let startIdx = index;
      let strLine = line;
      index++;
      let escaped = false;
      while (index < len) {
        const c = source[index];
        if (c === '\n') line++;
        if (escaped) { escaped = false; }
        else if (c === '\\') { escaped = true; }
        else if (c === '"') { index++; break; }
        index++;
      }
      tokens.push({ type: 'STRING', value: source.slice(startIdx, index), line: strLine });
      continue;
    }

    tokens.push({ type: 'OTHER', value: char, line });
    index++;
  }

  return tokens;
}

export function parseAttribute(attrStr) {
  const sanitized = attrStr.replace(/\s+/g, ' ');
  const match = sanitized.match(/^#\[([a-zA-Z0-9_]+)(?:\((.*)\))?\]$/);
  if (!match) return { name: '', args: [] };
  const name = match[1];
  const rawArgs = match[2] || '';
  const args = [];
  let currentArg = '';
  let parenCount = 0;
  let bracketCount = 0;
  for (let i = 0; i < rawArgs.length; i++) {
    const c = rawArgs[i];
    if (c === '(') parenCount++;
    else if (c === ')') parenCount--;
    else if (c === '[') bracketCount++;
    else if (c === ']') bracketCount--;
    if (c === ',' && parenCount === 0 && bracketCount === 0) {
      args.push(currentArg.trim());
      currentArg = '';
    } else {
      currentArg += c;
    }
  }
  if (currentArg.trim()) args.push(currentArg.trim());
  return { name, args };
}

export function parseSource(source) {
  const tokens = tokenize(source);
  const structs = [];
  const functions = [];
  let i = 0;
  const len = tokens.length;
  let pendingAttributes = [];

  while (i < len) {
    const token = tokens[i];

    if (token.type === 'ATTRIBUTE') { pendingAttributes.push(token); i++; continue; }

    if (token.type === 'KEYWORD' && token.value === 'struct') {
      i++;
      if (i < len && tokens[i].type === 'IDENT') {
        const structName = tokens[i].value;
        const structLine = tokens[i].line;
        i++;
        while (i < len && !(tokens[i].type === 'OPERATOR' && tokens[i].value === '<') && tokens[i].value !== '{' && tokens[i].value !== ';') i++;
        if (i < len && tokens[i].value === '<') {
          let angleCount = 1; i++;
          while (i < len && angleCount > 0) { if (tokens[i].value === '<') angleCount++; else if (tokens[i].value === '>') angleCount--; i++; }
        }
        while (i < len && tokens[i].value !== '{' && tokens[i].value !== ';') i++;
        const fields = [];
        if (i < len && tokens[i].value === '{') {
          i++;
          let braceCount = 1;
          let fieldAttrs = [];
          while (i < len && braceCount > 0) {
            const t = tokens[i];
            if (t.value === '{') { braceCount++; i++; continue; }
            if (t.value === '}') { braceCount--; i++; continue; }
            if (braceCount === 1) {
              if (t.type === 'ATTRIBUTE') { fieldAttrs.push(t); i++; continue; }
              if (t.type === 'KEYWORD' && t.value === 'pub') { i++; continue; }
              if (t.type === 'IDENT') {
                const fieldName = t.value;
                const fieldLine = t.line;
                i++;
                if (i < len && tokens[i].value === ':') {
                  i++;
                  let typeStr = '';
                  let typeBraceCount = 0;
                  while (i < len && (typeBraceCount > 0 || (tokens[i].value !== ',' && tokens[i].value !== '}' && tokens[i].type !== 'ATTRIBUTE'))) {
                    const typeTok = tokens[i];
                    if (typeTok.value === '<' || typeTok.value === '(') typeBraceCount++;
                    if (typeTok.value === '>' || typeTok.value === ')') typeBraceCount--;
                    typeStr += (typeStr ? ' ' : '') + typeTok.value;
                    i++;
                  }
                  fields.push({ name: fieldName, type: typeStr.replace(/\s+/g, ' '), line: fieldLine, attributes: fieldAttrs });
                  fieldAttrs = [];
                }
                if (i < len && tokens[i].value === ',') i++;
                continue;
              }
            }
            i++;
          }
        }
        structs.push({ name: structName, line: structLine, attributes: pendingAttributes, fields });
      }
      pendingAttributes = [];
      continue;
    }

    if (token.type === 'KEYWORD' && token.value === 'fn') {
      i++;
      if (i < len && tokens[i].type === 'IDENT') {
        const fnName = tokens[i].value;
        const fnLine = tokens[i].line;
        i++;
        while (i < len && tokens[i].value !== '(') i++;
        const params = [];
        if (i < len && tokens[i].value === '(') {
          i++;
          let parenCount = 1;
          let paramName = '';
          let paramType = '';
          let inType = false;
          while (i < len && parenCount > 0) {
            const t = tokens[i];
            if (t.value === '(') parenCount++;
            else if (t.value === ')') parenCount--;
            if (parenCount > 0) {
              if (t.value === ':') { inType = true; }
              else if (t.value === ',') { if (paramName && paramType) params.push({ name: paramName.trim(), type: paramType.trim() }); paramName = ''; paramType = ''; inType = false; }
              else { if (!inType) paramName += (paramName ? ' ' : '') + t.value; else paramType += (paramType ? ' ' : '') + t.value; }
            }
            i++;
          }
          if (paramName && paramType) params.push({ name: paramName.trim(), type: paramType.trim() });
        }
        while (i < len && tokens[i].value !== '{' && tokens[i].value !== ';') i++;
        const bodyTokens = [];
        let rawBody = '';
        if (i < len && tokens[i].value === '{') {
          let braceCount = 1;
          bodyTokens.push(tokens[i]);
          i++;
          while (i < len && braceCount > 0) {
            const t = tokens[i];
            if (t.value === '{') braceCount++;
            else if (t.value === '}') braceCount--;
            bodyTokens.push(t);
            i++;
          }
          rawBody = bodyTokens.map(t => t.value).join(' ');
        } else if (i < len && tokens[i].value === ';') { i++; }
        functions.push({ name: fnName, line: fnLine, attributes: pendingAttributes, params, bodyTokens, rawBody });
      }
      pendingAttributes = [];
      continue;
    }

    const isModifier = ['pub','impl','unsafe','async','const'].includes(token.value);
    if (token.type !== 'ATTRIBUTE' && !isModifier) pendingAttributes = [];
    i++;
  }

  return { structs, functions, tokens };
}
