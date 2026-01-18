import { resolvePath } from './dataPaths.js';

export function extractPlaceholders(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    placeholders.push(match[1].trim());
  }
  return [...new Set(placeholders)];
}

export function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = resolvePath(data, path.trim());
    if (value === undefined || value === null) {
      return match;
    }
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  });
}
