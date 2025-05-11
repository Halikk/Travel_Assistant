# backend/core/utils/nlp_pipeline.py

import spacy
from transformers import pipeline

# 1) İngilizce spaCy modeli (keyword extraction için)
nlp_spacy_en = spacy.load("en_core_web_sm")

# 2) Türkçe→İngilizce çeviri pipeline’ı
#    (Helsinki-NLP/opus-mt-tr-en modeli)
translator = pipeline(
    "translation",
    model="Helsinki-NLP/opus-mt-tr-en",
    device=-1
)

# 3) Zero-shot sınıflandırıcı (İngilizce metinle çalışacak)
classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli",
    device=-1
)

# İngilizce kategoriler
CATEGORIES = [
    "museum", "restaurant", "historical site", "nature park",
    "shopping", "nightlife", "adventure", "gastronomy",
    "family", "relaxation"
]

def translate_to_english(text: str) -> str:
    """
    Gelen Türkçe metni İngilizce'ye çevirir.
    """
    # Uzun metinleri bölüp çevirmen gerekebilir; basit örnek:
    result = translator(text, max_length=512)
    return result[0]["translation_text"]

def extract_keywords(text_en: str, top_k: int = 5) -> list[str]:
    """
    İngilizce spaCy ile metinden en sık geçen isim ve özel isim lehimlerini döndürür.
    """
    doc = nlp_spacy_en(text_en.lower())
    candidates = [
        token.lemma_ for token in doc
        if token.pos_ in ("NOUN", "PROPN") and not token.is_stop and len(token.lemma_) > 2
    ]
    freq = {}
    for w in candidates:
        freq[w] = freq.get(w, 0) + 1
    # En sık geçen top_k kelime
    return sorted(freq, key=lambda k: freq[k], reverse=True)[:top_k]

def classify_preferences(text_en: str) -> dict[str, float]:
    """
    İngilizce metni CATEGORIES içine atar ve olasılıkları döner.
    """
    result = classifier(text_en, CATEGORIES)
    return dict(zip(result["labels"], result["scores"]))

def analyze_user_preferences(text_tr: str) -> dict:
    """
    Adım 1: Türkçeyi İngilizceye çevir.
    Adım 2: İngilizce keyword çıkar.
    Adım 3: İngilizce zero-shot sınıflandırma.
    """
    # 1) Çeviri
    text_en = translate_to_english(text_tr)
    # 2) Keyword extraction
    kws     = extract_keywords(text_en, top_k=8)
    # 3) Zero-shot classification
    scores  = classify_preferences(text_en)
    # 0.1 üzeri skorları alın
    prefs   = {cat: s for cat, s in scores.items() if s > 0.1}

    return {
        "translated_text": text_en,
        "keywords":        kws,
        "categories":      prefs
    }
