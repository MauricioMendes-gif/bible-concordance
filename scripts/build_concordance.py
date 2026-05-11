import json, re
from collections import defaultdict
from pathlib import Path

ABBREV_TO_NAME = {
    "gn":"Gênesis","ex":"Êxodo","lv":"Levítico","nm":"Números","dt":"Deuteronômio",
    "js":"Josué","jz":"Juízes","rt":"Rute","1sm":"1 Samuel","2sm":"2 Samuel",
    "1rs":"1 Reis","2rs":"2 Reis","1cr":"1 Crônicas","2cr":"2 Crônicas","ed":"Esdras",
    "ne":"Neemias","et":"Ester","jó":"Jó","sl":"Salmos","pv":"Provérbios",
    "ec":"Eclesiastes","ct":"Cânticos","is":"Isaías","jr":"Jeremias","lm":"Lamentações",
    "ez":"Ezequiel","dn":"Daniel","os":"Oséias","jl":"Joel","am":"Amós",
    "ob":"Obadias","jn":"Jonas","mq":"Miquéias","na":"Naum","hc":"Habacuque",
    "sf":"Sofonias","ag":"Ageu","zc":"Zacarias","ml":"Malaquias",
    "mt":"Mateus","mc":"Marcos","lc":"Lucas","jo":"João","at":"Atos",
    "rm":"Romanos","1co":"1 Coríntios","2co":"2 Coríntios","gl":"Gálatas",
    "ef":"Efésios","fp":"Filipenses","cl":"Colossenses","1ts":"1 Tessalonicenses",
    "2ts":"2 Tessalonicenses","1tm":"1 Timóteo","2tm":"2 Timóteo","tt":"Tito",
    "fm":"Filemom","hb":"Hebreus","tg":"Tiago","1pe":"1 Pedro","2pe":"2 Pedro",
    "1jo":"1 João","2jo":"2 João","3jo":"3 João","jd":"Judas","ap":"Apocalipse"
}

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
    with open(input_file, "r", encoding="utf-8-sig") as f:
        books = json.load(f)

    index = defaultdict(lambda: {"refs": set(), "forms": set()})
    verses_map = {}
    total_verses = 0

    for book in books:
        abbrev = book.get("abbrev", "").lower()
        book_name = ABBREV_TO_NAME.get(abbrev, abbrev.upper())
        chapters = book.get("chapters", [])
        
        for chap_idx, chapter in enumerate(chapters, start=1):
            if not isinstance(chapter, list): continue
            for verse_idx, text in enumerate(chapter, start=1):
                if not isinstance(text, str) or not text.strip(): continue
                total_verses += 1
                ref = f"{book_name} {chap_idx}:{verse_idx}"
                verses_map[ref] = text.strip()
                
                words = re.findall(r"[\wÀ-ÿ]+", text)
                for w in words:
                    w_clean = w.lower().strip()
                    if len(w_clean) < 3 or w_clean in STOPWORDS: continue
                    lm = get_lemma(w_clean)
                    index[lm]["refs"].add(ref)
                    index[lm]["forms"].add(w_clean)
        
        print(f"  📚 {book_name}: {sum(len(c) for c in chapters if isinstance(c, list))} versículos")

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    for letter in "abcdefghijklmnopqrstuvwxyz":
        subset = {word: {"refs": sorted(data["refs"]), "freq": len(data["refs"]), "forms": sorted(data["forms"])} for word, data in index.items() if word.startswith(letter)}
        if subset:
            (out / f"{letter}.json").write_text(json.dumps(subset, ensure_ascii=False, indent=2), encoding="utf-8")

    # Salva mapa de versículos para preview offline
    (out / "verses.json").write_text(json.dumps(verses_map, ensure_ascii=False, indent=2), encoding="utf-8")
    
    meta = {"version": version, "total_books": len(books), "total_verses": total_verses, "unique_lemmas": len(index)}
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ Gerado em {output_dir}")
    print(f"📊 {meta['unique_lemmas']} lemas | {total_verses} versículos | verses.json pronto")

if __name__ == "__main__":
    build("bible_acf.json", "assets/data/concordance")
