import React from 'react';
import { Text } from 'react-native';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Formats a stored 'YYYY-MM-DD' string as "22 May 2026" — parsed manually (not via Date)
// so it can't shift a day depending on the device's timezone.
export function formatAnnouncementDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

// Malay fields are optional on each announcement — fall back to English when blank,
// matching the fallback convention useLanguage()'s t() already uses.
export function localizeAnnouncement(announcement, locale) {
  if (locale === 'bm' && announcement.titleBm && announcement.bodyBm) {
    return { title: announcement.titleBm, body: announcement.bodyBm };
  }
  return { title: announcement.titleEn, body: announcement.bodyEn };
}

// The admin editor (admin.js's RichTextEditor) is a real WYSIWYG surface — a contentEditable
// div on web, a WebView-hosted one on native — so admins see formatting rendered live instead
// of markup characters. What it saves is the resulting HTML, but only ever the shapes the
// toolbar's execCommand calls (and the manual Range-API size wrapper) can produce: <b>/<strong>,
// <i>/<em>, <u>, <br>, <ul>/<ol>/<li> for lists, a color wrapper — browsers are inconsistent
// about exactly which one foreColor produces (Chrome here emits legacy <font color="...">, not
// the <span style="color:..."> that execCommand('styleWithCSS', ..., true) is meant to force),
// so both are accepted — and <span style="font-size: Npx"> for text size (a literal size the
// admin typed, not one relative to whatever base size the surrounding page happens to use).
// This turns that HTML back into styled Text spans for display. Any other tag (e.g. from a
// paste) is stripped down to its plain text — never rendered as HTML, so there's no injection
// surface here.
function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'");
}

const SIMPLE_TAG_RE = /^<\/?(b|strong|i|em|u|br|ul|ol|li)\b/i;
const SPAN_OPEN_RE = /^<span\s+style="([^"]*)"\s*>$/i;
const FONT_COLOR_OPEN_RE = /^<font\s+color="([^"]+)"\s*>$/i;
// href is never admin-typed HTML - only ever set by directly editing the
// database (the toolbar has no link button yet) - so this only needs to
// accept a plain quoted attribute value, not worry about escaping.
const A_OPEN_RE = /^<a\s+href="[^"]*"\s*>$/i;
const WRAP_CLOSE_RE = /^<\/(?:span|font|a)>$/i;

// Decides per-tag whether to keep or drop it, rather than one regex trying to describe every
// allowed shape (including the two tags — span, font — that carry an attribute) via lookaheads.
function stripDisallowedTags(html) {
  return html.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => (
    SIMPLE_TAG_RE.test(tag) || SPAN_OPEN_RE.test(tag) || FONT_COLOR_OPEN_RE.test(tag) || A_OPEN_RE.test(tag) || WRAP_CLOSE_RE.test(tag) ? tag : ''
  ));
}

const TOKEN_RE = /<(\/?)(b|strong|i|em|u|br|ul|ol|li)\s*\/?>|<span\s+style="([^"]*)"\s*>|<font\s+color="([^"]+)"\s*>|<a\s+href="([^"]*)"\s*>|<\/(?:span|font|a)>/gi;

// `onLinkPress(href)` is called when a rendered <a href="..."> segment is
// tapped - the caller decides how to navigate (in-app route vs external
// URL), since this file has no framework navigation dependency of its own.
// Without it, <a> tags still render (as plain text, tag stripped) rather
// than crashing - matches every other existing caller that doesn't need
// links (HeroSlideshow, the admin Hero Slides preview).
export function renderRichText(html, style, { onLinkPress, linkColor } = {}) {
  if (!html) return null;
  const cleaned = stripDisallowedTags(html);
  const nodes = [];
  let boldDepth = 0;
  let italicDepth = 0;
  let underlineDepth = 0;
  let buffer = '';
  let lastIndex = 0;
  let key = 0;
  let match;
  const listStack = [];
  const colorStack = [];
  const sizeStack = [];
  const linkStack = [];
  // Tracks exactly what each open <span>/<font>/<a> pushed, so its matching close pops only
  // that — a span can carry color, size, both, a font always just color, and an <a> a link href.
  const openStack = [];

  const flush = () => {
    if (!buffer) return;
    const spanStyle = [style];
    if (boldDepth > 0) spanStyle.push({ fontWeight: 'bold' });
    if (italicDepth > 0) spanStyle.push({ fontStyle: 'italic' });
    if (underlineDepth > 0) spanStyle.push({ textDecorationLine: 'underline' });
    if (colorStack.length > 0) spanStyle.push({ color: colorStack[colorStack.length - 1] });
    if (sizeStack.length > 0) spanStyle.push({ fontSize: sizeStack[sizeStack.length - 1] });
    const href = linkStack[linkStack.length - 1];
    const extraProps = {};
    if (href && onLinkPress) {
      spanStyle.push({ textDecorationLine: 'underline' }, linkColor ? { color: linkColor } : null);
      extraProps.onPress = () => onLinkPress(href);
    }
    nodes.push(<Text key={key++} style={spanStyle} {...extraProps}>{decodeEntities(buffer)}</Text>);
    buffer = '';
  };

  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(cleaned)) !== null) {
    buffer += cleaned.slice(lastIndex, match.index);
    lastIndex = TOKEN_RE.lastIndex;

    if (match[2]) {
      const closing = match[1] === '/';
      const tag = match[2].toLowerCase();
      if (tag === 'br') {
        buffer += '\n';
      } else if (tag === 'b' || tag === 'strong') {
        flush();
        boldDepth = Math.max(0, boldDepth + (closing ? -1 : 1));
      } else if (tag === 'i' || tag === 'em') {
        flush();
        italicDepth = Math.max(0, italicDepth + (closing ? -1 : 1));
      } else if (tag === 'u') {
        flush();
        underlineDepth = Math.max(0, underlineDepth + (closing ? -1 : 1));
      } else if (tag === 'ul' || tag === 'ol') {
        if (!closing) {
          listStack.push({ type: tag, counter: 0 });
        } else {
          listStack.pop();
          if (buffer) buffer += '\n';
        }
      } else if (tag === 'li' && !closing) {
        if (buffer || nodes.length > 0) buffer += '\n';
        const top = listStack[listStack.length - 1];
        if (top && top.type === 'ol') {
          top.counter += 1;
          buffer += `${top.counter}. `;
        } else {
          buffer += '• ';
        }
      }
    } else if (match[3] !== undefined) {
      flush();
      const styleAttr = match[3];
      const colorM = /color:\s*([^;]+)/i.exec(styleAttr);
      const sizeM = /font-size:\s*([\d.]+)px/i.exec(styleAttr);
      const frame = {};
      if (colorM) { colorStack.push(colorM[1].trim()); frame.color = true; }
      if (sizeM) { sizeStack.push(parseFloat(sizeM[1])); frame.size = true; }
      openStack.push(frame);
    } else if (match[4] !== undefined) {
      flush();
      colorStack.push(match[4].trim());
      openStack.push({ color: true });
    } else if (match[5] !== undefined) {
      flush();
      linkStack.push(match[5]);
      openStack.push({ link: true });
    } else {
      flush();
      const frame = openStack.pop();
      if (frame) {
        if (frame.color) colorStack.pop();
        if (frame.size) sizeStack.pop();
        if (frame.link) linkStack.pop();
      }
    }
  }
  buffer += cleaned.slice(lastIndex);
  flush();
  return nodes;
}
