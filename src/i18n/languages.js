// The 33 app languages: the top 30 most spoken, plus Afrikaans, isiZulu and isiXhosa.
// code      saved in users.preferred_language (must match api/ai/appKnowledge.js)
// native    the language's name in itself, shown in the language list
// rtl       right to left (Arabic, Urdu, Egyptian Arabic)
// fallback  the language to try before English when a word is missing
// htmlLang  the tag written to <html lang> when it differs from the code
// The text is AI-translated: have a native speaker review the main screens before launch.
export const LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'zh', native: '简体中文', htmlLang: 'zh-Hans' },
  { code: 'hi', native: 'हिन्दी' },
  { code: 'es', native: 'Español' },
  { code: 'ar', native: 'العربية', rtl: true },
  { code: 'fr', native: 'Français' },
  { code: 'bn', native: 'বাংলা' },
  { code: 'pt', native: 'Português' },
  { code: 'ru', native: 'Русский' },
  { code: 'ur', native: 'اردو', rtl: true },
  { code: 'id', native: 'Bahasa Indonesia' },
  { code: 'de', native: 'Deutsch' },
  { code: 'ja', native: '日本語' },
  { code: 'pcm', native: 'Naijá' },
  { code: 'mr', native: 'मराठी' },
  { code: 'te', native: 'తెలుగు' },
  { code: 'tr', native: 'Türkçe' },
  { code: 'ta', native: 'தமிழ்' },
  { code: 'yue', native: '粵語', htmlLang: 'yue-Hant', fallback: 'zh' },
  { code: 'vi', native: 'Tiếng Việt' },
  { code: 'wuu', native: '吴语', htmlLang: 'wuu-Hans', fallback: 'zh' },   // no standard written form: uses Simplified Chinese
  { code: 'fil', native: 'Filipino' },
  { code: 'ko', native: '한국어' },
  { code: 'arz', native: 'مصرى', rtl: true, fallback: 'ar' },              // uses Modern Standard Arabic
  { code: 'ha', native: 'Hausa' },
  { code: 'sw', native: 'Kiswahili' },
  { code: 'jv', native: 'Basa Jawa' },
  { code: 'it', native: 'Italiano' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', htmlLang: 'pa-Guru' },                    // Gurmukhi script, left to right
  { code: 'gu', native: 'ગુજરાતી' },
  { code: 'af', native: 'Afrikaans' },
  { code: 'zu', native: 'isiZulu' },
  { code: 'xh', native: 'isiXhosa' },
]

export const DEFAULT_LANGUAGE = 'en'
export const LANGUAGE_CODES = LANGUAGES.map(l => l.code)

export const isSupportedLanguage = (code) => LANGUAGE_CODES.includes(code)

export function getLanguage(code) {
  const l = LANGUAGES.find(x => x.code === code) || LANGUAGES[0]
  return { fallback: DEFAULT_LANGUAGE, htmlLang: l.code, rtl: false, ...l }
}
