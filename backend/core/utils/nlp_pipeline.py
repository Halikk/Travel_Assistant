# backend/core/utils/nlp_pipeline.py

import spacy
from transformers import pipeline

# 1) spaCy modelini yükle
#    (Türkçe için tr_core_news_sm, İngilizce için en_core_web_sm)
nlp_spacy = spacy.load("en_core_web_sm")

# 2) Hugging Face zero-shot sınıflandırıcı (isteğe bağlı)
#    Kullanıcının metni belirli kategorilere atamak için kullanacağız.
classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli",
    device=0  # GPU yoksa -1
)

# Öneri kategorileri (örn. müze, restoran, tarihi yer…)
CATEGORIES = [
    "museum", "restaurant", "historical site", "nature park",
    "shopping", "nightlife", "adventure", "gastronomy",
    "family", "relaxation"
]

def extract_keywords(text: str, top_k: int = 5) -> list[str]:
    """
    spaCy ile metinden en sık geçen önemli kelimeleri döndürür.
    """
    doc = nlp_spacy(text.lower())
    # isim ve özel isimleri seç, stop-word filtresi zaten spaCy’de var
    candidates = [token.lemma_ for token in doc
                  if token.pos_ in ("NOUN", "PROPN") and not token.is_stop]
    # frekansa göre sırala
    freq = {}
    for kw in candidates:
        freq[kw] = freq.get(kw, 0) + 1
    # en yüksek freq’e sahip kelimeler
    return sorted(freq, key=freq.get, reverse=True)[:top_k]

def classify_preferences(text: str) -> dict[str, float]:
    """
    Zero-shot sınıflandırıcı ile text’i CATEGORIES içine atar,
    kategori olasılıklarını döner.
    """
    result = classifier(text, CATEGORIES)
    # {'labels': [...], 'scores': [...]}
    return dict(zip(result["labels"], result["scores"]))

def analyze_user_preferences(text: str) -> dict:
    """
    Kullanıcı girdisini al, hem keyword çıkar hem de kategori olasılıklarını hesapla.
    """
    kws = extract_keywords(text, top_k=8)
    scores = classify_preferences(text)
    # Sadece % üstünde (örn. 0.1) skorları alabilirsiniz
    prefs = {cat: score for cat, score in scores.items() if score > 0.1}
    return {
        "keywords": kws,
        "categories": prefs
    }
