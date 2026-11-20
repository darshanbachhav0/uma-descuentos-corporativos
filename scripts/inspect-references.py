from pathlib import Path
import shutil
from pypdf import PdfReader

source = Path.home() / 'Downloads'
target = Path('reference')
target.mkdir(exist_ok=True)
names = ['FORMATO 1_FICHA DE EVALUACION SOCIOECONOMICA_2027-I.pdf', 'form 1.pdf', 'form 2.pdf', 'form 3.pdf']
output = []
for name in names:
    file = source / name
    if not file.exists():
        continue
    shutil.copy2(file, target / name)
    reader = PdfReader(str(file))
    output.append(f'FILE: {name} | pages: {len(reader.pages)}')
    for i, page in enumerate(reader.pages):
        output.append(f'PAGE {i+1}\n{page.extract_text() or "[No text layer]"}')
Path('tmp/pdfs').mkdir(parents=True, exist_ok=True)
Path('tmp/pdfs/reference-text.txt').write_text('\n\n'.join(output), encoding='utf-8')
print('\n\n'.join(output))
