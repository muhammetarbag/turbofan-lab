"""Vinext statik çıktısını GitHub Pages proje köküne hazırlar ve doğrular."""
from html.parser import HTMLParser
from pathlib import Path
import shutil


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.paths: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        src = values.get('src')
        href = values.get('href')
        if tag == 'script' and src:
            self.paths.append(src)
        if tag == 'link' and href and values.get('rel') in ('stylesheet', 'modulepreload'):
            self.paths.append(href)


def main() -> None:
    output = Path(__file__).resolve().parent.parent / 'dist' / 'client'
    prefix = '/turbofan-lab/'
    index = output / 'index.html'
    if not index.is_file():
        raise RuntimeError('Statik index.html eksik; önce GITHUB_PAGES=true npm run build çalıştırın.')
    # Vinext assetPrefix'i diskte de üretir. Pages URL'deki depo adını zaten
    # köke eşlediğinden, _next dosyaları çıktı kökünde de bulunmalıdır.
    nested = output / 'turbofan-lab' / '_next'
    if nested.is_dir():
        shutil.copytree(nested, output / '_next', dirs_exist_ok=True)
    parser = AssetParser()
    parser.feed(index.read_text())
    if not parser.paths:
        raise RuntimeError('JavaScript veya CSS referansı bulunamadı.')
    for url in parser.paths:
        if not url.startswith(prefix):
            raise RuntimeError(f'GitHub Pages yol öneki eksik: {url}')
        if not (output / url.removeprefix(prefix)).is_file():
            raise RuntimeError(f'Başvurulan dosya eksik: {url}')
    (output / '.nojekyll').touch()
    print(f'GitHub Pages hazır: index.html ve {len(parser.paths)} CSS/JavaScript referansı doğrulandı.')


if __name__ == '__main__':
    main()
