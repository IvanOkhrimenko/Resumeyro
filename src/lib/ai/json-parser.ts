/**
 * Robust JSON parser for LLM responses
 * Handles common issues like trailing commas, markdown blocks, etc.
 */

export interface ParseResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  rawResponse?: string;
}

/**
 * Sanitize and parse JSON from LLM response
 * Handles various edge cases that different models produce
 */
export function parseJSONFromLLM<T = unknown>(text: string): ParseResult<T> {
  if (!text || typeof text !== 'string') {
    return { success: false, data: null, error: 'Empty or invalid input' };
  }

  const originalText = text;

  // Step 1: Extract JSON from markdown code blocks
  let jsonStr = extractFromCodeBlock(text);

  // Step 2: If no code block, try to find JSON object/array directly
  if (!jsonStr) {
    jsonStr = extractJSONObject(text);
  }

  if (!jsonStr) {
    console.error('[JSON Parser] No JSON found in response. First 500 chars:', text.substring(0, 500));
    return {
      success: false,
      data: null,
      error: 'No JSON found in response',
      rawResponse: originalText.substring(0, 1000)
    };
  }

  // Step 3: Try parsing as-is first
  try {
    const parsed = JSON.parse(jsonStr) as T;
    return { success: true, data: parsed };
  } catch (firstError) {
    // Continue to sanitization
  }

  // Step 4: Apply sanitization and try again
  const sanitized = sanitizeJSON(jsonStr);

  try {
    const parsed = JSON.parse(sanitized) as T;
    console.log('[JSON Parser] Parsed successfully after sanitization');
    return { success: true, data: parsed };
  } catch (secondError) {
    // Step 5: Try more aggressive fixes
    const aggressivelySanitized = aggressiveSanitize(sanitized);

    try {
      const parsed = JSON.parse(aggressivelySanitized) as T;
      console.log('[JSON Parser] Parsed successfully after aggressive sanitization');
      return { success: true, data: parsed };
    } catch (aggressiveError) {
      // Step 6: Try to repair truncated JSON (common with token limits)
      const repaired = repairTruncatedJSON(aggressivelySanitized);

      try {
        const parsed = JSON.parse(repaired) as T;
        console.log('[JSON Parser] Parsed successfully after truncation repair');
        return { success: true, data: parsed };
      } catch (finalError) {
        const errorMessage = finalError instanceof Error ? finalError.message : 'Unknown error';
        console.error('[JSON Parser] Failed to parse JSON after all attempts:', errorMessage);
        console.error('[JSON Parser] Sanitized JSON (first 1000 chars):', repaired.substring(0, 1000));

        // Try to identify the problematic area
        const position = extractErrorPosition(errorMessage);
        if (position !== null && position < repaired.length) {
          const contextStart = Math.max(0, position - 50);
          const contextEnd = Math.min(repaired.length, position + 50);
          console.error('[JSON Parser] Error context around position', position, ':');
          console.error(repaired.substring(contextStart, contextEnd));
        }

        return {
          success: false,
          data: null,
          error: `JSON parse error: ${errorMessage}`,
          rawResponse: originalText.substring(0, 2000)
        };
      }
    }
  }
}

/**
 * Extract JSON from markdown code block
 */
function extractFromCodeBlock(text: string): string | null {
  // Try ```json ... ``` first
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Try ``` ... ``` (generic code block)
  const genericBlockMatch = text.match(/```\s*([\s\S]*?)```/);
  if (genericBlockMatch) {
    const content = genericBlockMatch[1].trim();
    // Check if it looks like JSON
    if (content.startsWith('{') || content.startsWith('[')) {
      return content;
    }
  }

  return null;
}

/**
 * Extract JSON object or array from text
 */
function extractJSONObject(text: string): string | null {
  // Find the first { or [ and match to its closing bracket
  const startObj = text.indexOf('{');
  const startArr = text.indexOf('[');

  let start: number;
  let openChar: string;
  let closeChar: string;

  if (startObj === -1 && startArr === -1) {
    return null;
  } else if (startObj === -1) {
    start = startArr;
    openChar = '[';
    closeChar = ']';
  } else if (startArr === -1) {
    start = startObj;
    openChar = '{';
    closeChar = '}';
  } else {
    // Both exist, take the first one
    if (startObj < startArr) {
      start = startObj;
      openChar = '{';
      closeChar = '}';
    } else {
      start = startArr;
      openChar = '[';
      closeChar = ']';
    }
  }

  // Count brackets to find matching close
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar || char === '{' || char === '[') {
        depth++;
      } else if (char === closeChar || char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          return text.substring(start, i + 1);
        }
      }
    }
  }

  // If we didn't find a complete match, return from start to end
  // (might be truncated but let's try)
  return text.substring(start);
}

/**
 * Sanitize common JSON issues from LLMs
 */
function sanitizeJSON(json: string): string {
  let result = json;

  // Remove BOM and other invisible characters at the start
  result = result.replace(/^\uFEFF/, '');

  // Remove trailing commas before ] or }
  // This regex handles nested structures
  result = result.replace(/,(\s*[}\]])/g, '$1');

  // Fix common issues with newlines in strings (should be \n not actual newline)
  // This is tricky - we need to be careful not to break valid JSON

  // Remove any text after the last } or ]
  const lastBrace = Math.max(result.lastIndexOf('}'), result.lastIndexOf(']'));
  if (lastBrace !== -1 && lastBrace < result.length - 1) {
    const afterBrace = result.substring(lastBrace + 1).trim();
    if (afterBrace && !afterBrace.startsWith(',') && !afterBrace.startsWith('}') && !afterBrace.startsWith(']')) {
      result = result.substring(0, lastBrace + 1);
    }
  }

  return result;
}

/**
 * More aggressive sanitization for stubborn cases
 */
function aggressiveSanitize(json: string): string {
  let result = json;

  // Replace single quotes with double quotes (but not inside strings)
  // This is risky but sometimes necessary for certain models
  result = fixQuotes(result);

  // Fix unescaped control characters in strings
  result = fixControlCharacters(result);

  // Remove JavaScript-style comments
  result = removeComments(result);

  // Fix multiple consecutive commas
  result = result.replace(/,\s*,/g, ',');

  // Another pass at trailing commas (more aggressive)
  result = result.replace(/,(\s*[}\]])/g, '$1');

  // Fix missing commas between elements (common LLM mistake)
  // e.g., "value1" "value2" -> "value1", "value2"
  result = result.replace(/("|\d|true|false|null)\s+"/g, '$1, "');

  return result;
}

/**
 * Fix single quotes to double quotes (carefully)
 */
function fixQuotes(json: string): string {
  // Only fix if the JSON doesn't parse and has single quotes
  if (!json.includes("'")) return json;

  // Simple approach: replace ' with " only for keys/values pattern
  // This won't catch all cases but handles common ones
  let result = json;

  // Replace 'key': with "key":
  result = result.replace(/'([^']+)'(\s*:)/g, '"$1"$2');

  // Replace : 'value' with : "value" (for simple values)
  result = result.replace(/:\s*'([^']*?)'/g, ': "$1"');

  return result;
}

/**
 * Fix unescaped control characters in JSON strings
 */
function fixControlCharacters(json: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const code = char.charCodeAt(0);

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      // Escape control characters that should be escaped
      if (code < 32) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          // Other control chars - escape as unicode
          result += '\\u' + code.toString(16).padStart(4, '0');
        }
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Remove JavaScript-style comments from JSON
 */
function removeComments(json: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;
  let i = 0;

  while (i < json.length) {
    const char = json[i];
    const nextChar = json[i + 1];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      i++;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escapeNext = true;
      i++;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    if (!inString) {
      // Check for // comment
      if (char === '/' && nextChar === '/') {
        // Skip until end of line
        while (i < json.length && json[i] !== '\n') {
          i++;
        }
        continue;
      }
      // Check for /* */ comment
      if (char === '/' && nextChar === '*') {
        i += 2;
        while (i < json.length - 1 && !(json[i] === '*' && json[i + 1] === '/')) {
          i++;
        }
        i += 2; // Skip */
        continue;
      }
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Extract position number from JSON parse error message
 */
function extractErrorPosition(errorMessage: string): number | null {
  const match = errorMessage.match(/position\s+(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Repair truncated JSON by closing open structures
 * This handles cases where LLM runs out of tokens mid-response
 */
function repairTruncatedJSON(json: string): string {
  let result = json.trim();

  // Track open structures
  const stack: string[] = [];
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < result.length; i++) {
    const char = result[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        stack.push('}');
      } else if (char === '[') {
        stack.push(']');
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  // If we ended inside a string, close it
  if (inString) {
    // Find where to truncate - look for the last reasonable break point
    // Try to find last complete key-value or array element
    const lastCompleteComma = result.lastIndexOf(',');
    const lastCompleteColon = result.lastIndexOf(':');

    // If the last colon is after the last comma, we're mid-value
    if (lastCompleteColon > lastCompleteComma) {
      // Truncate to before this key-value pair
      const lastCommaBeforeColon = result.lastIndexOf(',', lastCompleteColon);
      if (lastCommaBeforeColon > 0) {
        result = result.substring(0, lastCommaBeforeColon);
      }
    } else if (lastCompleteComma > 0) {
      // Truncate at the last comma
      result = result.substring(0, lastCompleteComma);
    }

    // Recalculate stack after truncation
    stack.length = 0;
    inString = false;
    escapeNext = false;

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          stack.push('}');
        } else if (char === '[') {
          stack.push(']');
        } else if (char === '}' || char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === char) {
            stack.pop();
          }
        }
      }
    }
  }

  // Remove trailing incomplete elements
  // e.g., trailing commas, incomplete key names
  result = result.replace(/,\s*$/, '');
  result = result.replace(/,\s*"[^"]*$/, ''); // Incomplete key at end
  result = result.replace(/:\s*$/, ''); // Dangling colon
  result = result.replace(/:\s*"[^"]*$/, ''); // Incomplete string value

  // Close all open structures
  while (stack.length > 0) {
    result += stack.pop();
  }

  console.log(`[JSON Parser] Repaired truncated JSON, added ${json.length - result.length < 0 ? result.length - json.length : 0} closing chars`);

  return result;
}
