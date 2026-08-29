import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, TextInput, View, Image, Platform, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { PageScroll, Card, Field, useFormStyles, DeleteConfirm } from '../lib/formPrimitives';
import { AnimatedPressable } from '../lib/animations';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatAnnouncementDate, renderRichText } from '../lib/announcements';
import { CHARGE_CODE_ORDER } from '../lib/pricing';

const TABS = ['Holidays', 'Announcements', 'Slides', 'Vacancies', 'Pricing'];

function rowStyle(colors) {
  return { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border };
}

// Storage/comparison stays 'YYYY-MM-DD' (what IsoDateField produces and what availability.js
// expects) — this only reformats it for display in the holidays list.
function formatIsoDateDMY(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function IsoDateField({ value, onChange, formStyles }) {
  const [show, setShow] = useState(false);
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value || ''}
        style={formStyles.webDatePicker}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <>
      <AnimatedPressable scaleTo={1.04} style={formStyles.datePickerButton} onPress={() => setShow(true)}>
        <Text style={formStyles.datePickerButtonText}>{value ? `📅 ${value}` : 'Select date'}</Text>
      </AnimatedPressable>
      {show && (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) {
              const y = selectedDate.getFullYear();
              const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const d = String(selectedDate.getDate()).padStart(2, '0');
              onChange(`${y}-${m}-${d}`);
            }
          }}
        />
      )}
    </>
  );
}

function ToolbarButton({ icon, onPress, colors, active, label }) {
  return (
    <AnimatedPressable
      scaleTo={1.12}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={{
        width: 34,
        height: 34,
        borderRadius: 6,
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.primary : colors.subtleBackground,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <MaterialIcons name={icon} size={18} color={active ? '#fff' : colors.textPrimary} />
    </AnimatedPressable>
  );
}

// The full toolbar: bold/italic/underline plus bullet & numbered lists — all standard
// execCommand's, so both hosts (real DOM on web, WebView DOM on native) support them without
// any extra library. renderRichText() (lib/announcements.js) knows how to turn exactly these
// back into styled Text — b/strong, i/em, u, br, ul/ol/li.
const RICH_TOOLBAR = [
  { cmd: 'bold', icon: 'format-bold', label: 'Bold' },
  { cmd: 'italic', icon: 'format-italic', label: 'Italic' },
  { cmd: 'underline', icon: 'format-underlined', label: 'Underline' },
  { cmd: 'insertUnorderedList', icon: 'format-list-bulleted', label: 'Bullet list' },
  { cmd: 'insertOrderedList', icon: 'format-list-numbered', label: 'Numbered list' },
];

// A small curated palette rather than an open-ended picker — announcements render as dark text
// on a light card, slides render as white text over a photo/color background, so a color needs
// to survive both contexts reasonably rather than being picked freehand.
const TEXT_COLORS = [
  { hex: '#DC2626', label: 'Red' },
  { hex: '#D97706', label: 'Amber' },
  { hex: '#16A34A', label: 'Green' },
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#7C3AED', label: 'Purple' },
  { hex: '#111827', label: 'Black' },
  { hex: '#FFFFFF', label: 'White' },
];

function ColorSwatch({ hex, label, onPress }) {
  return (
    <AnimatedPressable
      scaleTo={1.12}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: hex, marginRight: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' }}
    />
  );
}

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 96;

function SizeInputRow({ value, onChangeText, onApply, colors }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'center' }}>
      <TextInput
        style={{
          width: 64, height: 34, borderWidth: 1, borderColor: colors.border, borderRadius: 6,
          paddingHorizontal: 10, marginRight: 8, fontSize: 13, color: colors.textPrimary, backgroundColor: colors.inputBackground,
        }}
        keyboardType="numeric"
        placeholder="px"
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={(v) => onChangeText(v.replace(/[^0-9]/g, ''))}
        onSubmitEditing={onApply}
      />
      <Text style={{ fontSize: 11, color: colors.textMuted, marginRight: 8 }}>{MIN_FONT_SIZE}–{MAX_FONT_SIZE}px</Text>
      <AnimatedPressable
        scaleTo={1.03}
        onPress={onApply}
        style={{ paddingHorizontal: 14, height: 34, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Apply</Text>
      </AnimatedPressable>
    </View>
  );
}

// execCommand has no CSS-based font-size command (its legacy 'fontSize' only offers 7 fixed
// legacy sizes via <font size="N">) — so size wraps the selection in a span manually via the
// Selection/Range API instead. Mirrors bold/italic's "no selection → insert placeholder text,
// selected, ready to type over" behavior for consistency. Takes a literal px value — an admin
// typing "24" gets exactly 24px wherever it renders, not a size relative to that context.
//
// Unlike execCommand, window.getSelection() does NOT survive the div losing focus to the
// toggle/Apply buttons — browsers restore an editable's last selection for execCommand calls
// but not for manual Range API use, so a fresh query here would land at whatever default the
// browser reset to (often the very start), not where the admin was actually typing. The caller
// captures the real selection on blur (see WebRichEditor's onBlur) and passes it in.
function applyFontSize(root, px, savedRange) {
  root.focus();
  let range = savedRange;
  if (!range) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    range = sel.getRangeAt(0);
  }
  if (!root.contains(range.commonAncestorContainer)) return;
  const span = document.createElement('span');
  span.style.fontSize = px + 'px';
  if (range.collapsed) {
    span.textContent = 'text';
    range.insertNode(span);
  } else {
    span.appendChild(range.extractContents());
    range.insertNode(span);
  }
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(newRange);
}

// A true WYSIWYG surface (contentEditable) rather than a plain TextInput with visible
// **markdown** markers — the admin sees formatting rendered live as they type. It saves real
// HTML, but only ever the tags the toolbar's execCommand calls produce; renderRichText() strips
// anything else back to plain text on display, so there's no injection surface even if
// something else gets pasted in.
//
// contentEditable is inherently uncontrolled — fighting it with a value-controlled re-render
// on every keystroke makes the cursor jump. Content is written in once (on mount / WebView
// load) and never pushed back down; the parent forces a remount via `key` when switching to a
// different record (see e.g. AnnouncementsTab's `key={editingId || 'new'}`).
function WebRichEditor({ value, onChange, colors, minHeight = 110 }) {
  const divRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [sizeInput, setSizeInput] = useState('');

  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerHTML = value || '';
    }
    try {
      document.execCommand('defaultParagraphSeparator', false, 'br');
    } catch (e) {}
  }, []);

  // Captured on blur so applySize() has something usable once focus has moved to the toggle/
  // Apply buttons — see applyFontSize()'s comment for why a fresh window.getSelection() there
  // can't be trusted.
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (divRef.current && divRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  const exec = (cmd, val) => {
    divRef.current?.focus();
    if (cmd === 'foreColor') {
      // styleWithCSS only toggled around this one call — leaving it on would make bold/italic/
      // underline switch from <b>/<i>/<u> to inline styles too, which renderRichText() doesn't parse.
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(cmd, false, val);
      document.execCommand('styleWithCSS', false, false);
    } else {
      document.execCommand(cmd);
    }
    onChange(divRef.current.innerHTML);
  };

  const applySize = () => {
    const px = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parseInt(sizeInput, 10) || 0));
    if (!px) return;
    applyFontSize(divRef.current, px, savedRangeRef.current);
    onChange(divRef.current.innerHTML);
    setSizeInput('');
    setShowSizes(false);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' }}>
        {RICH_TOOLBAR.map((b) => (
          <ToolbarButton key={b.cmd} icon={b.icon} colors={colors} onPress={() => exec(b.cmd)} label={b.label} />
        ))}
        <ToolbarButton icon="format-color-text" colors={colors} active={showColors} onPress={() => setShowColors((s) => !s)} label="Text color" />
        <ToolbarButton icon="format-size" colors={colors} active={showSizes} onPress={() => setShowSizes((s) => !s)} label="Text size" />
      </View>
      {showColors && (
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {TEXT_COLORS.map((c) => (
            <ColorSwatch key={c.hex} hex={c.hex} label={c.label} onPress={() => { exec('foreColor', c.hex); setShowColors(false); }} />
          ))}
        </View>
      )}
      {showSizes && (
        <SizeInputRow value={sizeInput} onChangeText={setSizeInput} onApply={applySize} colors={colors} />
      )}
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onBlur={saveSelection}
        style={{
          minHeight,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: 12,
          fontSize: 14,
          fontFamily: 'inherit',
          color: colors.textPrimary,
          backgroundColor: colors.inputBackground,
          outline: 'none',
          overflowY: 'auto',
        }}
      />
    </View>
  );
}

const NATIVE_EDITOR_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  #editor { font-family: -apple-system, Roboto, sans-serif; font-size: 15px; line-height: 1.5; padding: 12px; min-height: 100px; outline: none; box-sizing: border-box; }
  b, strong { font-weight: 700; }
  i, em { font-style: italic; }
  u { text-decoration: underline; }
  ul, ol { margin: 4px 0; padding-left: 22px; }
</style>
</head><body>
<div id="editor" contenteditable="true"></div>
<script>
  document.execCommand('defaultParagraphSeparator', false, 'br');
  var editor = document.getElementById('editor');
  var lastRange = null;
  function post() { window.ReactNativeWebView.postMessage(editor.innerHTML); }
  function saveSelection() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      var r = sel.getRangeAt(0);
      if (editor.contains(r.commonAncestorContainer)) lastRange = r.cloneRange();
    }
  }
  editor.addEventListener('input', post);
  editor.addEventListener('blur', function() { saveSelection(); post(); });
  window.__applyFontSize = function(px) {
    editor.focus();
    var sel = window.getSelection();
    var range = null;
    if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else {
      range = lastRange;
    }
    if (!range) return;
    var span = document.createElement('span');
    span.style.fontSize = px + 'px';
    if (range.collapsed) {
      span.textContent = 'text';
      range.insertNode(span);
    } else {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    var newRange = document.createRange();
    newRange.selectNodeContents(span);
    var sel2 = window.getSelection();
    sel2.removeAllRanges();
    sel2.addRange(newRange);
    post();
  };
</script>
</body></html>`;

function NativeRichEditor({ value, onChange, colors, height = 140 }) {
  const webviewRef = useRef(null);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [sizeInput, setSizeInput] = useState('');

  const exec = (cmd, val) => {
    const js = cmd === 'foreColor'
      // Same surgical styleWithCSS toggle as the web editor — only this call gets CSS-based
      // output, so bold/italic/underline keep producing plain <b>/<i>/<u> tags.
      ? `document.execCommand('styleWithCSS', false, true); document.execCommand('foreColor', false, ${JSON.stringify(val)}); document.execCommand('styleWithCSS', false, false); document.getElementById('editor').dispatchEvent(new Event('input')); true;`
      : `document.execCommand('${cmd}'); document.getElementById('editor').dispatchEvent(new Event('input')); true;`;
    webviewRef.current?.injectJavaScript(js);
  };

  const applySize = () => {
    const px = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parseInt(sizeInput, 10) || 0));
    if (!px) return;
    webviewRef.current?.injectJavaScript(`window.__applyFontSize(${px}); true;`);
    setSizeInput('');
    setShowSizes(false);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' }}>
        {RICH_TOOLBAR.map((b) => (
          <ToolbarButton key={b.cmd} icon={b.icon} colors={colors} onPress={() => exec(b.cmd)} label={b.label} />
        ))}
        <ToolbarButton icon="format-color-text" colors={colors} active={showColors} onPress={() => setShowColors((s) => !s)} label="Text color" />
        <ToolbarButton icon="format-size" colors={colors} active={showSizes} onPress={() => setShowSizes((s) => !s)} label="Text size" />
      </View>
      {showColors && (
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {TEXT_COLORS.map((c) => (
            <ColorSwatch key={c.hex} hex={c.hex} label={c.label} onPress={() => { exec('foreColor', c.hex); setShowColors(false); }} />
          ))}
        </View>
      )}
      {showSizes && (
        <SizeInputRow value={sizeInput} onChangeText={setSizeInput} onApply={applySize} colors={colors} />
      )}
      <View style={{ height, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: NATIVE_EDITOR_HTML }}
          onLoadEnd={() => {
            const escaped = JSON.stringify(value || '');
            webviewRef.current?.injectJavaScript(`document.getElementById('editor').innerHTML = ${escaped}; true;`);
          }}
          onMessage={(e) => onChange(e.nativeEvent.data)}
          style={{ backgroundColor: 'transparent' }}
          scrollEnabled={false}
          hideKeyboardAccessoryView
        />
      </View>
    </View>
  );
}

function RichTextEditor({ value, onChange, colors, height }) {
  return Platform.OS === 'web' ? (
    <WebRichEditor value={value} onChange={onChange} colors={colors} minHeight={height} />
  ) : (
    <NativeRichEditor value={value} onChange={onChange} colors={colors} height={height ? height + 30 : undefined} />
  );
}

const ALIGN_OPTIONS = [
  { key: 'left', icon: 'format-align-left', label: 'Align left' },
  { key: 'center', icon: 'format-align-center', label: 'Align center' },
  { key: 'right', icon: 'format-align-right', label: 'Align right' },
];

function AlignmentPicker({ value, onChange, colors }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {ALIGN_OPTIONS.map((o) => (
        <ToolbarButton key={o.key} icon={o.icon} colors={colors} active={value === o.key} onPress={() => onChange(o.key)} label={o.label} />
      ))}
    </View>
  );
}

function HolidaysTab({ formStyles, colors, authHeader }) {
  const [holidays, setHolidays] = useState([]);
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/api/holidays').then((res) => setHolidays(res.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const addHoliday = async () => {
    if (!date) { setError('Please select a date.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/api/admin/holidays', { date, label }, { headers: authHeader });
      setDate('');
      setLabel('');
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const removeHoliday = async (id) => {
    await api.delete(`/api/admin/holidays/${id}`, { headers: authHeader });
    setConfirmDeleteId(null);
    load();
  };

  return (
    <>
      <Card icon="📅" title="Add a public holiday">
        <Text style={[formStyles.bodyText, { marginBottom: 16 }]}>
          Express orders are blocked from 10:30am two days before the holiday through the end of the day before it. Immediate and Self Collect orders are blocked on the holiday itself.
        </Text>
        <Field label="Date" required>
          <IsoDateField value={date} onChange={setDate} formStyles={formStyles} />
        </Field>
        <Field label="Label" hint="Optional, e.g. 'Hari Raya Aidilfitri'">
          <TextInput style={formStyles.input} value={label} onChangeText={setLabel} placeholderTextColor={colors.textMuted} />
        </Field>
        {error ? <Text style={formStyles.fieldError}>{error}</Text> : null}
        <AnimatedPressable scaleTo={1.03} style={[formStyles.button, saving && formStyles.buttonDisabled]} onPress={addHoliday} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>Add holiday</Text>}
        </AnimatedPressable>
      </Card>

      <Card icon="🗓️" title={`Public holidays (${holidays.length})`}>
        {holidays.length === 0 ? (
          <Text style={formStyles.bodyText}>No public holidays added yet.</Text>
        ) : holidays.map((h) => (
          <View key={h._id} style={rowStyle(colors)}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{formatIsoDateDMY(h.date)}</Text>
              {h.label ? <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{h.label}</Text> : null}
            </View>
            {confirmDeleteId === h._id ? (
              <DeleteConfirm onConfirm={() => removeHoliday(h._id)} onCancel={() => setConfirmDeleteId(null)} />
            ) : (
              <AnimatedPressable scaleTo={1.12} onPress={() => setConfirmDeleteId(h._id)}>
                <Text style={{ color: colors.error, fontWeight: '600' }}>Remove</Text>
              </AnimatedPressable>
            )}
          </View>
        ))}
      </Card>
    </>
  );
}

const EMPTY_ANNOUNCEMENT = {
  titleEn: '', bodyEn: '', titleBm: '', bodyBm: '', date: '', bodyAlign: 'center',
  showOnBannerToGuests: true, showOnBannerToLoggedIn: true,
};

function visibilitySuffix(item) {
  const bannerGuestsHidden = item.showOnBannerToGuests === false;
  const bannerLoggedInHidden = item.showOnBannerToLoggedIn === false;
  if (bannerGuestsHidden && bannerLoggedInHidden) return ' (Not on top banner)';
  if (bannerGuestsHidden) return ' (Not on top banner for guests)';
  if (bannerLoggedInHidden) return ' (Not on top banner for logged-in users)';
  return '';
}

function AnnouncementsTab({ formStyles, colors, authHeader }) {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(EMPTY_ANNOUNCEMENT);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    // Admin's own endpoint (not the public /api/announcements) - returns
    // hidden announcements too, so they can still be found and re-shown.
    api.get('/api/admin/announcements', { headers: authHeader }).then((res) => setAnnouncements(res.data)).catch(() => {});
  }, [authHeader]);
  useEffect(() => { load(); }, [load]);

  const onChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      titleEn: item.titleEn,
      bodyEn: item.bodyEn,
      titleBm: item.titleBm || '',
      bodyBm: item.bodyBm || '',
      date: item.date,
      bodyAlign: item.bodyAlign || 'center',
      showOnBannerToGuests: item.showOnBannerToGuests !== false,
      showOnBannerToLoggedIn: item.showOnBannerToLoggedIn !== false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_ANNOUNCEMENT);
    setError('');
  };

  const save = async () => {
    if (!form.titleEn || !form.bodyEn || !form.date) {
      setError('English title, body, and a date are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/api/admin/announcements/${editingId}`, form, { headers: authHeader });
      } else {
        await api.post('/api/admin/announcements', form, { headers: authHeader });
      }
      cancelEdit();
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/api/admin/announcements/${id}`, { headers: authHeader });
    setConfirmDeleteId(null);
    load();
  };

  return (
    <>
      <Card icon="📢" title={editingId ? 'Edit announcement' : 'Add an announcement'}>
        <Field label="Date" required>
          <IsoDateField value={form.date} onChange={(v) => onChange('date', v)} formStyles={formStyles} />
        </Field>
        <Field label="Title (English)" required>
          <TextInput style={formStyles.input} value={form.titleEn} onChangeText={(v) => onChange('titleEn', v)} placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Body (English)" required hint="Select text, then tap a toolbar button to format">
          <RichTextEditor key={`en-${editingId || 'new'}`} value={form.bodyEn} onChange={(v) => onChange('bodyEn', v)} colors={colors} />
        </Field>
        <Field label="Title (Malay)" hint="Optional — falls back to the English title when blank">
          <TextInput style={formStyles.input} value={form.titleBm} onChangeText={(v) => onChange('titleBm', v)} placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Body (Malay)" hint="Optional — falls back to the English body when blank">
          <RichTextEditor key={`bm-${editingId || 'new'}`} value={form.bodyBm} onChange={(v) => onChange('bodyBm', v)} colors={colors} />
        </Field>
        <Field label="Body alignment" hint="Applies to both language versions when displayed">
          <AlignmentPicker value={form.bodyAlign} onChange={(v) => onChange('bodyAlign', v)} colors={colors} />
        </Field>
        <Field label="Top notification bar (guests)" hint="This announcement still always appears on the Latest Updates page either way">
          <View style={formStyles.toggleRow}>
            <AnimatedPressable scaleTo={1.04} style={[formStyles.toggleBtn, form.showOnBannerToGuests && formStyles.toggleBtnActive]} onPress={() => onChange('showOnBannerToGuests', true)}>
              <Text style={form.showOnBannerToGuests ? formStyles.toggleTextActive : formStyles.toggleText}>Shown</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleTo={1.04} style={[formStyles.toggleBtn, !form.showOnBannerToGuests && formStyles.toggleBtnActive]} onPress={() => onChange('showOnBannerToGuests', false)}>
              <Text style={!form.showOnBannerToGuests ? formStyles.toggleTextActive : formStyles.toggleText}>Hidden</Text>
            </AnimatedPressable>
          </View>
        </Field>
        <Field label="Top notification bar (logged-in users)" hint="This announcement still always appears on the Latest Updates page either way">
          <View style={formStyles.toggleRow}>
            <AnimatedPressable scaleTo={1.04} style={[formStyles.toggleBtn, form.showOnBannerToLoggedIn && formStyles.toggleBtnActive]} onPress={() => onChange('showOnBannerToLoggedIn', true)}>
              <Text style={form.showOnBannerToLoggedIn ? formStyles.toggleTextActive : formStyles.toggleText}>Shown</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleTo={1.04} style={[formStyles.toggleBtn, !form.showOnBannerToLoggedIn && formStyles.toggleBtnActive]} onPress={() => onChange('showOnBannerToLoggedIn', false)}>
              <Text style={!form.showOnBannerToLoggedIn ? formStyles.toggleTextActive : formStyles.toggleText}>Hidden</Text>
            </AnimatedPressable>
          </View>
        </Field>
        {error ? <Text style={formStyles.fieldError}>{error}</Text> : null}
        <View style={{ flexDirection: 'row' }}>
          <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { flex: 1 }, saving && formStyles.buttonDisabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{editingId ? 'Save changes' : 'Add announcement'}</Text>}
          </AnimatedPressable>
          {editingId ? (
            <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { flex: 1, marginLeft: 8, backgroundColor: '#eee' }]} onPress={cancelEdit}>
              <Text style={[formStyles.buttonText, { color: formStyles.subtitle.color }]}>Cancel</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </Card>

      <Card icon="🗞️" title={`Announcements (${announcements.length})`}>
        {announcements.length === 0 ? (
          <Text style={formStyles.bodyText}>No announcements yet.</Text>
        ) : announcements.map((item) => (
          <View key={item._id} style={rowStyle(colors)}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>{formatAnnouncementDate(item.date)}</Text>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{item.titleEn}{visibilitySuffix(item)}</Text>
              {item.titleBm ? <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{item.titleBm}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AnimatedPressable scaleTo={1.12} onPress={() => startEdit(item)} style={{ marginBottom: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Edit</Text>
              </AnimatedPressable>
              {confirmDeleteId === item._id ? (
                <DeleteConfirm onConfirm={() => remove(item._id)} onCancel={() => setConfirmDeleteId(null)} />
              ) : (
                <AnimatedPressable scaleTo={1.12} onPress={() => setConfirmDeleteId(item._id)}>
                  <Text style={{ color: colors.error, fontWeight: '600' }}>Remove</Text>
                </AnimatedPressable>
              )}
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

const EMPTY_SLIDE = { image: '', headline: '', subtext: '', linkUrl: '', order: '0' };

function SlidesTab({ formStyles, colors, authHeader }) {
  const [slides, setSlides] = useState([]);
  const [form, setForm] = useState(EMPTY_SLIDE);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/api/slides').then((res) => setSlides(res.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const onChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      onChange('image', `data:${mime};base64,${asset.base64}`);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({ image: item.image || '', headline: item.headline || '', subtext: item.subtext || '', linkUrl: item.linkUrl || '', order: String(item.order ?? 0) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_SLIDE);
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const body = { ...form, order: Number(form.order) || 0 };
    try {
      if (editingId) {
        await api.put(`/api/admin/slides/${editingId}`, body, { headers: authHeader });
      } else {
        await api.post('/api/admin/slides', body, { headers: authHeader });
      }
      cancelEdit();
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/api/admin/slides/${id}`, { headers: authHeader });
    setConfirmDeleteId(null);
    load();
  };

  return (
    <>
      <Card icon="🖼️" title={editingId ? 'Edit slide' : 'Add a hero slide'}>
        <Field label="Image" hint="Optional — without one, the slide falls back to a solid brand color">
          {form.image ? (
            <AnimatedPressable scaleTo={1.06} style={{ width: 160, height: 90, borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
              <Image source={{ uri: form.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </AnimatedPressable>
          ) : null}
          <AnimatedPressable scaleTo={1.04} style={[formStyles.button, { backgroundColor: colors.subtleBackground }]} onPress={pickImage}>
            <Text style={[formStyles.buttonText, { color: colors.textPrimary }]}>{form.image ? 'Change image' : 'Choose image'}</Text>
          </AnimatedPressable>
        </Field>
        <Field label="Headline" hint="Select text, then tap a toolbar button to format">
          <RichTextEditor key={`headline-${editingId || 'new'}`} value={form.headline} onChange={(v) => onChange('headline', v)} colors={colors} height={70} />
        </Field>
        <Field label="Subtext" hint="Select text, then tap a toolbar button to format">
          <RichTextEditor key={`subtext-${editingId || 'new'}`} value={form.subtext} onChange={(v) => onChange('subtext', v)} colors={colors} height={70} />
        </Field>
        <Field label="Link URL" hint="Optional — tapping the slide opens this link when set">
          <TextInput
            style={formStyles.input}
            value={form.linkUrl}
            onChangeText={(v) => onChange('linkUrl', v)}
            placeholder="https://…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />
        </Field>
        <Field label="Order" hint="Lower numbers show first">
          <TextInput
            style={formStyles.input}
            value={form.order}
            onChangeText={(v) => onChange('order', v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
          />
        </Field>
        {error ? <Text style={formStyles.fieldError}>{error}</Text> : null}
        <View style={{ flexDirection: 'row' }}>
          <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { flex: 1 }, saving && formStyles.buttonDisabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{editingId ? 'Save changes' : 'Add slide'}</Text>}
          </AnimatedPressable>
          {editingId ? (
            <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { flex: 1, marginLeft: 8, backgroundColor: '#eee' }]} onPress={cancelEdit}>
              <Text style={[formStyles.buttonText, { color: formStyles.subtitle.color }]}>Cancel</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </Card>

      <Card icon="🎞️" title={`Slides (${slides.length})`}>
        {slides.length === 0 ? (
          <Text style={formStyles.bodyText}>No slides yet.</Text>
        ) : slides.map((item) => (
          <View key={item._id} style={rowStyle(colors)}>
            {item.image ? (
              <AnimatedPressable scaleTo={1.06} style={{ width: 56, height: 40, borderRadius: 6, marginRight: 12, overflow: 'hidden' }}>
                <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </AnimatedPressable>
            ) : (
              <View style={{ width: 56, height: 40, borderRadius: 6, marginRight: 12, backgroundColor: colors.primary }} />
            )}
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {item.headline ? renderRichText(item.headline, { color: colors.textPrimary, fontWeight: '700' }) : '(no headline)'}
              </Text>
              {item.subtext ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {renderRichText(item.subtext, { color: colors.textSecondary, fontSize: 12 })}
                </Text>
              ) : null}
              {item.linkUrl ? <Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>🔗 {item.linkUrl}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AnimatedPressable scaleTo={1.12} onPress={() => startEdit(item)} style={{ marginBottom: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Edit</Text>
              </AnimatedPressable>
              {confirmDeleteId === item._id ? (
                <DeleteConfirm onConfirm={() => remove(item._id)} onCancel={() => setConfirmDeleteId(null)} />
              ) : (
                <AnimatedPressable scaleTo={1.12} onPress={() => setConfirmDeleteId(item._id)}>
                  <Text style={{ color: colors.error, fontWeight: '600' }}>Remove</Text>
                </AnimatedPressable>
              )}
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

const APPLICATION_TYPE_OPTIONS = ['General', 'Freelancer', 'Dispatcher', 'Helper', 'OperationSupport'];
const EMPTY_VACANCY = { title: '', department: '', employmentType: 'Full-time', description: '', requirements: '', responsibilities: '', applicationType: 'General', isOpen: true, closingDate: '', order: '0' };

function VacanciesTab({ formStyles, colors, authHeader }) {
  const [vacancies, setVacancies] = useState([]);
  const [form, setForm] = useState(EMPTY_VACANCY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/api/admin/vacancies', { headers: authHeader }).then((res) => setVacancies(res.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const onChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title, department: item.department || '', employmentType: item.employmentType || 'Full-time',
      description: item.description || '', requirements: item.requirements || '', responsibilities: item.responsibilities || '',
      applicationType: item.applicationType || 'General',
      isOpen: item.isOpen !== false, closingDate: item.closingDate || '', order: String(item.order ?? 0),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_VACANCY);
    setError('');
  };

  const save = async () => {
    if (!form.title.trim()) { setError('A title is required.'); return; }
    setSaving(true);
    setError('');
    const body = { ...form, order: Number(form.order) || 0 };
    try {
      if (editingId) {
        await api.put(`/api/admin/vacancies/${editingId}`, body, { headers: authHeader });
      } else {
        await api.post('/api/admin/vacancies', body, { headers: authHeader });
      }
      cancelEdit();
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/api/admin/vacancies/${id}`, { headers: authHeader });
    setConfirmDeleteId(null);
    load();
  };

  return (
    <>
      <Card icon="💼" title={editingId ? 'Edit vacancy' : 'Add a vacancy'}>
        <Field label="Title" required>
          <TextInput style={formStyles.input} value={form.title} onChangeText={(v) => onChange('title', v)} placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Department" hint="Optional, e.g. 'Logistics'">
          <TextInput style={formStyles.input} value={form.department} onChangeText={(v) => onChange('department', v)} placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Employment Type" hint="e.g. 'Full-time', 'Part-time'">
          <TextInput style={formStyles.input} value={form.employmentType} onChangeText={(v) => onChange('employmentType', v)} placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Description" hint="Optional short summary shown on the careers page">
          <TextInput style={[formStyles.input, { height: 90, paddingTop: 10 }]} multiline value={form.description} onChangeText={(v) => onChange('description', v)} placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Requirements" hint="Optional — shown in the detail popup, below the description">
          <TextInput style={[formStyles.input, { height: 90, paddingTop: 10 }]} multiline value={form.requirements} onChangeText={(v) => onChange('requirements', v)} placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Responsibilities" hint="Optional — shown in the detail popup, below Requirements">
          <TextInput style={[formStyles.input, { height: 90, paddingTop: 10 }]} multiline value={form.responsibilities} onChangeText={(v) => onChange('responsibilities', v)} placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Application question set" hint="Determines which extra questions and uploads applicants are shown">
          <View style={formStyles.pickerContainer}>
            <Picker style={formStyles.pickerControl} selectedValue={form.applicationType} onValueChange={(v) => onChange('applicationType', v)}>
              {APPLICATION_TYPE_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
            </Picker>
          </View>
        </Field>
        <Field label="Status">
          <View style={{ flexDirection: 'row' }}>
            <AnimatedPressable scaleTo={1.04} style={[formStyles.toggleBtn, form.isOpen && formStyles.toggleBtnActive]} onPress={() => onChange('isOpen', true)}>
              <Text style={form.isOpen ? formStyles.toggleTextActive : formStyles.toggleText}>Open</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleTo={1.04} style={[formStyles.toggleBtn, !form.isOpen && formStyles.toggleBtnActive]} onPress={() => onChange('isOpen', false)}>
              <Text style={!form.isOpen ? formStyles.toggleTextActive : formStyles.toggleText}>Closed</Text>
            </AnimatedPressable>
          </View>
        </Field>
        <Field label="Closing Date" hint="Optional — the vacancy automatically stops showing on the careers page at 5:00 PM Brunei time on this date">
          <IsoDateField value={form.closingDate} onChange={(v) => onChange('closingDate', v)} formStyles={formStyles} />
          {form.closingDate ? (
            <AnimatedPressable scaleTo={1.12} onPress={() => onChange('closingDate', '')} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.error, fontWeight: '600', fontSize: 12 }}>Clear closing date</Text>
            </AnimatedPressable>
          ) : null}
        </Field>
        <Field label="Order" hint="Lower numbers show first">
          <TextInput style={formStyles.input} value={form.order} onChangeText={(v) => onChange('order', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
        </Field>
        {error ? <Text style={formStyles.fieldError}>{error}</Text> : null}
        <View style={{ flexDirection: 'row' }}>
          <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { flex: 1 }, saving && formStyles.buttonDisabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{editingId ? 'Save changes' : 'Add vacancy'}</Text>}
          </AnimatedPressable>
          {editingId ? (
            <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { flex: 1, marginLeft: 8, backgroundColor: '#eee' }]} onPress={cancelEdit}>
              <Text style={[formStyles.buttonText, { color: formStyles.subtitle.color }]}>Cancel</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </Card>

      <Card icon="🗂️" title={`Vacancies (${vacancies.length})`}>
        {vacancies.length === 0 ? (
          <Text style={formStyles.bodyText}>No vacancies yet.</Text>
        ) : vacancies.map((item) => (
          <View key={item._id} style={rowStyle(colors)}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{item.title}{item.isOpen === false ? ' (Closed)' : ''}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{[item.department, item.employmentType, item.applicationType].filter(Boolean).join(' · ')}</Text>
              {item.closingDate ? <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Closes {formatIsoDateDMY(item.closingDate)}, 5:00 PM</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AnimatedPressable scaleTo={1.12} onPress={() => startEdit(item)} style={{ marginBottom: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Edit</Text>
              </AnimatedPressable>
              {confirmDeleteId === item._id ? (
                <DeleteConfirm onConfirm={() => remove(item._id)} onCancel={() => setConfirmDeleteId(null)} />
              ) : (
                <AnimatedPressable scaleTo={1.12} onPress={() => setConfirmDeleteId(item._id)}>
                  <Text style={{ color: colors.error, fontWeight: '600' }}>Remove</Text>
                </AnimatedPressable>
              )}
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

const PRODUCT_LABELS = {
  pharmacymoh: 'MOH',
  pharmacyjpmc: 'JPMC',
  pharmacyphc: 'PHC',
  localdelivery: 'Local Delivery',
  cbsl: 'Cross Border Service Limbang',
};
const PRODUCT_ORDER = ['pharmacymoh', 'pharmacyjpmc', 'pharmacyphc', 'localdelivery', 'cbsl'];
const DISTRICT_ORDER = ['Brunei', 'Tutong', 'Belait', 'Temburong'];

function PricingRow({ rule, formStyles, colors, authHeader, onSaved }) {
  const [price, setPrice] = useState(String(rule.price));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const dirty = price !== String(rule.price);

  const save = async () => {
    const numeric = Number(price);
    if (price === '' || !Number.isFinite(numeric) || numeric < 0) {
      setError('Enter a valid price.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/admin/pricing/${rule._id}`, { price: numeric, note: rule.note }, { headers: authHeader });
      onSaved(rule._id, numeric);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={rowStyle(colors)}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{rule.chargeCode}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
          {rule.district}{rule.note ? ` · ${rule.note}` : ''}
        </Text>
        {error ? <Text style={formStyles.fieldError}>{error}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={[formStyles.input, { width: 80, marginRight: 8, marginBottom: 0 }]}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <AnimatedPressable
          scaleTo={1.03}
          style={[formStyles.button, { paddingHorizontal: 14 }, (!dirty || saving) && formStyles.buttonDisabled]}
          onPress={save}
          disabled={!dirty || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{saved ? 'Saved' : 'Save'}</Text>}
        </AnimatedPressable>
      </View>
    </View>
  );
}

function PricingTab({ formStyles, colors, authHeader }) {
  const [rules, setRules] = useState([]);

  const load = useCallback(() => {
    api.get('/api/pricing').then((res) => setRules(res.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSaved = (id, price) => {
    setRules((prev) => prev.map((r) => (r._id === id ? { ...r, price } : r)));
  };

  const groups = PRODUCT_ORDER
    .map((product) => ({
      product,
      rows: rules
        .filter((r) => r.product === product)
        .sort((a, b) => (
          CHARGE_CODE_ORDER.indexOf(a.chargeCode) - CHARGE_CODE_ORDER.indexOf(b.chargeCode)
          || DISTRICT_ORDER.indexOf(a.district) - DISTRICT_ORDER.indexOf(b.district)
        )),
    }))
    .filter((g) => g.rows.length > 0);

  return (
    <>
      {groups.map((g) => (
        <Card key={g.product} icon="💰" title={PRODUCT_LABELS[g.product] || g.product}>
          {g.rows.map((rule) => (
            <PricingRow key={rule._id} rule={rule} formStyles={formStyles} colors={colors} authHeader={authHeader} onSaved={handleSaved} />
          ))}
        </Card>
      ))}
    </>
  );
}

export default function Admin() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const formStyles = useFormStyles();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const authHeader = { Authorization: `Bearer ${token}` };

  const tabStyles = {
    tabRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20, gap: 8 },
    tab: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.subtleBackground, borderWidth: 1, borderColor: colors.border },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    tabTextActive: { fontSize: 13, fontWeight: '700', color: '#fff' },
  };

  return (
    <PageScroll title="Admin">
      <Text style={formStyles.title}>Admin</Text>
      <Text style={formStyles.subtitle}>Manage public holidays, announcements, hero slides, career vacancies, and delivery pricing.</Text>

      <View style={tabStyles.tabRow}>
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <AnimatedPressable scaleTo={1.04} key={tab} style={[tabStyles.tab, isActive && tabStyles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={isActive ? tabStyles.tabTextActive : tabStyles.tabText}>{tab}</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {activeTab === 'Holidays' && <HolidaysTab formStyles={formStyles} colors={colors} authHeader={authHeader} />}
      {activeTab === 'Announcements' && <AnnouncementsTab formStyles={formStyles} colors={colors} authHeader={authHeader} />}
      {activeTab === 'Slides' && <SlidesTab formStyles={formStyles} colors={colors} authHeader={authHeader} />}
      {activeTab === 'Vacancies' && <VacanciesTab formStyles={formStyles} colors={colors} authHeader={authHeader} />}
      {activeTab === 'Pricing' && <PricingTab formStyles={formStyles} colors={colors} authHeader={authHeader} />}
    </PageScroll>
  );
}
