import json, re
from collections import defaultdict
from pathlib import Path

STOPWORDS = {"o","a","os","as","um","uma","de","do","da","em","no","na","e","que","se","para","por","com","não","mas","ou","pois","como"}
LEMMA_DICT = {"é":"ser","são":"ser","foi":"ser","tem":"ter","têm":"ter","houve":"haver","há":"haver","pode":"poder","vai":"ir","veio":"vir","disse":"dizer","fez":"fazer","deu":"dar","quis":"querer","viu":"ver","criou":"criar","criação":"criar","falou":"falar","andou":"andar","céu":"céu","céus":"céu","terra":"terra","senhor":"senhor","deus":"deus","espírito":"espírito","fé":"fé","amor":"amor","vida":"vida","morte":"morte","homem":"homem","filho":"filho","pai":"pai","mãe":"mãe","casa":"casa","igreja":"igreja","reino":"reino","luz":"luz","verdade":"verdade"}

def get_lemma(w):
    w=w.lower()
    if w in LEMMA_DICT: return LEMMA_DICT[w]
    if w.endswith(("ando","endo","indo")): return w[:-4]+("ar" if w.endswith("ando") else "er" if w.endswith("endo") else "ir")
    if w.endswith(("ado","ida")): return w[:-3]+"ar"
    if w.endswith(("ido","ida")): return w[:-3]+"ir"
    if w.endswith("ões") or w.endswith("ães"): return w[:-3]+"ão"
    if w.endswith(("éis","ais","eis")): return w[:-3]+"al"
    if w.endswith("s") and len(w)>3: return w[:-1]
    return w

def build(input_file, output_dir, version="ACF"):
    print(f"📖 Lendo {input_file}...")
    with open(input_file, "r", encoding="utf-8") as f: verses = json.load(f)
    sample = verses[0]
    keys = {
        'book': next((k for k in ['book','livro','b'] if k in sample), 'book'),
        'chapter': next((k for k in ['chapter','capitulo','c'] if k in sample), 'chapter'),
        'verse': next((k for k in ['verse','versiculo','v'] if k in sample), 'verse'),
        'text': next((k for k in ['text','texto','t'] if k in sample), 'text')
    }
    print(f"🔗 Mapeamento: {keys}")
    index = defaultdict(lambda: {"refs": set(), "forms": set()})
    for v in verses:
        book_val = v[keys['book']]; chapter_val = v[keys['chapter']]; verse_val = v[keys['verse']]; text_val = v[keys['text']]
        ref = f"{book_val} {chapter_val}:{verse_val}"
        for w in re.findall(r"[a-zA-ZÀ-ÿ\-]+", text_val):
            if len(w)>2 and w.lower() not in STOPWORDS:
                lm = get_lemma(w); index[lm]["refs"].add(ref); index[lm]["forms"].add(w.lower())
    out = Path(output_dir); out.mkdir(parents=True, exist_ok=True)
    for letter in "abcdefghijklmnopqrstuvwxyz":
        subset = {word: {"refs": sorted(data["refs"]), "freq": len(data["refs"]), "forms": sorted(data["forms"])} for word, data in index.items() if word.startswith(letter)}
        if subset: (out / f"{letter}.json").write_text(json.dumps(subset, ensure_ascii=False, indent=2), encoding="utf-8")
    meta = {"version": version, "total_verses": len(verses), "unique_lemmas": len(index)}
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ Gerado | {meta['unique_lemmas']} lemas")

if __name__ == "__main__":
    build("bible_acf.json", "assets/data/concordance")
